import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

export const redis = new Redis(process?.env?.REDIS_URL, {
  reconnectOnError: (err) => {
    console.error("Redis connection error:", err.message);
    return true;
  },
});
