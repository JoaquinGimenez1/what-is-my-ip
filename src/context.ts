import { Payload, User } from './types';

export type Bindings = {
  ENVIRONMENT: 'production' | 'development';
  VISITS: AnalyticsEngineDataset;
  RATE_LIMITER: RateLimit;
  CF_VERSION_METADATA: WorkerVersionMetadata;
  JWKS?: KVNamespace;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
};

export type Variables = {
  payload: Payload;
  user: User | undefined;
};

export interface HonoContext {
  Bindings: Bindings;
  Variables: Variables;
}
