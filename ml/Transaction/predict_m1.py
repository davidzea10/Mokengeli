"""
Inférence M1 — JSON sur stdin (mêmes clés que l'entraînement, sans cible_fraude).

Artefacts attendus dans le même dossier que ce script :
  - log_reg.joblib
  - feature_columns.joblib  (ordre des colonnes — obligatoire pour coller au modèle)
  - scaler.joblib + columns_to_scale.joblib (si utilisés à l'entraînement)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Fallback si feature_columns.joblib est absent (ordre colonne.md)
M1_FEATURE_ORDER = [
    "montant",
    "heure",
    "jour_semaine",
    "latitude_debit",
    "longitude_debit",
    "latitude_credit",
    "longitude_credit",
    "duree_session_min",
    "nb_ecrans_session",
    "delai_otp_s",
    "nb_echecs_login_24h",
    "vitesse_frappe",
    "entropie_souris",
    "nombre_requetes_par_minute",
    "score_probabilite_automatisation",
    "tor_detecte",
    "vpn_detecte",
    "proxy_detecte",
    "score_anonimisation_reseau",
    "degre_client",
    "nb_voisins_frauduleux",
    "score_reseau",
    "signature_transaction_valide",
    "certificat_valide",
    "score_confiance_client_api",
    "signature_requete_valide",
    "integrite_payload_requete",
    "certificat_revoque",
    "score_reputation_ip",
    "ip_datacenter",
    "ip_pays_inhabituel",
    "ip_sur_liste_noire",
    "numero_asn",
    "vitesse_24h",
    "ratio_montant_median_30j",
    "beneficiaire_nouveau",
    "distance_km_habitude",
    "changement_appareil",
]


def _base_dir() -> Path:
    # Base fixe: dossier courant du script (ml/Transaction)
    return Path(__file__).resolve().parent


def _load_artifacts():
    import joblib  # noqa: PLC0415

    base = _base_dir()

    model_path = base / "log_reg.joblib"

    scaler = None
    feature_columns = None
    columns_to_scale = None

    fc_path = base / "feature_columns.joblib"
    cts_path = base / "columns_to_scale.joblib"
    sc_path = base / "scaler.joblib"

    if fc_path.is_file():
        feature_columns = joblib.load(fc_path)
    if cts_path.is_file():
        columns_to_scale = joblib.load(cts_path)
    if sc_path.is_file():
        scaler = joblib.load(sc_path)

    if not model_path.is_file():
        return None, None, None, None, None

    model = joblib.load(model_path)
    return model, scaler, feature_columns, columns_to_scale, model_path


def _build_x(feats: dict, feature_columns, scaler, columns_to_scale, model):
    import numpy as np  # noqa: PLC0415
    import pandas as pd  # noqa: PLC0415

    if feature_columns is not None:
        cols = [str(c) for c in list(feature_columns)]
        row = {c: float(feats.get(c, 0.0)) for c in cols}
        x = pd.DataFrame([row], columns=cols)

        # Si le .joblib est un Pipeline sklearn, le scaling est déjà dedans — ne pas rescaler.
        try:
            from sklearn.pipeline import Pipeline  # noqa: PLC0415

            if isinstance(model, Pipeline):
                return x
        except ImportError:
            pass

        if scaler is not None and columns_to_scale is not None:
            to_scale = list(columns_to_scale)
            if to_scale:
                cols_present = [c for c in to_scale if c in x.columns]
                if cols_present:
                    x[cols_present] = scaler.transform(x[cols_present])
        return x

    vec = [float(feats.get(k, 0.0)) for k in M1_FEATURE_ORDER]
    return np.array([vec], dtype=float)


def _manual_logreg_proba(model, x):
    import numpy as np  # noqa: PLC0415

    coef = getattr(model, "coef_", None)
    intercept = getattr(model, "intercept_", None)
    if coef is None or intercept is None:
        raise AttributeError("LogisticRegression sans coef_/intercept_")

    x_np = x.to_numpy(dtype=float) if hasattr(x, "to_numpy") else np.asarray(x, dtype=float)
    coef_np = np.asarray(coef, dtype=float)
    intercept_np = np.asarray(intercept, dtype=float)
    if coef_np.ndim == 1:
        coef_np = coef_np.reshape(1, -1)

    logits = x_np @ coef_np.T + intercept_np
    if logits.shape[1] == 1:
        p1 = 1.0 / (1.0 + np.exp(-logits[:, 0]))
        return float(p1[0])

    exp_logits = np.exp(logits - logits.max(axis=1, keepdims=True))
    probs = exp_logits / exp_logits.sum(axis=1, keepdims=True)
    classes = getattr(model, "classes_", None)
    idx_1 = None
    if classes is not None:
        cls = list(classes)
        if 1 in cls:
            idx_1 = cls.index(1)
        elif "1" in cls:
            idx_1 = cls.index("1")
    if idx_1 is None:
        idx_1 = probs.shape[1] - 1
    return float(probs[0, idx_1])


def _predict():
    raw = sys.stdin.read()
    if not raw.strip():
        return {"ok": False, "error": "stdin vide", "proba_fraude": None, "fallback": True}

    feats = json.loads(raw)
    feats.pop("cible_fraude", None)

    try:
        model, scaler, feature_columns, columns_to_scale, model_path = _load_artifacts()
        if model is None:
            return {
                "ok": False,
                "error": "Aucun modèle (log_reg.joblib) dans " + str(_base_dir()),
                "proba_fraude": None,
                "fallback": True,
                "model": None,
            }

        x = _build_x(feats, feature_columns, scaler, columns_to_scale, model)

        try:
            from sklearn.pipeline import Pipeline  # noqa: PLC0415

            is_pipeline = isinstance(model, Pipeline)
        except ImportError:
            is_pipeline = False
        used_external_scaler = (
            feature_columns is not None
            and scaler is not None
            and columns_to_scale is not None
            and not is_pipeline
        )

        manual_logreg_fallback = False
        if hasattr(model, "predict_proba"):
            try:
                proba_arr = model.predict_proba(x)
                if proba_arr.shape[1] >= 2:
                    proba = float(proba_arr[0, 1])
                else:
                    proba = float(proba_arr[0, 0])
            except Exception:
                # Compatibilité: certains joblib LR lèvent une erreur selon la version sklearn.
                proba = _manual_logreg_proba(model, x)
                manual_logreg_fallback = True
        else:
            proba = float(model.predict(x)[0])

        pred = 1 if proba >= 0.5 else 0
        return {
            "ok": True,
            "proba_fraude": proba,
            "prediction": pred,
            "label": "fraude" if pred == 1 else "non_fraude",
            "fallback": False,
            "model": str(model_path.name),
            "used_feature_columns": feature_columns is not None,
            "used_scaler": used_external_scaler,
            "model_is_pipeline": is_pipeline,
            "manual_logreg_fallback": manual_logreg_fallback,
        }
    except Exception as e:  # noqa: BLE001
        return {
            "ok": False,
            "error": str(e),
            "proba_fraude": None,
            "fallback": True,
            "model": None,
        }


if __name__ == "__main__":
    out = _predict()
    sys.stdout.write(json.dumps(out, ensure_ascii=False))
    sys.stdout.flush()
