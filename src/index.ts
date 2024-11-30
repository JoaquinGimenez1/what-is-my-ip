import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { HonoContext } from './context';
import { analyticsEngine, rateLimitter, validateAccessToken } from './middleware';
import { Payload } from './types';

const hash = async (text: string) => {
  const utf8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
const app = new Hono<HonoContext>();

// Middlewares
app.use(secureHeaders());
app.use(analyticsEngine);
app.use(rateLimitter);
app.use(validateAccessToken);

// Routes
app.get('/', async (c) => {
  // Extract useful information from headers
  const ip = c.req.header('cf-connecting-ip');
  const country = c.req.header('cf-ipcountry');
  // Extract useful information from Cloudflare object
  const cf = c.req.raw.cf;
  let payload: Payload = { ip, country };
  if (cf) {
    /**
     * Destructures the `cf` object to extract the following properties:
     * - `city`: The city associated with the IP address.
     * - `region`: The region or state associated with the IP address.
     * - `asn`: The Autonomous System Number associated with the IP address.
     * - `asOrganization`: The organization associated with the ASN.
     * - `timezone`: The timezone associated with the IP address.
     */
    const { city, region, asn, asOrganization, timezone } = cf;
    // Build useful AS information
    const org = `AS${asn} ${asOrganization}`;
    // @ts-ignore
    payload = { ...payload, city, region, org, timezone };
    c.set('payload', payload);
  }

  let now = performance.now();
  let asdf = await hash(JSON.stringify(payload));
  let finish = performance.now();
  console.log('hash Time taken:', finish - now);
  console.log('payload', asdf);
  console.log('size payload', new Blob([asdf]).size);

  const prettyPayload = JSON.stringify(payload, null, 2);
  return c.text(prettyPayload, 200, { 'Content-Type': 'application/json; charset=UTF-8' });
});

export default app;
