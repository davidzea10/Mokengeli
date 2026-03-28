# Directive Backend - M1 (Clean)

Modele backend pour M1 avec selection automatique du meilleur modele entre:
- Logistic Regression
- XGBoost

Le choix est fait avant sauvegarde selon `roc_auc` sur le jeu de test.

## Artefacts a charger

Dans `M1/Model/`:

- `best_model.joblib`
- `best_model_name.joblib`
- `scaler.joblib`
- `feature_columns.joblib`
- `columns_to_scale.joblib`

## Contrat d'entree

- Envoyer un JSON avec toutes les colonnes de `feature_columns.joblib`
- Ne pas envoyer `cible_fraude`

## Code backend minimal

```python
from pathlib import Path
import joblib
import pandas as pd

def load_artifacts():
    candidates = [
        Path("data-streaming/models/M1/Model"),
        Path("M1/Model"),
        Path("Model"),
    ]
    base = None
    for d in candidates:
        if (d / "best_model.joblib").exists():
            base = d
            break
    if base is None:
        raise FileNotFoundError("Artefacts M1 introuvables.")

    model = joblib.load(base / "best_model.joblib")
    model_name = joblib.load(base / "best_model_name.joblib")
    scaler = joblib.load(base / "scaler.joblib")
    feature_columns = joblib.load(base / "feature_columns.joblib")
    columns_to_scale = joblib.load(base / "columns_to_scale.joblib")
    return model, model_name, scaler, feature_columns, columns_to_scale

def predict(payload: dict):
    model, model_name, scaler, feature_columns, columns_to_scale = load_artifacts()

    missing = [c for c in feature_columns if c not in payload]
    extra = [c for c in payload if c not in feature_columns]
    if missing:
        raise ValueError(f"Colonnes manquantes: {missing}")
    if extra:
        raise ValueError(f"Colonnes non attendues: {extra}")

    x = pd.DataFrame([payload], columns=feature_columns)
    x[columns_to_scale] = scaler.transform(x[columns_to_scale])

    pred = int(model.predict(x)[0])
    proba = float(model.predict_proba(x)[:, 1][0])

    return {
        "model": model_name,
        "prediction": pred,
        "label": "fraude" if pred == 1 else "non_fraude",
        "proba_fraude": proba,
    }
```
