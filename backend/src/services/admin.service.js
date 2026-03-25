const transactionModel = require('../models/transaction.model');

function parseMotifsOnScores(row) {
  if (!row || !row.scores_evaluation) return row;
  const se = row.scores_evaluation;
  if (typeof se.texte_motifs === 'string' && se.texte_motifs.length > 0) {
    try {
      se.reason_codes = JSON.parse(se.texte_motifs);
    } catch {
      se.reason_codes = null;
    }
  }
  return row;
}

async function listTransactions(query) {
  const result = await transactionModel.listForAdmin({
    page: query.page,
    limit: query.limit,
    clientId: query.client_id,
    decision: query.decision,
    dateFrom: query.date_from,
    dateTo: query.date_to,
  });
  if (result.unavailable) return { unavailable: true };
  if (result.error) return { error: result.error };
  const total = result.total ?? 0;
  const limit = result.limit;
  return {
    items: result.data ?? [],
    total,
    page: result.page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

async function getTransactionById(id) {
  const result = await transactionModel.findByIdForAdmin(id);
  if (result.unavailable) return { unavailable: true };
  if (result.error) return { error: result.error };
  if (!result.data) return { notFound: true };
  return { data: parseMotifsOnScores(result.data) };
}

module.exports = {
  listTransactions,
  getTransactionById,
};
