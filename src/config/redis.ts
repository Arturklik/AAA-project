import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 500, 5000);
  },
});

redis.on("error", (err) => {
  if (err.code !== "ECONNREFUSED") {
    console.error("Redis error:", err.message);
  }
});

export default redis;
