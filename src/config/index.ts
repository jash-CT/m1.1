import 'dotenv/config';

const required = (key: string): string => {
  const v = process.env[key];
  if (v == null || v === '') throw new Error(`Missing required env: ${key}`);
  return v;
};

const optional = (key: string, def: string): string =>
  process.env[key] ?? def;

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  apiKey: required('API_KEY'),
  allowedOrigins: (optional('ALLOWED_ORIGINS', 'http://localhost:3000')).split(',').map((s) => s.trim()).filter(Boolean),
  webhookSecret: optional('WEBHOOK_SECRET', ''),
} as const;

if (config.apiKey.length < 32) {
  throw new Error('API_KEY must be at least 32 characters');
}
