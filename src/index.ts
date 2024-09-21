import { cloudflareRateLimiter } from '@hono-rate-limiter/cloudflare';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { HonoContext } from './context';
import { prettifyJson } from './lib';

const app = new Hono<HonoContext>();

// Middlewares
app.use(secureHeaders());
app.use(
  cloudflareRateLimiter<HonoContext>({
    rateLimitBinding: (c) => c.env.RATE_LIMITER,
    keyGenerator: (c) => c.req.header('cf-connecting-ip') ?? 'no-ip',
  })
);

// Routes
app.get('/', async (c) => {
  // Extract useful information from headers
  const ip = c.req.header('cf-connecting-ip');
  const country = c.req.header('cf-ipcountry');
  // Extract useful information from Cloudflare object
  const cf = c.req.raw.cf;
  let payload: string = '';
  if (cf) {
    const { city, region, asn, asOrganization, timezone } = cf;
    // Build useful AS information
    const org = `AS${asn} ${asOrganization}`;
    // Build payload
    payload = prettifyJson({ ip, city, region, country, org, timezone });
  }

  return c.text(payload);
});

// Export the app
export default {
  fetch: app.fetch,
};
