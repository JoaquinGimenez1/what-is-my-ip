import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { HonoContext } from './context';
import { analyticsEngine, rateLimitter } from './middleware';
import { Payload } from './types';

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
  let payload: Payload = { ip, country };
  if (cf) {
    const { city, region, asn, asOrganization, timezone } = cf;
    // Build useful AS information
    const org = `AS${asn} ${asOrganization}`;
    payload = { ...payload, city, region, org, timezone };
  }

  const prettyPayload = JSON.stringify(payload, null, 2);
  return c.text(prettyPayload, 200, { 'Content-Type': 'application/json; charset=UTF-8' });
});

export default app;
