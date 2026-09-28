# Webhook recipes

Provider specific verification for Stripe, Clerk, and Resend, plus replay protection and an idempotency table with status tracking. All routes are added to the router in `convex/http.ts`.

## Shared rules

- Read the body once with `request.text()`. Verify against those exact bytes, then `JSON.parse`.
- Return 400 for a missing or invalid signature, 200 once the event is recorded, and 5xx only for a transient failure you want the provider to retry.
- Secrets live in deployment environment variables. Set them with `npx convex env set NAME value` on dev and in the dashboard for prod.
- Point the provider at `https://<deployment>.convex.site/<path>`. Dev and prod have different deployments, so each needs its own webhook endpoint and secret.
- Dedupe by provider event id. Every provider retries.

## Stripe

Stripe's `constructEvent` uses Node crypto synchronously, so verification runs in an internal Node action. The HTTP action collects the header and raw body and delegates.

```typescript
// convex/http.ts
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing stripe-signature", { status: 400 });
    const body = await request.text();
    try {
      await ctx.runAction(internal.stripe.handleWebhook, { body, signature });
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Stripe webhook rejected", error);
      return new Response("Invalid webhook", { status: 400 });
    }
  }),
});
```

```typescript
// convex/stripe.ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const handleWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Throws on a bad signature, which the HTTP action turns into a 400
    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await ctx.runMutation(internal.payments.recordCheckout, {
          eventId: event.id,
          sessionId: session.id,
          customerId: typeof session.customer === "string" ? session.customer : "",
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await ctx.runMutation(internal.subscriptions.sync, {
          eventId: event.id,
          subscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }
      default:
        // Unhandled types still return 200 so Stripe stops retrying them
        break;
    }
    return null;
  },
});
```

Each target mutation checks `eventId` against the `webhookEvents` table before writing (see idempotency below). Use the `whsec_...` value from the endpoint you created in the Stripe dashboard, not the API key.

## Clerk

Clerk signs with svix. The `svix` package runs in the default Convex runtime, so verification can happen directly in `http.ts`.

```typescript
// convex/http.ts
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/backend";

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.text();
    let event: WebhookEvent;
    try {
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (error) {
      console.error("Clerk webhook rejected", error);
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, { data: event.data });
        break;
      case "user.deleted":
        if (event.data.id) {
          await ctx.runMutation(internal.users.deleteFromClerk, { clerkId: event.data.id });
        }
        break;
      default:
        break;
    }
    return new Response(null, { status: 200 });
  }),
});
```

```typescript
// convex/users.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const clerkId: string = data.id;
    const attrs = {
      clerkId,
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
      email: data.email_addresses?.[0]?.email_address ?? "",
    };
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, attrs);
    } else {
      await ctx.db.insert("users", attrs);
    }
    return null;
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) await ctx.db.delete(user._id);
    return null;
  },
});
```

The svix `verify` call also rejects timestamps older than five minutes, so replay protection comes for free. `user.updated` and `user.created` share one upsert, which makes redelivery harmless.

## Resend

With the `@convex-dev/resend` component, the component verifies and records the event:

```typescript
// convex/http.ts
import { resend } from "./sendEmails";

http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await resend.handleResendEventWebhook(ctx, request);
  }),
});
```

Set `RESEND_WEBHOOK_SECRET` in the deployment. Without the component, Resend also signs with svix (`svix-id`, `svix-timestamp`, `svix-signature`), so the Clerk recipe applies with `RESEND_WEBHOOK_SECRET` and event types like `email.delivered` and `email.bounced`.

## Generic HMAC with replay protection

The SKILL.md example verifies `HMAC-SHA256(secret, body)` in hex. Many providers instead sign `timestamp + "." + body` and send both. Reject stale timestamps to block replays of a captured request.

```typescript
const TOLERANCE_MS = 5 * 60 * 1000;

async function verifySigned(
  request: Request,
  raw: string,
  secret: string,
  now: number,
): Promise<boolean> {
  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-signature");
  if (!timestamp || !signature) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > TOLERANCE_MS) return false;
  return await verifyHmac(`${timestamp}.${raw}`, signature, secret);
}
```

`Date.now()` is fine here because HTTP actions are not cached queries. If the provider sends base64 instead of hex, decode with `atob` and compare bytes rather than strings.

## Idempotency table with status

The minimal table in SKILL.md stores each event once. When you also need to see failures and retry them, track status.

```typescript
// convex/schema.ts
webhookEvents: defineTable({
  source: v.string(),
  eventId: v.string(),
  type: v.string(),
  payload: v.any(),
  status: v.union(v.literal("received"), v.literal("processed"), v.literal("failed")),
  error: v.optional(v.string()),
})
  .index("by_source_and_event_id", ["source", "eventId"])
  .index("by_status", ["status"]),
```

```typescript
// convex/webhooks.ts
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Records the event and schedules processing. Safe to call more than once.
export const receive = internalMutation({
  args: { source: v.string(), eventId: v.string(), type: v.string(), payload: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("webhookEvents")
      .withIndex("by_source_and_event_id", (q) =>
        q.eq("source", args.source).eq("eventId", args.eventId),
      )
      .unique();
    if (seen) return null;
    const id = await ctx.db.insert("webhookEvents", { ...args, status: "received" });
    await ctx.scheduler.runAfter(0, internal.webhooks.process, { eventId: id });
    return null;
  },
});

export const process = internalMutation({
  args: { eventId: v.id("webhookEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status === "processed") return null;
    try {
      // Apply side effects based on event.type and event.payload
      await ctx.db.patch(args.eventId, { status: "processed" });
    } catch (error) {
      await ctx.db.patch(args.eventId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});
```

Failed events sit in the table under `by_status` and can be reprocessed from the dashboard or a cron without asking the provider to resend.
