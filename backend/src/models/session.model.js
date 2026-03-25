const { getSupabase } = require('../config/supabase');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    client_id: row.client_id,
    date_debut: row.date_debut,
    canal: row.canal,
    adresse_ip: row.adresse_ip,
  };
}

async function insert({ client_id, canal, adresse_ip }) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db
    .from('sessions')
    .insert({
      client_id,
      canal: canal ?? null,
      adresse_ip: adresse_ip ?? null,
    })
    .select('*')
    .single();
  if (error) return { error: error.message };
  return { data: mapRow(data) };
}

async function updateById(sessionId, { canal, adresse_ip }) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const patch = {};
  if (canal !== undefined) patch.canal = canal;
  if (adresse_ip !== undefined) patch.adresse_ip = adresse_ip;
  if (Object.keys(patch).length === 0) {
    return findById(sessionId);
  }
  const { data, error } = await db
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .select('*')
    .maybeSingle();
  if (error) return { error: error.message };
  return { data: mapRow(data) };
}

async function findById(id) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db.from('sessions').select('*').eq('id', id).maybeSingle();
  if (error) return { error: error.message };
  return { data: mapRow(data) };
}

module.exports = {
  insert,
  updateById,
  findById,
};
