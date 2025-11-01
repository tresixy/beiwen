import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_HTTP_REFERER: z.string().optional(),
  OPENAI_X_TITLE: z.string().optional(),
  AI_ENABLED: z.string().default('true'),
  IMAGE_PROVIDER: z.string().default('openai'),
  IMAGE_MODEL: z.string().default('dall-e-3'),
  IMAGE_API_KEY: z.string().optional(),
  IMAGE_ENABLED: z.string().default('false'),
});

const env = envSchema.parse(process.env);

export default {
  port: parseInt(env.PORT),
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  openaiApiKey: env.OPENAI_API_KEY,
  openaiModel: env.OPENAI_MODEL,
  openaiBaseUrl: env.OPENAI_BASE_URL,
  openaiHttpReferer: env.OPENAI_HTTP_REFERER,
  openaiXTitle: env.OPENAI_X_TITLE,
  aiEnabled: env.AI_ENABLED === 'true',
  imageProvider: env.IMAGE_PROVIDER,
  imageModel: env.IMAGE_MODEL,
  imageApiKey: env.IMAGE_API_KEY,
  imageEnabled: env.IMAGE_ENABLED === 'true',
};

