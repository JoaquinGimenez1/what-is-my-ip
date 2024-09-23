import { createMiddleware } from 'hono/factory';
import { HonoContext } from './context';

export const rateLimitter = createMiddleware<HonoContext>(async (c, next) => {
  try {
    const key = c.req.header('cf-connecting-ip') ?? 'no-ip';
    const { success } = await c.env.RATE_LIMITER.limit({ key });
    c.set('ip', key);
    if (!success) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (error) {
    console.error((error as Error).message);
  }

  await next();
});

export const analyticsEngine = createMiddleware<HonoContext>(async (c, next) => {
  await next();
  // We have `c.res` available here, store what we need
  const { status } = c.res;
  const ip = c.get('ip');

  c.env?.VISITS?.writeDataPoint({ doubles: [status], blobs: [ip] });
});
