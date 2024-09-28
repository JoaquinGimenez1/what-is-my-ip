export type Bindings = {
  ENVIRONMENT: string;
  VISITS: AnalyticsEngineDataset;
  RATE_LIMITER: RateLimit;
  CF_VERSION_METADATA: WorkerVersionMetadata;
};

export type Variables = {
  ip: string;
};

export interface HonoContext {
  Bindings: Bindings;
  Variables: Variables;
}
