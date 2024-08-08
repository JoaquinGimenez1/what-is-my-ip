export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Determine the IP address of the client
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip === null) {
        env.VISITS.writeDataPoint({
          blobs: ['error'], // Status
          doubles: [400], // HTTP status code
        });
        return new Response(JSON.stringify({ error: { message: 'Could not determine client IP', code: 400 } }, null, 2), { status: 400 });
      }

      const { success } = await env.RATE_LIMITER.limit({ key: ip });

      if (!success) {
        env.VISITS.writeDataPoint({
          blobs: ['error'], // Status
          doubles: [429], // HTTP status code
        });
        return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded', code: 429 } }, null, 2), {
          status: 429,
        });
      }

      // Extract useful information from headers
      const country = request.headers.get('cf-ipcountry');
      // Extract useful information from Cloudflare object
      const { city, region, asn, asOrganization, timezone, colo } = request.cf || {};
      // Build useful AS information
      const org = `AS${asn} ${asOrganization}`;
      // Build payload
      const payload = { ip, city, region, country, org, timezone };

      env.VISITS.writeDataPoint({
        blobs: ['success', country as string, city as string, region as string, org as string, colo as string], // Status,
        doubles: [200], // HTTP status code
      });

      // Return payload as JSON
      return new Response(JSON.stringify(payload, null, 2));
    } catch (error) {
      env.VISITS.writeDataPoint({
        blobs: ['error'], // Status
        doubles: [500], // HTTP status code
      });
      return new Response(JSON.stringify({ error: { message: (error as Error).message, code: 500 } }, null, 2), { status: 500 });
    }
  },
};
