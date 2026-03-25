const express = require('express');

const beneficiaireController = require('../controllers/beneficiaire.controller');
const { validateBody, validateQuery } = require('../middlewares/validate.middleware');
const {
  createBeneficiaireSchema,
  listBeneficiairesQuerySchema,
} = require('../validators/beneficiaire.validator');

const router = express.Router();

/** Étape 4.3 — liste (pagination simple) */
router.get(
  '/',
  validateQuery(listBeneficiairesQuerySchema),
  beneficiaireController.list
);

/** Création banque ou mobile money */
router.post(
  '/',
  validateBody(createBeneficiaireSchema),
  beneficiaireController.create
);

/** Détail par UUID */
router.get('/:id', beneficiaireController.getById);

module.exports = router;
