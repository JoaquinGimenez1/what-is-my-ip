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
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Get request headers
    const headers = new Map(request.headers);
    // Extract useful information
    const ip = headers.get('cf-connecting-ip');
    const country = headers.get('cf-ipcountry');

    const getIPInfoData = async (ip: string): Promise<any> => {
      const url = `https://ipinfo.io/${ip}?token=${env.IPINFO_TOKEN}`;
      // const modifiedRequest = new Request(url, request);

      const ipData = await fetch(url);
      return ipData;
    };

    let ipInfoData;
    if (ip !== undefined) {
      ipInfoData = await getIPInfoData(ip);
    }

    // Build payload
    const payload = { ip, country, ipInfoData };
    // Return payload as JSON
    return new Response(JSON.stringify(payload));
  },
};

// # With Bearer token
// $ curl -H "Authorization: Bearer dbff1db40ed83d" ipinfo.io

// # With token query parameter
// $ curl ipinfo.io?token=dbff1db40ed83d

// # Get details for your own IP address over HTTPS
// $ curl https://ipinfo.io?token=dbff1db40ed83d

// https://ipinfo.io/47.211.216.202?token=dbff1db40ed83d
