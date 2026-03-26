const { getSupabase } = require('../config/supabase');

/**
 * @param {Array<{ client_id: string, kind: string, payload: object }>} rows
 */
async function insertMany(rows) {
  const db = getSupabase();
  if (!db || !rows.length) {
    return { unavailable: !db, inserted: 0 };
  }
  const payload = rows.map((r) => ({
    client_id: r.client_id,
    kind: r.kind,
    lu: false,
    payload: r.payload,
  }));
  const { error } = await db.from('notifications_client').insert(payload);
  if (error) {
    return { error: error.message, inserted: 0 };
  }
  return { inserted: rows.length };
}

async function countUnread(clientId) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true, count: 0 };
  }
  const { count, error } = await db
    .from('notifications_client')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('lu', false);
  if (error) {
    return { error: error.message, count: 0 };
  }
  return { count: count ?? 0 };
}

async function listForClient(clientId, { limit = 50, offset = 0 } = {}) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true, rows: [] };
  }
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const { data, error } = await db
    .from('notifications_client')
    .select('id, kind, lu, payload, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);
  if (error) {
    return { error: error.message, rows: [] };
  }
  return { rows: data || [] };
}

async function markAllRead(clientId) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true };
  }
  const { error } = await db
    .from('notifications_client')
    .update({ lu: true })
    .eq('client_id', clientId)
    .eq('lu', false);
  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}

async function markOneRead(clientId, notificationId) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true };
  }
  const { data, error } = await db
    .from('notifications_client')
    .update({ lu: true })
    .eq('id', notificationId)
    .eq('client_id', clientId)
    .select('id')
    .maybeSingle();
  if (error) {
    return { error: error.message };
  }
  if (!data) {
    return { notFound: true };
  }
  return { ok: true };
}

module.exports = {
  insertMany,
  countUnread,
  listForClient,
  markAllRead,
  markOneRead,
};
