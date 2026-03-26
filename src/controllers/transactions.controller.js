const transactionService = require('../services/transaction.service');
const { sendSuccess } = require('../utils/response');

async function evaluate(req, res, next) {
  try {
    const result = await transactionService.evaluateTransaction(req.body);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  evaluate,
};
