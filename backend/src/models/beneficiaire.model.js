const { getSupabase } = require('../config/supabase');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    mode: row.mode,
    compte_identifiant: row.compte_identifiant,
    banque_code: row.banque_code,
    titulaire_compte: row.titulaire_compte,
    telephone: row.telephone,
    operateur_mobile: row.operateur_mobile,
    client_lie_id: row.client_lie_id,
    created_at: row.created_at,
  };
}

async function insert(row) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db.from('beneficiaires').insert(row).select('*').single();
  if (error) return { error: error.message };
  return { data: mapRow(data) };
}

async function findAll(limit) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db
    .from('beneficiaires')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { data: (data || []).map(mapRow) };
}

async function findById(id) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db.from('beneficiaires').select('*').eq('id', id).maybeSingle();
  if (error) return { error: error.message };
  return { data: mapRow(data) };
}

module.exports = {
  insert,
  findAll,
  findById,
};
