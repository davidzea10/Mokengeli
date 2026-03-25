const { z } = require('zod');

const createBeneficiaireSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('compte_bancaire'),
    compte_identifiant: z.string().min(1),
    banque_code: z.string().optional(),
    titulaire_compte: z.string().optional(),
    /** Référence métier d’un client existant → résolu en client_lie_id */
    reference_client_lie: z.string().min(1).optional(),
  }),
  z.object({
    mode: z.literal('mobile_money'),
    telephone: z.string().min(1),
    operateur_mobile: z.string().optional(),
    reference_client_lie: z.string().min(1).optional(),
  }),
]);

const listBeneficiairesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

module.exports = {
  createBeneficiaireSchema,
  listBeneficiairesQuerySchema,
};
