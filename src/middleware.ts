import { createMiddleware } from 'hono/factory';
import { HonoContext } from './context';

/**
 * Middleware to enforce rate limiting based on the client's IP address.
 *
 * This middleware uses the `cf-connecting-ip` header to identify the client's IP address.
 * If the header is not present, it defaults to 'no-ip'.
 *
 * The middleware checks the rate limit using the `RATE_LIMITER` service from the environment.
 * If the rate limit is exceeded, it logs the event and returns a 429 status code with an error message.
 *
 * @param c - The Hono context object.
 * @param next - The next middleware function in the stack.
 *
 * @returns A JSON response with an error message and a 429 status code if the rate limit is exceeded.
 */
export const rateLimitter = createMiddleware<HonoContext>(async (c, next) => {
  try {
    const key = c.req.header('cf-connecting-ip') ?? 'no-ip';
    const { success } = await c.env.RATE_LIMITER.limit({ key });
    c.set('ip', key);
    if (!success) {
      console.log(`IP ${key} exceeded rate limit`);
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (error) {
    console.error((error as Error).message);
  }

  await next();
});

/**
 * Middleware to log analytics data after processing a request.
 *
 * This middleware captures the response status, client IP, version ID, and request path,
 * and writes these data points to the `VISITS` environment variable.
 *
 * @param c - The Hono context object, which includes the request and response.
 * @param next - The next middleware function in the stack.
 *
 * @returns A promise that resolves after the next middleware has been executed and the data points have been logged.
 */
export const analyticsEngine = createMiddleware<HonoContext>(async (c, next) => {
  await next();

  // We have `c.res` available here, store what we need
  const { status } = c.res;
  const ip = c.get('ip');

  const versionId = c.env.CF_VERSION_METADATA?.id;
  const { path } = c.req;

  const entry = { doubles: [status], blobs: [ip, versionId, path] };

  // Non-blocking write to the Workers Analytics Engine
  c.env?.VISITS?.writeDataPoint(entry);
});
