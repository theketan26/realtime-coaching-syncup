async function handleGetFeed(socket, app) {
  socket.on('getFeed', async (callback) => {
    const db = app.locals.db;
    const redis = app.locals.redis;
    const cacheKey = 'feed:all';
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

    db.query('SELECT * FROM feed ORDER BY created_at DESC', async (err, result) => {
      if (err) {
        return sendResponse({ success: false, error: 'Database error', details: err.message });
      }

      try {
        await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 60 });
      } catch (cacheErr) {
        console.warn('Socket redis cache write failed:', cacheErr.message);
      }

      sendResponse({ success: true, data: result.rows });
    });
  });
}

module.exports = handleGetFeed;
