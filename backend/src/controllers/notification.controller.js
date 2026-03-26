const clientModel = require('../models/client.model');
const notificationModel = require('../models/notification.model');
const { sendSuccess, sendError } = require('../utils/response');

async function resolveClientId(referenceClient) {
  const r = await clientModel.findByReferenceWithComptes(String(referenceClient || '').trim());
  if (r.unavailable) {
    return { error: 'SUPABASE_NOT_CONFIGURED', statusCode: 503 };
  }
  if (r.error) {
    return { error: 'DATABASE_ERROR', statusCode: 500, message: r.error };
  }
  if (!r.data) {
    return { error: 'NOT_FOUND', statusCode: 404, message: 'Client introuvable' };
  }
  return { clientId: r.data.id };
}

async function getList(req, res, next) {
  try {
    const referenceClient = req.query.reference_client;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const resolved = await resolveClientId(referenceClient);
    if (resolved.error) {
      if (resolved.statusCode === 503) {
        const err = new Error('Base de données indisponible');
        err.statusCode = 503;
        throw err;
      }
      return sendError(
        res,
        resolved.message || 'Erreur',
        resolved.statusCode || 400,
        resolved.error
      );
    }
    const list = await notificationModel.listForClient(resolved.clientId, { limit, offset });
    if (list.unavailable) {
      const err = new Error('Base de données indisponible');
      err.statusCode = 503;
      throw err;
    }
    if (list.error) {
      return sendError(res, list.error, 500, 'DATABASE_ERROR');
    }
    return sendSuccess(res, { notifications: list.rows });
  } catch (e) {
    next(e);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const referenceClient = req.query.reference_client;
    const resolved = await resolveClientId(referenceClient);
    if (resolved.error) {
      if (resolved.statusCode === 503) {
        const err = new Error('Base de données indisponible');
        err.statusCode = 503;
        throw err;
      }
      return sendError(
        res,
        resolved.message || 'Erreur',
        resolved.statusCode || 400,
        resolved.error
      );
    }
    const c = await notificationModel.countUnread(resolved.clientId);
    if (c.unavailable) {
      const err = new Error('Base de données indisponible');
      err.statusCode = 503;
      throw err;
    }
    if (c.error) {
      return sendError(res, c.error, 500, 'DATABASE_ERROR');
    }
    return sendSuccess(res, { unread_count: c.count });
  } catch (e) {
    next(e);
  }
}

async function postReadAll(req, res, next) {
  try {
    const referenceClient = req.body?.reference_client;
    const resolved = await resolveClientId(referenceClient);
    if (resolved.error) {
      if (resolved.statusCode === 503) {
        const err = new Error('Base de données indisponible');
        err.statusCode = 503;
        throw err;
      }
      return sendError(
        res,
        resolved.message || 'Erreur',
        resolved.statusCode || 400,
        resolved.error
      );
    }
    const r = await notificationModel.markAllRead(resolved.clientId);
    if (r.unavailable) {
      const err = new Error('Base de données indisponible');
      err.statusCode = 503;
      throw err;
    }
    if (r.error) {
      return sendError(res, r.error, 500, 'DATABASE_ERROR');
    }
    return sendSuccess(res, { marked: true });
  } catch (e) {
    next(e);
  }
}

async function patchOneRead(req, res, next) {
  try {
    const referenceClient = req.body?.reference_client;
    const id = req.params.id;
    const resolved = await resolveClientId(referenceClient);
    if (resolved.error) {
      if (resolved.statusCode === 503) {
        const err = new Error('Base de données indisponible');
        err.statusCode = 503;
        throw err;
      }
      return sendError(
        res,
        resolved.message || 'Erreur',
        resolved.statusCode || 400,
        resolved.error
      );
    }
    const r = await notificationModel.markOneRead(resolved.clientId, id);
    if (r.unavailable) {
      const err = new Error('Base de données indisponible');
      err.statusCode = 503;
      throw err;
    }
    if (r.notFound) {
      return sendError(res, 'Notification introuvable', 404, 'NOT_FOUND');
    }
    if (r.error) {
      return sendError(res, r.error, 500, 'DATABASE_ERROR');
    }
    return sendSuccess(res, { marked: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getList,
  getUnreadCount,
  postReadAll,
  patchOneRead,
};
