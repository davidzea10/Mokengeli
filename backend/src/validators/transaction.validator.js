const { z } = require('zod');

/** Chaîne vide → undefined (variables Postman non remplies). */
function emptyToUndefined(v) {
  if (v === '' || v === undefined || v === null) return undefined;
  return v;
}

/**
 * Schéma POST /api/v1/transactions/evaluate — aligné sur transaction_event (Strategie).
 * .passthrough() autorise des champs supplémentaires pendant l'évolution du schéma.
 */
const metadataSchema = z
  .object({
    date_transaction: z.string().optional(),
    numero_transaction: z.string().optional(),
    id_client: z.string().optional(),
    montant: z.number().optional(),
    devise: z.string().optional(),
    heure: z.number().int().optional(),
    jour_semaine: z.number().int().optional(),
    type_transaction: z.string().optional(),
    canal: z.string().optional(),
  })
  .passthrough();

const transactionEventSchema = z
  .object({
    metadata: metadataSchema.optional(),
  })
  .passthrough();

const evaluateBodySchema = z
  .object({
    transaction_event: transactionEventSchema.optional(),
    session_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    beneficiaire_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    compte_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    latitude_debit: z.number().optional(),
    longitude_debit: z.number().optional(),
    latitude_credit: z.number().optional(),
    longitude_credit: z.number().optional(),
  })
  .passthrough();

module.exports = {
  evaluateBodySchema,
  metadataSchema,
  transactionEventSchema,
};
