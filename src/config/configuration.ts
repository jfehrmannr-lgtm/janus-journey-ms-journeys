const requiredString = (
  config: Record<string, unknown>,
  key: string,
): string => {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const positiveInteger = (
  config: Record<string, unknown>,
  key: string,
  fallback?: number,
): number => {
  const rawValue = config[key] ?? fallback;
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid positive integer environment variable: ${key}`);
  }

  return value;
};

export const validateEnvironment = (
  config: Record<string, unknown>,
): Record<string, unknown> => ({
  ...config,
  MONGODB_DATABASE_NAME: requiredString(config, 'MONGODB_DATABASE_NAME'),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: positiveInteger(
    config,
    'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
    5000,
  ),
  MONGODB_URI: requiredString(config, 'MONGODB_URI'),
  PORT: positiveInteger(config, 'PORT', 4002),
});
