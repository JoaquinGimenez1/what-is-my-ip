export type Bindings = {
  ENVIRONMENT: string;
  VISITS: AnalyticsEngineDataset;
  RATE_LIMITER: RateLimit;
};

export type Variables = {
  ip: string;
};

export interface HonoContext {
  Bindings: Bindings;
  Variables: Variables;
}
