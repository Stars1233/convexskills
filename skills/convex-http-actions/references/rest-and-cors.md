# REST style routes, CORS, auth, streaming, and files

Patterns for exposing a plain HTTP API from `convex/http.ts`: path parameters, the CORS preflight pair, JSON error conventions, bearer and API key auth, streaming responses, and file upload and download routes.

## Response helpers

Put these at the bottom of `http.ts` and use them in every route so headers stay consistent.

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}
```

Set `CLIENT_ORIGIN` to the exact site origin (`https://app.example.com`) in production. `*` is fine for public read only endpoints and never for endpoints that accept credentials.

## Path parameters

`path` matches exactly. For `/api/items/<id>` use `pathPrefix` and read the tail. HTTP actions have no `ctx.db`, so id validation happens in the target query with `ctx.db.normalizeId`, which returns `null` for a string that is not a valid id for that table.

```typescript
// convex/http.ts
http.route({
  pathPrefix: "/api/items/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = new URL(request.url).pathname.slice("/api/items/".length);
    if (!id) return error("Missing id", 400);
    const item = await ctx.runQuery(internal.items.getByIdString, { id });
    if (!item) return error("Not found", 404);
    return json(item);
  }),
});
```

```typescript
// convex/items.ts
export const getByIdString = internalQuery({
  args: { id: v.string() },
  returns: v.union(v.object({ _id: v.id("items"), _creationTime: v.number(), name: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("items", args.id);
    if (!id) return null;
    return await ctx.db.get(id);
  },
});
```

Query string values come from `new URL(request.url).searchParams.get("limit")`. Parse and bound them before passing along: `Math.min(Number(limit ?? "20"), 100)`.

## CORS preflight pair

Browsers send `OPTIONS` before any cross origin request with a JSON body or an `Authorization` header. Register an `OPTIONS` route for each browser called path. The real route must also return the CORS headers, which `json()` above already does.

```typescript
http.route({
  path: "/api/items",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});

http.route({
  path: "/api/items",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const items = await ctx.runQuery(internal.items.listRecent, { limit: 20 });
    return json(items);
  }),
});
```

If the browser sends cookies or uses `credentials: "include"`, add `"Access-Control-Allow-Credentials": "true"` and use an exact origin instead of `*`.

## JSON errors and status codes

| Situation | Status |
| --- | --- |
| Body is not valid JSON, or a required field is missing | 400 |
| No or malformed `Authorization` header | 401 |
| Valid identity but not allowed to do this | 403 |
| Id does not resolve | 404 |
| Wrong `Content-Type` on a JSON route | 415 |
| Unexpected exception | 500 (log it, return a generic message) |

```typescript
http.route({
  path: "/api/items",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return error("Content-Type must be application/json", 415);
    }
    let body: { name?: unknown };
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body", 400);
    }
    if (typeof body.name !== "string" || body.name.length === 0) {
      return error("name is required", 400);
    }
    try {
      const id = await ctx.runMutation(internal.items.create, { name: body.name });
      return json({ id }, 201);
    } catch (e) {
      console.error("POST /api/items failed", e);
      return error("Internal server error", 500);
    }
  }),
});
```

Never echo the raw exception message to the client. It can include table names or ids.

## Auth with a bearer header

If the client can obtain a JWT from your configured auth provider (Clerk, WorkOS AuthKit, Auth0, Convex Auth), send it as `Authorization: Bearer <jwt>`. Convex validates it against `convex/auth.config.ts` and `ctx.auth.getUserIdentity()` returns the identity, exactly as in a query.

```typescript
http.route({
  path: "/api/me",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return error("Unauthorized", 401);
    const user = await ctx.runQuery(internal.users.getBySubject, { subject: identity.subject });
    if (!user) return error("Not found", 404);
    return json(user);
  }),
});
```

For machine clients that cannot get a JWT, issue API keys. Store only a SHA-256 hash and look it up by index; a leaked database dump then reveals nothing usable.

```typescript
// convex/http.ts
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

http.route({
  path: "/api/export",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const header = request.headers.get("Authorization") ?? "";
    if (!header.startsWith("Bearer ")) return error("Missing API key", 401);
    const keyHash = await sha256Hex(header.slice("Bearer ".length));
    const owner = await ctx.runQuery(internal.apiKeys.ownerForHash, { keyHash });
    if (!owner) return error("Invalid API key", 403);
    const data = await ctx.runQuery(internal.exports.forUser, { userId: owner });
    return json(data);
  }),
});
```

```typescript
// convex/apiKeys.ts
export const ownerForHash = internalQuery({
  args: { keyHash: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    if (!key || key.revokedAt !== undefined) return null;
    return key.userId;
  },
});
```

Schema: `apiKeys: defineTable({ keyHash: v.string(), userId: v.id("users"), name: v.string(), revokedAt: v.optional(v.number()) }).index("by_key_hash", ["keyHash"])`.

## Streaming responses

Return a `Response` whose body is a `ReadableStream`. Convex flushes chunks as they are enqueued, which suits server sent events and LLM token streams.

```typescript
http.route({
  path: "/api/stream",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const prompt = new URL(request.url).searchParams.get("q") ?? "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Replace with a real token source, such as an LLM SDK stream
        for (const chunk of await ctx.runAction(internal.ai.tokensFor, { prompt })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...CORS_HEADERS,
      },
    });
  }),
});
```

The whole handler still has to finish within the action time limit, so a stream is for delivering results progressively, not for keeping a connection open indefinitely. For long lived realtime data, use a Convex query subscription instead.

## File download and upload over HTTP

Serve a stored file by reading the blob with `ctx.storage.get` and returning it. This keeps the `.convex.site` URL stable and lets you add auth or custom headers. Redirecting to `ctx.storage.getUrl` also works when you do not need to gate access.

```typescript
// convex/http.ts
import { Id } from "./_generated/dataModel";

http.route({
  pathPrefix: "/files/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const storageId = new URL(request.url).pathname.slice("/files/".length) as Id<"_storage">;
    if (!storageId) return error("Not found", 404);
    const blob = await ctx.storage.get(storageId);
    if (!blob) return error("Not found", 404);
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
        ...CORS_HEADERS,
      },
    });
  }),
});
```

To gate access, look up the file's owner first with `ctx.runQuery(internal.files.ownerOf, { storageId })` and compare against `ctx.auth.getUserIdentity()` before reading the blob.

Accept an upload by storing the request body directly. The 20MB request limit applies, so browsers uploading larger files should use `ctx.storage.generateUploadUrl()` from a mutation instead.

```typescript
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return error("Unauthorized", 401);
    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) return error("Only images are accepted", 415);

    const blob = await request.blob();
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.files.save, {
      storageId,
      subject: identity.subject,
      contentType,
      size: blob.size,
    });
    return json({ storageId }, 201);
  }),
});

http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});
```

`request.blob()` keeps the `Content-Type` from the request, so `ctx.storage.store(blob)` records it as the file's content type and `ctx.storage.getUrl` serves it with the right header later.
