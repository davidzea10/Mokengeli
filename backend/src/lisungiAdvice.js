/**
 * Lisungi — assistant conseil (RAG léger sur l’historique client).
 * 1) Récupère transactions + scores + bénéficiaires (contexte)
 * 2) Analyse heuristique → remarques / conseils / recommandations
 * 3) Si OPENAI_API_KEY (ou LISUNGI_OPENAI_API_KEY) : enrichit via LLM
 */

function money(n, devise = 'FC') {
  if (!Number.isFinite(n)) return `— ${devise}`;
  return `${Math.round(n).toLocaleString('fr-FR')} ${devise}`;
}

function pct01(raw) {
  if (raw == null || !Number.isFinite(Number(raw))) return null;
  const n = Number(raw);
  return Math.round((n <= 1 ? n * 100 : n) * 10) / 10;
}

function hourBucket(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

/**
 * Construit le contexte RAG à partir des lignes Supabase.
 */
export function buildLisungiContext({ client, comptes, transactions }) {
  const soldes = (comptes || []).map((c) => ({
    numero: c.numero_compte,
    libelle: c.libelle,
    solde: c.solde_disponible != null ? Number(c.solde_disponible) : null,
  }));
  const soldeTotal = soldes.reduce((a, c) => a + (Number.isFinite(c.solde) ? c.solde : 0), 0);

  const txs = (transactions || []).map((t) => {
    const se = Array.isArray(t.scores_evaluation)
      ? t.scores_evaluation[0]
      : t.scores_evaluation;
    return {
      numero: t.numero_transaction,
      date: t.date_transaction,
      montant: Number(t.montant) || 0,
      devise: t.devise || 'FC',
      type: t.type_transaction,
      canal: t.canal,
      beneficiaire: t.reference_beneficiaire || '—',
      decision: se?.decision ?? null,
      score_combine: pct01(se?.score_combine),
      score_m1: pct01(se?.score_modele_transaction),
      score_m2: pct01(se?.score_modele_session),
      score_m3: pct01(se?.score_modele_comportement),
    };
  });

  const montants = txs.map((t) => t.montant).filter((m) => m > 0);
  const sum = montants.reduce((a, b) => a + b, 0);
  const avg = montants.length ? sum / montants.length : 0;
  const max = montants.length ? Math.max(...montants) : 0;

  const byBenef = new Map();
  for (const t of txs) {
    const k = String(t.beneficiaire || '—').trim() || '—';
    const cur = byBenef.get(k) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += t.montant;
    byBenef.set(k, cur);
  }
  const topMerchants = [...byBenef.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const byCanal = new Map();
  for (const t of txs) {
    const c = String(t.canal || '—');
    byCanal.set(c, (byCanal.get(c) || 0) + 1);
  }

  const hours = txs.map((t) => hourBucket(t.date)).filter((h) => h != null);
  const nightOps = hours.filter((h) => h < 6 || h >= 22).length;

  const decisions = { allow: 0, challenge: 0, block: 0, other: 0 };
  for (const t of txs) {
    const d = String(t.decision || '').toLowerCase();
    if (d === 'allow') decisions.allow += 1;
    else if (d === 'challenge') decisions.challenge += 1;
    else if (d === 'block' || d === 'deny') decisions.block += 1;
    else decisions.other += 1;
  }

  const riskScores = txs.map((t) => t.score_combine).filter((x) => x != null);
  const avgRisk = riskScores.length
    ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
    : null;

  return {
    client: {
      reference: client?.reference_client,
      nom: client?.nom_complet,
      ville: client?.ville,
      telephone: client?.telephone ? String(client.telephone).replace(/.(?=.{4})/g, '•') : null,
    },
    comptes: soldes,
    solde_total: soldeTotal,
    stats: {
      nb_transactions: txs.length,
      volume_total: sum,
      montant_moyen: avg,
      montant_max: max,
      ops_nuit: nightOps,
      avg_risk_pct: avgRisk != null ? Math.round(avgRisk * 10) / 10 : null,
      decisions,
      canaux: Object.fromEntries(byCanal),
    },
    top_marchands_beneficiaires: topMerchants,
    recent_transactions: txs.slice(0, 25),
  };
}

/**
 * Analyse locale (sans LLM) à partir du contexte RAG.
 */
export function analyzeContextHeuristic(ctx, question) {
  const remarques = [];
  const conseils = [];
  const recommandations = [];
  const s = ctx.stats;
  const q = String(question || '').toLowerCase();

  if (s.nb_transactions === 0) {
    remarques.push('Aucune transaction récente trouvée pour ce compte dans la base.');
    conseils.push('Effectuez quelques opérations pour que Lisungi puisse affiner ses conseils.');
    recommandations.push('Vérifiez que votre profil client est bien lié à vos comptes bancaires.');
  } else {
    remarques.push(
      `${s.nb_transactions} opération(s) analysée(s) pour un volume de ${money(s.volume_total)} (moyenne ${money(s.montant_moyen)}).`,
    );

    if (s.avg_risk_pct != null) {
      remarques.push(`Score de risque moyen observé : ${s.avg_risk_pct} %.`);
      if (s.avg_risk_pct >= 70) {
        conseils.push(
          'Votre profil de risque est élevé : évitez les virements inhabituels (nouveaux bénéficiaires, gros montants, horaires nocturnes).',
        );
        recommandations.push(
          'Fractionnez les gros paiements et confirmez les bénéficiaires habituels avant d’en ajouter de nouveaux.',
        );
      } else if (s.avg_risk_pct >= 40) {
        conseils.push(
          'Des opérations ont déclenché (ou pourraient déclencher) un OTP : préparez votre téléphone pour valider rapidement.',
        );
        recommandations.push(
          'Préférez les canaux et bénéficiaires déjà utilisés pour rester sous le seuil OTP (40 %).',
        );
      } else {
        conseils.push('Votre comportement transactionnel reste dans une zone de risque faible — continuez ainsi.');
      }
    }

    if (s.decisions.block > 0) {
      remarques.push(`${s.decisions.block} transaction(s) bloquée(s) par le moteur anti-fraude.`);
      recommandations.push(
        'Après un blocage, contactez le support et évitez de répéter le même schéma (montant + bénéficiaire + canal).',
      );
    }
    if (s.decisions.challenge > 0) {
      remarques.push(`${s.decisions.challenge} transaction(s) ont requis une confirmation OTP.`);
    }

    if (s.ops_nuit > 0) {
      remarques.push(`${s.ops_nuit} opération(s) entre 22 h et 6 h — plage souvent plus risquée.`);
      conseils.push('Limitez les virements nocturnes sauf nécessité ; ils attirent davantage la surveillance.');
    }

    if (s.montant_max > s.montant_moyen * 3 && s.montant_moyen > 0) {
      remarques.push(
        `Écart important entre montant max (${money(s.montant_max)}) et moyenne (${money(s.montant_moyen)}).`,
      );
      recommandations.push(
        'Annoncez les gros paiements en les préparant (bénéficiaire déjà connu, canal habituel, montant progressif).',
      );
    }

    const top = ctx.top_marchands_beneficiaires?.[0];
    if (top && top.name !== '—') {
      remarques.push(
        `Principal destinataire / marchand : « ${top.name} » (${top.count} ops, ${money(top.total)}).`,
      );
      conseils.push(
        'Diversifiez légèrement vos contreparties si un seul bénéficiaire concentre trop de volume — cela réduit le risque de dépendance et d’alerte.',
      );
    }

    if (ctx.solde_total < s.montant_moyen && s.montant_moyen > 0) {
      recommandations.push(
        `Solde actuel (${money(ctx.solde_total)}) inférieur à votre moyenne d’opération : anticipez les rechargements.`,
      );
    }

    const canaux = Object.entries(s.canaux || {});
    if (canaux.length === 1) {
      conseils.push(`Vous utilisez surtout le canal « ${canaux[0][0]} » — bon pour la stabilité de profil.`);
    } else if (canaux.length > 2) {
      remarques.push(`Plusieurs canaux détectés (${canaux.map(([c]) => c).join(', ')}) — surveillez les changements d’appareil.`);
    }
  }

  if (q.includes('marchand') || q.includes('benef') || q.includes('commerçant')) {
    const list = (ctx.top_marchands_beneficiaires || [])
      .slice(0, 5)
      .map((m) => `• ${m.name} — ${m.count} ops / ${money(m.total)}`)
      .join('\n');
    remarques.push(list ? `Focus marchands / bénéficiaires :\n${list}` : 'Pas assez de données marchands.');
  }

  if (q.includes('sécur') || q.includes('fraude') || q.includes('risque')) {
    recommandations.push(
      'Activez toujours l’OTP, ne partagez jamais vos codes, et vérifiez le destinataire avant chaque envoi.',
    );
  }

  const resume =
    s.nb_transactions === 0
      ? 'Lisungi n’a pas encore assez d’historique pour un diagnostic complet.'
      : `Lisungi a passé en revue ${s.nb_transactions} opérations de ${ctx.client?.nom || ctx.client?.reference || 'votre compte'} et propose des pistes concrètes ci-dessous.`;

  return {
    resume,
    remarques,
    conseils,
    recommandations,
    mode: 'heuristique_rag',
  };
}

function contextToPromptText(ctx) {
  return JSON.stringify(
    {
      client: ctx.client,
      solde_total: ctx.solde_total,
      stats: ctx.stats,
      top_marchands_beneficiaires: ctx.top_marchands_beneficiaires,
      recent_transactions: ctx.recent_transactions?.slice(0, 15),
    },
    null,
    2,
  );
}

/**
 * Enrichissement optionnel via OpenAI (si clé présente).
 */
export async function enrichWithLlm(ctx, question, heuristic) {
  const apiKey = process.env.LISUNGI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.LISUNGI_OPENAI_MODEL || 'gpt-4o-mini';
  const system = `Tu es Lisungi, assistant conseil bancaire Mokengeli (RDC).
Tu analyses le contexte RAG (historique transactions, bénéficiaires/marchands, scores de risque).
Réponds en français, clair et actionnable.
Retourne UNIQUEMENT un JSON valide :
{"resume":"...","remarques":["..."],"conseils":["..."],"recommandations":["..."]}`;

  const user = `Question client : ${question || 'Analyse mon comportement de paiement et donne des conseils.'}

Contexte RAG :
${contextToPromptText(ctx)}

Base heuristique déjà calculée (à enrichir, pas contredire sans raison) :
${JSON.stringify(heuristic)}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.warn('[lisungi] openai', res.status, t.slice(0, 200));
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      resume: parsed.resume || heuristic.resume,
      remarques: Array.isArray(parsed.remarques) ? parsed.remarques : heuristic.remarques,
      conseils: Array.isArray(parsed.conseils) ? parsed.conseils : heuristic.conseils,
      recommandations: Array.isArray(parsed.recommandations)
        ? parsed.recommandations
        : heuristic.recommandations,
      mode: 'llm_rag',
    };
  } catch (e) {
    console.warn('[lisungi] llm error', e?.message || e);
    return null;
  }
}

/**
 * Orchestration complète.
 */
export async function runLisungiAdvice({ client, comptes, transactions, question }) {
  const ctx = buildLisungiContext({ client, comptes, transactions });
  const heuristic = analyzeContextHeuristic(ctx, question);
  const llm = await enrichWithLlm(ctx, question, heuristic);
  const advice = llm || heuristic;
  return {
    advice,
    context_preview: {
      nb_transactions: ctx.stats.nb_transactions,
      solde_total: ctx.solde_total,
      top_marchands: ctx.top_marchands_beneficiaires?.slice(0, 5),
      avg_risk_pct: ctx.stats.avg_risk_pct,
      decisions: ctx.stats.decisions,
    },
  };
}
