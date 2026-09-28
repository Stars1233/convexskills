# Attack surface

Entry points into a Convex backend beyond ordinary client calls, and what the audit checks at each one.

## HTTP actions

Routes in `convex/http.ts` accept any HTTP request from anywhere. They do not go through the Convex client, and `ctx.auth.getUserIdentity()` only works if the caller sends a valid `Authorization: Bearer <jwt>` header.

Audit questions per route:

1. How is the caller verified? Webhook signature, bearer token, or Convex identity.
2. Is the raw body read once and validated before use?
3. Does the route call `internal.*` functions with data it has already verified, and never `api.*`?
4. Does it return generic errors, not stack traces or upstream responses?

### Webhook with signature verification

Read the raw body as text before parsing; signature schemes hash the exact bytes. `http.ts` runs in the Convex runtime, which has Web Crypto, so HMAC verification does not need `"use node"`.

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function verifyHmacSha256(
  secret: string,
  body: string,
  signatureHex: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  const expected = Array.from(mac)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== signatureHex.length) return false;
  // constant time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}

http.route({
  path: "/webhooks/billing",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) return new Response("Not configured", { status: 500 });

    const signature = req.headers.get("x-signature");
    if (!signature) return new Response("Missing signature", { status: 401 });

    const body = await req.text();
    if (!(await verifyHmacSha256(secret, body, signature))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body) as { type: string; customerId: string };
    if (event.type !== "subscription.updated") {
      return new Response("Ignored", { status: 200 });
    }

    await ctx.runMutation(internal.billing.applySubscriptionEvent, {
      customerId: event.customerId,
    });
    return new Response(null, { status: 200 });
  }),
});

export default http;
```

For Stripe, Clerk, WorkOS, and similar providers, use the provider's own verification helper with the raw body and the signing secret from `process.env`. Same shape: verify first, parse second, call `internal.*` third.

### Routes that act on behalf of a user

If a route needs the signed in user, the client must send the Convex JWT as a bearer token. Then `ctx.auth.getUserIdentity()` works like in any function.

```typescript
http.route({
  path: "/api/export",
  method: "GET",
  handler: httpAction(async (ctx, _req) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("Unauthorized", { status: 401 });
    const data = await ctx.runQuery(internal.exports.forUser, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

Findings: routes that trust a `userId` in the query string or body instead of the bearer identity; CORS set to `*` on routes that return user data.

## File storage

Two operations matter: creating upload URLs and returning file URLs.

### Upload URL generation must be authenticated

An upload URL lets the holder write a file into your storage. Public, unauthenticated `generateUploadUrl` is a storage abuse finding (medium) and, if the resulting file IDs are later trusted, an injection path (high).

```typescript
export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

### Store the owner with the file ID

After upload the client sends the `Id<"_storage">` back. Record who owns it in the same mutation, and do not accept a `userId` argument.

```typescript
export const attachAvatar = authedMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(ctx.user._id, { avatarId: args.storageId });
    return null;
  },
});
```

### Gate URL reads by ownership

`ctx.storage.getUrl(id)` returns a URL that works for anyone who has it. A query that turns any client supplied `Id<"_storage">` into a URL leaks every file in the deployment.

```typescript
// Bad: converts any storage ID into a public URL
export const fileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Good: resolve the URL from a document the caller is allowed to see
export const attachmentUrl = authedQuery({
  args: { attachmentId: v.id("attachments") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.ownerId !== ctx.user._id) return null;
    return await ctx.storage.getUrl(attachment.storageId);
  },
});
```

Also check: are orphaned files deleted with `ctx.storage.delete` when the owning document is deleted, and is there a size or content type check on the document that references the file.

## Scheduled function trust

`ctx.scheduler.runAfter`, `ctx.scheduler.runAt`, and cron jobs run with no caller identity. `internal*` functions run with no auth and no caller identity. This is correct, and it means the trust boundary sits at the call site that schedules them.

Audit steps:

1. Every scheduled or cron target is `internal.*`. Scheduling `api.*` is a finding, because it reopens a public function to arbitrary arguments from the backend while skipping the client side checks it may assume.
2. For each `internal.*` target, find every call site. For each call site inside a public function or HTTP route, confirm the arguments were validated and ownership was checked before scheduling.
3. Internal functions still declare `args` and `returns` validators. Validation at the boundary catches bugs in callers.

```typescript
// Bad: schedules a public function; arguments came straight from the client
await ctx.scheduler.runAfter(0, api.emails.send, { to: args.to, body: args.body });

// Good: caller is authenticated, recipient is derived from the caller,
// target is internal
export const requestExport = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.exports.build, {
      userId: ctx.user._id,
      email: ctx.user.email,
    });
    return null;
  },
});
```

Cron definitions: `crons.interval` and `crons.cron` only, targets are `internal.*`.

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("purge expired sessions", { hours: 1 }, internal.sessions.purge, {});
export default crons;
```

## Rate limiting

Anything a signed in user can trigger that costs money or creates load needs a server side limit: sending email, calling an LLM, creating documents, generating upload URLs, sign up flows. Client side throttling is not a control.

Use the `@convex-dev/rate-limiter` component.

```bash
npm install @convex-dev/rate-limiter
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(rateLimiter);
export default app;
```

```typescript
// convex/lib/rateLimits.ts
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 10 messages per minute per user, small burst allowed
  sendMessage: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 3 },
  // 5 uploads per hour per user
  uploadFile: { kind: "fixed window", rate: 5, period: HOUR },
  // global cap on LLM calls across all users
  llmCall: { kind: "token bucket", rate: 600, period: HOUR },
});
```

```typescript
// convex/messages.ts
export const send = authedMutation({
  args: { channelId: v.id("channels"), body: v.string() },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    // throws a ConvexError with retryAfter when over the limit
    await rateLimiter.limit(ctx, "sendMessage", {
      key: ctx.user._id,
      throws: true,
    });
    return await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: ctx.user._id,
      body: args.body,
    });
  },
});
```

Omit `key` for a global limit. Use `rateLimiter.check(ctx, name, { key })` to inspect without consuming. Rate limit inside the mutation or action that does the work, not in a separate mutation the client is expected to call first.

Findings: costly public functions with no limit (medium); rate limits keyed on client supplied values instead of `user._id` (high, trivially bypassed).

## Secrets

Where secrets live:

- Convex environment variables, set with `npx convex env set NAME value` or in the dashboard, read with `process.env.NAME` inside the action or HTTP action that uses them.
- Different values for dev and prod deployments. Check both.

Where secrets must not live:

- Source files, including `convex/`, `src/`, tests, and fixtures.
- Client bundles. Any `VITE_*` or `NEXT_PUBLIC_*` variable ships to the browser. Only deployment URLs and public client IDs belong there.
- Function return values, logs, or error messages. Never `console.log` a request that includes an `Authorization` header.
- Git history. A rotated key that is still in an old commit is still leaked; rotate it at the provider.

Pattern for reading a secret:

```typescript
"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@example.com",
        to: args.to,
        subject: args.subject,
        html: args.html,
      }),
    });
    if (!res.ok) {
      // do not forward the upstream body to the caller
      throw new Error(`Email provider returned ${res.status}`);
    }
    return null;
  },
});
```

`"use node"` only when the file needs Node APIs or a Node only SDK. Plain `fetch` works in the default runtime without it.

## Client supplied IDs

The client controls every argument. `v.id("tasks")` proves the string is a valid ID for the `tasks` table and nothing else. Three rules:

1. Never accept the caller's own identity as an argument (`userId`, `email`, `orgId` without a membership check). Derive it from `ctx.auth.getUserIdentity()`.
2. Every `ctx.db.get(args.id)`, `patch(args.id)`, `delete(args.id)`, `replace(args.id)` is followed by an ownership or membership comparison before anything is returned or written.
3. Related IDs are checked too. Creating a `comment` with `args.postId` on a private post requires proving the caller can see the post.

```bash
# every place a client ID reaches the database
rg -n "ctx\.db\.(get|patch|delete|replace)\(args\." convex --glob '!**/_generated/**'
# every public function that takes the caller's identity as an argument
rg -n "userId: v\.(id|string)\(" convex --glob '!**/_generated/**'
```

The second grep also surfaces legitimate internal functions; filter to files with public exports.
