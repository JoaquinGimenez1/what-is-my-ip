export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Determine the IP address of the client
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip === null) {
      return new Response(JSON.stringify({ error: { message: 'Could not determine client IP', code: 400 } }, null, 2), { status: 400 });
    }

    const { success } = await env.RATE_LIMITER.limit({ key: ip });

    if (!success) {
      return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded', code: 429 } }, null, 2), {
        status: 429,
      });
    }

    // Workers Analytics Engine
    // env.VISITS.writeDataPoint({
    //   indexes: [ip],
    //   blobs: [success, env.ENVIRONMENT],
    // });

    // Extract useful information from headers
    const country = request.headers.get('cf-ipcountry');
    // Extract useful information from Cloudflare object
    const { city, region, asn, asOrganization, timezone } = request.cf || {};
    // Build useful AS information
    const org = `AS${asn} ${asOrganization}`;
    // Build payload
    const payload = { ip, city, region, country, org, timezone };
    await env.LOGS.put(`visit/${region}/${new Date().toISOString()}`, JSON.stringify(payload));
    // Return payload as JSON
    return new Response(JSON.stringify(payload, null, 2));
  },
};
