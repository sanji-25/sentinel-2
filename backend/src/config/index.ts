import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

export type StorageDriver = 'supabase' | 'local' | 'memory';

export interface AppConfig {
  env: string;
  port: number;
  corsOrigin: string | string[];
  apiPrefix: string;
  isProduction: boolean;
  supabase: {
    url?: string;
    serviceRoleKey?: string;
    isConfigured: boolean;
  };
  storageDriver: StorageDriver;
}

const env = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '4000', 10);
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Check if credentials are valid non-placeholder values
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceRoleKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseServiceRoleKey.includes('your_supabase')
);

// Determine driver: explicit setting, or auto-detect based on config, or 'memory' in test mode
let storageDriver: StorageDriver = 'local';
if (process.env.STORAGE_DRIVER === 'supabase' || process.env.STORAGE_DRIVER === 'local' || process.env.STORAGE_DRIVER === 'memory') {
  storageDriver = process.env.STORAGE_DRIVER;
} else if (env === 'test') {
  storageDriver = 'memory';
} else if (isSupabaseConfigured) {
  storageDriver = 'supabase';
}

export const config: AppConfig = {
  env,
  port,
  corsOrigin,
  apiPrefix: '/api',
  isProduction: env === 'production',
  supabase: {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey,
    isConfigured: isSupabaseConfigured
  },
  storageDriver
};
