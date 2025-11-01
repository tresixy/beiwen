import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AI_ENABLED: z.string().default('true'),
  IMAGE_PROVIDER: z.string().default('openai'),
  IMAGE_MODEL: z.string().default('dall-e-3'),
  IMAGE_API_KEY: z.string().optional(),
  IMAGE_ENABLED: z.string().default('false'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('google/gemini-2.5-flash-preview-09-2025'),
  OPENROUTER_HTTP_REFERER: z.string().optional(),
  OPENROUTER_X_TITLE: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_HTTP_REFERER: z.string().optional(),
  OPENAI_X_TITLE: z.string().optional(),
});

const env = envSchema.parse(process.env);

const resolvedAiKey = env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || null;
const resolvedAiModel = env.OPENROUTER_MODEL || env.OPENAI_MODEL || 'google/gemini-2.5-flash-preview-09-2025';
const resolvedAiBaseUrl = env.OPENROUTER_BASE_URL || env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
const resolvedAiHttpReferer = env.OPENROUTER_HTTP_REFERER || env.OPENAI_HTTP_REFERER;
const resolvedAiXTitle = env.OPENROUTER_X_TITLE || env.OPENAI_X_TITLE;

export default {
  port: parseInt(env.PORT),
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  aiApiKey: resolvedAiKey,
  aiModel: resolvedAiModel,
  aiBaseUrl: resolvedAiBaseUrl,
  aiHttpReferer: resolvedAiHttpReferer,
  aiXTitle: resolvedAiXTitle,
  openRouterApiKey: env.OPENROUTER_API_KEY || null,
  openRouterModel: env.OPENROUTER_MODEL,
  openRouterBaseUrl: env.OPENROUTER_BASE_URL,
  aiEnabled: env.AI_ENABLED === 'true',
  imageProvider: env.IMAGE_PROVIDER,
  imageModel: env.IMAGE_MODEL,
  imageApiKey: env.IMAGE_API_KEY,
  imageEnabled: env.IMAGE_ENABLED === 'true',
};

