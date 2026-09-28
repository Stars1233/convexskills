# Authorization patterns

Helpers and wrappers for proving who the caller is and what they may touch. Use these to fix findings from the audit.

## getCurrentUser helper

One helper, one place. Every public function that touches user data calls it. Look the user up through an index on `tokenIdentifier`; never trust a `userId` argument from the client.

```typescript
// convex/lib/auth.ts
import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

// Returns null when not signed in or no profile row yet. Use in queries
// that should degrade to "nothing" for anonymous callers.
export async function getCurrentUserOrNull(
  ctx: Ctx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

// Throws when not signed in. Use in mutations and in queries that must
// never run anonymously.
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in required",
    });
  }
  return user;
}
```

Schema requirement:

```typescript
users: defineTable({
  tokenIdentifier: v.string(),
  name: v.string(),
  email: v.string(),
  role: v.union(v.literal("user"), v.literal("admin")),
}).index("by_tokenIdentifier", ["tokenIdentifier"]),
```

## Custom function wrappers

`convex-helpers` lets you define `authedQuery`, `adminMutation`, `orgQuery`, and so on. Auth runs once in the wrapper and the handler receives `ctx.user`. This removes the "forgot to call getCurrentUser" class of finding.

```bash
npm install convex-helpers
```

### Authed wrappers

```typescript
// convex/lib/functions.ts
import {
  customQuery,
  customMutation,
  customCtx,
} from "convex-helpers/server/customFunctions";
import { query, mutation } from "../_generated/server";
import { getCurrentUser } from "./auth";

// ctx.user is a Doc<"users">, guaranteed signed in
export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await getCurrentUser(ctx) })),
);

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await getCurrentUser(ctx) })),
);
```

Usage:

```typescript
// convex/tasks.ts
import { v } from "convex/values";
import { authedQuery } from "./lib/functions";

export const listMine = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.string(),
      completed: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});
```

### Admin wrappers

Role comes from the `users` row, which only an `internalMutation` may change. Never accept `role` or `isAdmin` as a client argument.

```typescript
// convex/lib/functions.ts (continued)
import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return user;
}

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);
```

The only way to change a role:

```typescript
// convex/users.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const setRole = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role });
    return null;
  },
});
```

Run it from the dashboard or `npx convex run users:setRole '{...}'`, not from a public function.

### Tenant scoped wrappers

For multi tenant apps, verify membership once in the wrapper. The handler gets `ctx.orgId` and `ctx.membership` and cannot forget the check.

```typescript
// convex/lib/functions.ts (continued)
import { v, ConvexError } from "convex/values";

export const orgQuery = customQuery(query, {
  args: { orgId: v.id("organizations") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
    if (!membership) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not a member" });
    }
    // orgId is consumed here and exposed on ctx, so handlers cannot
    // accidentally query a different org than the one that was checked
    return {
      ctx: { ...ctx, user, orgId: args.orgId, membership },
      args: {},
    };
  },
});

export const orgMutation = customMutation(mutation, {
  args: { orgId: v.id("organizations") },
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_org_and_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", user._id),
      )
      .unique();
    if (!membership) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not a member" });
    }
    return {
      ctx: { ...ctx, user, orgId: args.orgId, membership },
      args: {},
    };
  },
});
```

Usage. The client still passes `orgId`; the handler reads it from `ctx`:

```typescript
export const listProjects = orgQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", ctx.orgId))
      .collect();
  },
});

export const deleteProject = orgMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    // v.id only proves the string is a projects ID. It does not prove
    // the project belongs to the org that was just checked.
    if (!project || project.orgId !== ctx.orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Project not found" });
    }
    if (ctx.membership.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin only" });
    }
    await ctx.db.delete(args.projectId);
    return null;
  },
});
```

## Ownership checks

`v.id("tasks")` validates that the argument is a well formed ID for that table. It says nothing about who owns the document. Every read, patch, or delete by a client supplied ID needs an ownership comparison.

### Get then compare

```typescript
export const update = authedMutation({
  args: { taskId: v.id("tasks"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== ctx.user._id) {
      // Same error for missing and not owned, so callers cannot probe IDs
      throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    }
    await ctx.db.patch(args.taskId, { title: args.title });
    return null;
  },
});
```

### List through the owner index

Listing never takes an ID from the client. The index scopes the read, so there is nothing to compare.

```typescript
export const listMine = authedQuery({
  args: {},
  returns: v.array(taskValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});
```

### Single read that returns null for both cases

In queries, return `null` for "does not exist" and "not yours". Do not throw for one and return `null` for the other; the difference leaks which IDs exist.

```typescript
export const get = query({
  args: { taskId: v.id("tasks") },
  returns: v.union(taskValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) return null;
    return task;
  },
});
```

## Shared resources with an access list

When a document can be shared, check owner first, then an access table with a compound index. Public documents short circuit before auth.

```typescript
export const getDocument = query({
  args: { docId: v.id("documents") },
  returns: v.union(
    v.object({
      _id: v.id("documents"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      title: v.string(),
      content: v.string(),
      visibility: v.union(v.literal("public"), v.literal("private")),
      accessLevel: v.union(
        v.literal("public"),
        v.literal("owner"),
        v.literal("viewer"),
        v.literal("editor"),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) return null;

    if (doc.visibility === "public") {
      return { ...doc, accessLevel: "public" as const };
    }

    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    if (doc.ownerId === user._id) {
      return { ...doc, accessLevel: "owner" as const };
    }

    const access = await ctx.db
      .query("documentAccess")
      .withIndex("by_doc_and_user", (q) =>
        q.eq("documentId", args.docId).eq("userId", user._id),
      )
      .unique();
    if (!access) return null;

    return { ...doc, accessLevel: access.level };
  },
});
```

Schema:

```typescript
documentAccess: defineTable({
  documentId: v.id("documents"),
  userId: v.id("users"),
  level: v.union(v.literal("viewer"), v.literal("editor")),
}).index("by_doc_and_user", ["documentId", "userId"]),
```

## Role hierarchy

When there are more than two roles, compare levels rather than listing every allowed role at every call site.

```typescript
// convex/lib/roles.ts
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";

export type Role = "user" | "moderator" | "admin";

const level: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export function requireRole(user: Doc<"users">, min: Role): void {
  if (level[user.role] < level[min]) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Requires ${min} or higher`,
    });
  }
}
```

```typescript
export const hidePost = authedMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.user, "moderator");
    await ctx.db.patch(args.postId, { hidden: true });
    return null;
  },
});
```

## Two step confirmation for destructive admin actions

For actions like "delete all data for a user", require a short lived confirmation code created by a separate mutation, then do the work in an `internalMutation` scheduled from the confirming call. Write an audit log row in the same transaction.

```typescript
// convex/admin.ts
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { adminMutation } from "./lib/functions";

export const confirmDeleteUserData = adminMutation({
  args: { targetUserId: v.id("users"), code: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const confirmation = await ctx.db
      .query("confirmations")
      .withIndex("by_admin_and_code", (q) =>
        q.eq("adminId", ctx.user._id).eq("code", args.code),
      )
      .unique();
    if (
      !confirmation ||
      confirmation.action !== "delete_user_data" ||
      confirmation.targetUserId !== args.targetUserId ||
      confirmation.expiresAt < Date.now()
    ) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid code" });
    }
    await ctx.db.delete(confirmation._id); // single use
    await ctx.db.insert("auditLogs", {
      action: "delete_user_data",
      performedBy: ctx.user._id,
      targetUserId: args.targetUserId,
    });
    await ctx.scheduler.runAfter(0, internal.admin.performDeletion, {
      userId: args.targetUserId,
    });
    return null;
  },
});
```

`Date.now()` is fine here because this is a mutation. Never use it inside a query.
