import 'server-only';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { execute } from './db';
import { jsonBody, rateLimit, requestIdentity } from './security';
export async function submitContact(req: Request) {
  await rateLimit('contact:' + requestIdentity(req), 5, 3600);
  const d = z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.email().max(254),
      mobile: z
        .string()
        .trim()
        .min(7)
        .max(40)
        .regex(/^[+0-9 ()-]+$/),
      message: z.string().trim().min(10).max(5000),
      website: z.string().max(200).optional(),
    })
    .strict()
    .parse(await jsonBody(req));
  if (d.website) return { submitted: true };
  const id = randomUUID();
  await execute(
    "INSERT INTO ssinfo_contact_messages (id,slug,name,status,data) VALUES (?,?,?,'new',?)",
    [
      id,
      id,
      d.name,
      JSON.stringify({ email: d.email, mobile: d.mobile, message: d.message }),
    ],
  );
  return { submitted: true };
}
