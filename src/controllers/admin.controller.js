const { sendSuccess } = require('../utils/response');

async function listTransactions(req, res, next) {
  try {
    sendSuccess(res, {
      items: [],
      message: 'Stub — liste transactions analyste à brancher (models + pagination)',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTransactions,
};
