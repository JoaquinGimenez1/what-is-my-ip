/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  RATE_LIMITER: DurableObjectNamespace;
}

interface RateLimiterResponse {
  milliseconds_to_next_request: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Determine the IP address of the client
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip === null) {
      return new Response(JSON.stringify({ error: 'Could not determine client IP' }, null, 2), { status: 400 });
    }

    // Obtain an identifier for a Durable Object based on the client's IP address
    const id = env.RATE_LIMITER.idFromName(ip);

    try {
      const stub = env.RATE_LIMITER.get(id);
      const response = await stub.fetch(request);
      const { milliseconds_to_next_request } = (await response.json()) as RateLimiterResponse;
      if (milliseconds_to_next_request > 0) {
        // Alternatively one could sleep for the necessary length of time
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', next_allowed_request_at: milliseconds_to_next_request }, null, 2),
          { status: 429 }
        );
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Could not connect to rate limiter' }), { status: 502 });
    }

    // Extract useful information
    const country = request.headers.get('cf-ipcountry');
    // Get Cloudflare object
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
  // Rate limit to 1 request per second
  static readonly milliseconds_per_request = 1000;
  static readonly milliseconds_for_grace_period = 1000;

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
