import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config();

export interface AppConfig {
  env: string;
  port: number;
  corsOrigin: string | string[];
  apiPrefix: string;
  isProduction: boolean;
}

const env = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '4000', 10);
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const config: AppConfig = {
  env,
  port,
  corsOrigin,
  apiPrefix: '/api',
  isProduction: env === 'production'
};
