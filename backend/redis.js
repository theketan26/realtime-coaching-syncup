const redis = require('redis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL;
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('Redis client error:', err);
});

module.exports = client;
