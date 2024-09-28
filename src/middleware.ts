import { createRemoteJWKSet, jwtVerify, JWKSCacheInput } from 'jose';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HonoContext } from './context';
import { User } from './types';

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

/**
 * Middleware to validate the access token in the request.
 *
 * This middleware checks the environment and, if not in production, verifies the JWT token
 * provided in the request headers or cookies. It uses the JWKS (JSON Web Key Set) for token
 * verification and updates the cache if necessary.
 *
 * Official documenation to validate JWT:
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 *
 * @param c - The context object containing the request and environment information.
 * @param next - The next middleware function to call if the token is valid.
 *
 * @returns A JSON response with an error message and status code if the token is invalid or missing.
 *
 * @throws Will return a 500 status code if JWKS configuration is missing.
 * @throws Will return a 401 status code if the JWT token is missing.
 * @throws Will return a 403 status code if the JWT token verification fails.
 */
export const validateAccessToken = createMiddleware<HonoContext>(async (c, next) => {
  // Production environment is public
  if (c.env.ENVIRONMENT === 'production') {
    return await next();
  }

  if (!c.env.JWT_ISSUER || !c.env.JWT_AUDIENCE || !c.env.JWKS) {
    return c.json({ error: 'Missing JWKS configuration' }, 500);
  }

  const jwt = c.req.header('cf-access-jwt-assertion') ?? getCookie(c, 'CF_Authorization');

  if (!jwt) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const certsUrl = new URL(`${c.env.JWT_ISSUER}/cdn-cgi/access/certs`);
    // https://github.com/panva/jose/blob/main/docs/variables/jwks_remote.jwksCache.md#variable-jwkscache
    let jwksCache: JWKSCacheInput = (await c.env.JWKS.get('certs', { type: 'json' })) ?? {};
    const { uat } = jwksCache;
    // TODO: Cache not working
    const jkws = createRemoteJWKSet(certsUrl, { [jwksCache]: jwksCache });

    await jwtVerify(jwt, jkws, { audience: c.env.JWT_AUDIENCE, issuer: c.env.JWT_ISSUER });

    if (uat !== jwksCache.uat) {
      // Non-blocking cache update
      c.executionCtx.waitUntil(c.env.JWKS.put('certs', JSON.stringify(jwksCache)));
    }

    const res = await fetch(`${c.env.JWT_ISSUER}/cdn-cgi/access/get-identity`, { headers: { Cookie: `CF_Authorization=${jwt}` } });
    const user = (await res.json()) as User;
    c.set('user', user);
  } catch (error) {
    console.error((error as Error).message);
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});
