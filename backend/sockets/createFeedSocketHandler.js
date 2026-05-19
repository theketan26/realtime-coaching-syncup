async function handleGetFeed(socket, app) {
  socket.on('getFeed', async (...args) => {
    // Support both (callback) and (params, callback)
    let params = {};
    let callback = undefined;
    if (args.length === 1 && typeof args[0] === 'function') {
      callback = args[0];
    } else if (args.length >= 1) {
      params = args[0] || {};
      if (typeof args[1] === 'function') callback = args[1];
    }

    const page = parseInt(params.page, 10) || 1;
    const pageSize = parseInt(params.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    const db = app.locals.db;
    const redis = app.locals.redis;
    const cacheKey = `feed:all:page:${page}:size:${pageSize}`;
    const isAck = typeof callback === 'function';

    const sendResponse = (payload) => {
      if (isAck) {
        callback(payload);
      } else {
        socket.emit('feedResponse', payload);
      }
    };

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendResponse({ success: true, data: JSON.parse(cached) });
      }
    } catch (cacheErr) {
      console.warn('Socket redis cache read failed:', cacheErr.message);
    }

    db.query(
      'SELECT * FROM feed ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [pageSize, offset],
      async (err, result) => {
        if (err) {
          return sendResponse({ success: false, error: 'Database error', details: err.message });
        }

        try {
          await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 60 });
        } catch (cacheErr) {
          console.warn('Socket redis cache write failed:', cacheErr.message);
        }

        sendResponse({ success: true, data: result.rows });
      }
    );
  });
}

module.exports = handleGetFeed;
