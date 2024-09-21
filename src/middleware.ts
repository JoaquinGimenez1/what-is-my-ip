import { createMiddleware } from 'hono/factory';
import { HonoContext } from './context';

// Currently not in use
export const rateLimitter = createMiddleware<HonoContext>(async (c, next) => {
  const key = c.req.header('cf-connecting-ip') ?? 'no-ip';
  const { success } = await c.env.RATE_LIMITER.limit({ key });

  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
});

export const analyticsEngine = createMiddleware<HonoContext>(async (c, next) => {
  await next();
  // Check `c.res` and store relevant information
  c.env.VISITS.writeDataPoint({ doubles: [], blobs: [] });
});
