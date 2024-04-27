import { Toucan } from 'toucan-js';

export interface Env {
  RATE_LIMITER: DurableObjectNamespace;
  SENTRY_DSN: string;
}

interface RateLimiterResponse {
  milliseconds_to_next_request: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Determine the IP address of the client

    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      context: ctx,
      request,
    });

    const ip = request.headers.get('CF-Connecting-IP');
    if (ip === null) {
      return new Response(JSON.stringify({ error: { message: 'Could not determine client IP', code: 400 } }, null, 2), { status: 400 });
    }

    // Obtain an identifier for a Durable Object based on the client's IP address
    const id = env.RATE_LIMITER.idFromName(ip);

    try {
      const stub = env.RATE_LIMITER.get(id);
      const response = await stub.fetch(request);
      const { milliseconds_to_next_request } = (await response.json()) as RateLimiterResponse;
      if (milliseconds_to_next_request > 0) {
        return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded', code: 429 } }, null, 2), {
          status: 429,
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: { message: 'Could not connect to rate limiter', code: 502 } }), { status: 502 });
    }

    // Extract useful information from headers
    const country = request.headers.get('cf-ipcountry');
    // Extract useful information from Cloudflare object
    const { city, region, asn, asOrganization, timezone } = request.cf || {};
    // Build useful AS information
    const org = `AS${asn} ${asOrganization}`;
    // Build payload
    const payload = { ip, city, region, country, org, timezone };
    // Return payload as JSON
    return new Response(JSON.stringify(payload, null, 2));
  },
};

// Durable Object
export class RateLimiter implements DurableObject {
  // Rate limit to 1 request per IP every 3 seconds
  static readonly milliseconds_per_request = 3000;
  static readonly milliseconds_for_grace_period = 5000;

  nextAllowedTime: number;

  constructor(_state: DurableObjectState, _env: Env) {
    this.nextAllowedTime = 0;
  }

  async fetch(_request: Request): Promise<Response> {
    const now = Date.now();

    this.nextAllowedTime = Math.max(now, this.nextAllowedTime);
    /**
     * Each request will add `milliseconds_per_request` to `nextAllowedTime` meaning
     * that the next allowed time will be delayed by `milliseconds_per_request` for each request
     * wether the request was accepted or not.
     */
    this.nextAllowedTime += RateLimiter.milliseconds_per_request;
    /**
     * If the next allowed time is in the future,
     * we return the time left until the next request is allowed
     */
    const value = Math.max(0, this.nextAllowedTime - now - RateLimiter.milliseconds_for_grace_period);
    return new Response(JSON.stringify({ milliseconds_to_next_request: value }));
  }
}
