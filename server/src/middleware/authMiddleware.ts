import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  c.set('userId', user.id);
  c.set('userEmail', user.email);
  await next();
});
