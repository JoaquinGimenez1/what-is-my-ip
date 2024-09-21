import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { HonoContext } from './context';
import { prettifyJson } from './lib';
import { analyticsEngine, rateLimitter } from './middleware';

const app = new Hono<HonoContext>();

// Middlewares
app.use(secureHeaders());
app.use(analyticsEngine);
app.use(rateLimitter);

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
    // Build pretty payload
    payload = prettifyJson({ ip, city, region, country, org, timezone });
  }

  return c.text(payload);
});

// Export the app
export default {
  fetch: app.fetch,
};
