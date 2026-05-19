var express = require('express');
var router = express.Router();

/* GET all feed messages */
router.get('/', async function(req, res, next) {
  const db = req.app.locals.db;
  const redis = req.app.locals.redis;
  const cacheKey = 'feed:all';

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (cacheErr) {
    console.warn('Redis cache read failed:', cacheErr.message);
  }

  db.query('SELECT * FROM feed ORDER BY created_at DESC', async (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 60 });
    } catch (cacheErr) {
      console.warn('Redis cache write failed:', cacheErr.message);
    }

    res.json(result.rows);
  });
});

/* POST a new feed message */
router.post('/', function(req, res, next) {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  const db = req.app.locals.db;
  const redis = req.app.locals.redis;
  const cacheKey = 'feed:all';
  
  db.query(
    'INSERT INTO feed (message) VALUES ($1) RETURNING *',
    [message],
    async (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      try {
        await redis.del(cacheKey);
      } catch (cacheErr) {
        console.warn('Redis cache invalidation failed:', cacheErr.message);
      }

      res.status(201).json(result.rows[0]);
    }
  );
});

module.exports = router;
