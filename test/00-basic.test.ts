import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';
// Could import any other source file/function here
import app from '../src/index';

describe('Basic Hono tests', () => {
  it('Returns correct response type', async () => {
    const res = await testClient(app).$get();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });

  it('Returns 404 if not root', async () => {
    const res = await testClient(app).some.$get();
    console.log(res);
    expect(res.status).toBe(404);
  });
});
