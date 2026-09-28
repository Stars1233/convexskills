# Migration patterns

Short recipes for the common schema changes, each with the before and after schema and the order of operations. Every recipe follows the same safe sequence from SKILL.md: widen, deploy, backfill, narrow, deploy, clean up.

All backfills below use the hand rolled pattern (an `internalMutation` that pages with `paginate` and reschedules itself) or `migrations.define` from `@convex-dev/migrations`. Only the `migrateOne` body is shown where the loop is identical.

## Add a required field to existing documents

The most common case. The table already has rows and the new field must end up required.

Before:

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
}),
```

Step 1, add as optional and deploy:

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  avatarUrl: v.optional(v.string()),
}),
```

Step 2, update writers to always set `avatarUrl` and readers to fall back:

```typescript
avatarUrl: user.avatarUrl ?? null,
```

Step 3, backfill:

```typescript
migrateOne: async (ctx, user) => {
  if (user.avatarUrl === undefined) {
    await ctx.db.patch(user._id, { avatarUrl: defaultAvatar(user.name) });
  }
},
```

Step 4, require it and deploy:

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  avatarUrl: v.string(),
}),
```

Step 5, delete the `?? null` fallbacks.

## Rename a field

Renaming is a copy followed by a remove. Never rename in place in the schema; that fails validation on every existing document.

Before:

```typescript
users: defineTable({
  userName: v.string(),
}),
```

Step 1, add the new name as optional, keep the old one, deploy:

```typescript
users: defineTable({
  userName: v.string(),
  displayName: v.optional(v.string()),
}),
```

Step 2, writers set both fields. Readers prefer the new one:

```typescript
displayName: user.displayName ?? user.userName,
```

Step 3, backfill the copy:

```typescript
migrateOne: async (ctx, user) => {
  if (user.displayName === undefined) {
    await ctx.db.patch(user._id, { displayName: user.userName });
  }
},
```

Step 4, make the new field required and the old one optional, deploy. Switch all readers and writers to `displayName` only.

```typescript
users: defineTable({
  userName: v.optional(v.string()),
  displayName: v.string(),
}),
```

Step 5, clear the old field with a second backfill (see "Remove a field"), then delete it from the schema and deploy.

## Change a field type

Two options. Use a new field when the conversion is lossy or code needs both for a while. Use a widened union when the field name should stay.

### Option A: new field

Before:

```typescript
tasks: defineTable({
  priority: v.string(), // "low" | "medium" | "high"
}),
```

Step 1, add the typed field as optional, deploy:

```typescript
tasks: defineTable({
  priority: v.string(),
  priorityLevel: v.optional(v.number()),
}),
```

Step 2, backfill with the conversion:

```typescript
const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };

migrateOne: async (ctx, task) => {
  if (task.priorityLevel === undefined) {
    await ctx.db.patch(task._id, {
      priorityLevel: priorityMap[task.priority] ?? 1,
    });
  }
},
```

Step 3, require `priorityLevel`, make `priority` optional, switch code, deploy. Then remove `priority` as in "Remove a field".

### Option B: widen then narrow in place

Step 1, widen the validator to accept both types, deploy:

```typescript
tasks: defineTable({
  priority: v.union(v.string(), v.number()),
}),
```

Step 2, writers produce numbers. Readers coerce:

```typescript
const level = typeof task.priority === "number" ? task.priority : priorityMap[task.priority] ?? 1;
```

Step 3, backfill:

```typescript
migrateOne: async (ctx, task) => {
  if (typeof task.priority === "string") {
    await ctx.db.patch(task._id, { priority: priorityMap[task.priority] ?? 1 });
  }
},
```

Step 4, narrow to `v.number()` and deploy. Remove the coercion.

## Remove a field

Deleting a line from the schema while documents still carry the field fails validation. Clear the data first.

Before:

```typescript
posts: defineTable({
  title: v.string(),
  legacyField: v.string(),
}),
```

Step 1, make it optional, deploy. Remove every read and write of `legacyField` from the code.

```typescript
posts: defineTable({
  title: v.string(),
  legacyField: v.optional(v.string()),
}),
```

Step 2, backfill. Patching a field to `undefined` removes it from the document:

```typescript
migrateOne: async (ctx, post) => {
  if (post.legacyField !== undefined) {
    await ctx.db.patch(post._id, { legacyField: undefined });
  }
},
```

With the component this is one line: `migrateOne: () => ({ legacyField: undefined })`.

Step 3, delete the field from the schema and deploy:

```typescript
posts: defineTable({
  title: v.string(),
}),
```

Drop any index that included `legacyField` in the same deploy.

## Split a table

Move an embedded object or a group of fields into its own table, linked by `v.id`. Typical reason: the embedded data changes often, is large, or needs its own indexes.

Before:

```typescript
users: defineTable({
  name: v.string(),
  settings: v.object({
    theme: v.string(),
    notifications: v.boolean(),
  }),
}),
```

Step 1, add the new table and make the old field optional, deploy:

```typescript
users: defineTable({
  name: v.string(),
  settings: v.optional(
    v.object({
      theme: v.string(),
      notifications: v.boolean(),
    }),
  ),
}),

userSettings: defineTable({
  userId: v.id("users"),
  theme: v.string(),
  notifications: v.boolean(),
}).index("by_userId", ["userId"]),
```

Step 2, dual write. Every mutation that changes settings writes the `userSettings` row (insert or patch via `by_userId`). Readers check `userSettings` first, then fall back to `user.settings`.

Step 3, backfill by inserting one row per user that has no `userSettings` document:

```typescript
migrateOne: async (ctx, user) => {
  if (user.settings === undefined) return;
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  if (existing) return;
  await ctx.db.insert("userSettings", {
    userId: user._id,
    theme: user.settings.theme,
    notifications: user.settings.notifications,
  });
},
```

Step 4, switch readers to `userSettings` only. Remove the dual write.

Step 5, clear `user.settings` with a remove field backfill, delete it from the schema, deploy.

## Merge tables

Combine two tables with overlapping shape into one, usually with a discriminant field or a discriminated union.

Before:

```typescript
admins: defineTable({
  name: v.string(),
  email: v.string(),
  permissions: v.array(v.string()),
}),

customers: defineTable({
  name: v.string(),
  email: v.string(),
  plan: v.string(),
}),
```

Step 1, add the merged table alongside the old ones, deploy:

```typescript
users: defineTable(
  v.union(
    v.object({
      kind: v.literal("admin"),
      name: v.string(),
      email: v.string(),
      permissions: v.array(v.string()),
      legacyId: v.optional(v.id("admins")),
    }),
    v.object({
      kind: v.literal("customer"),
      name: v.string(),
      email: v.string(),
      plan: v.string(),
      legacyId: v.optional(v.id("customers")),
    }),
  ),
)
  .index("by_kind", ["kind"])
  .index("by_email", ["email"]),
```

`legacyId` lets the backfill stay idempotent and lets other tables that reference `admins` or `customers` be repointed later.

Step 2, dual write. New admins and customers are inserted into both the old table and `users`.

Step 3, backfill each old table into `users`. One migration per source table:

```typescript
migrateOne: async (ctx, admin) => {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", admin.email))
    .unique();
  if (existing) return;
  await ctx.db.insert("users", {
    kind: "admin",
    name: admin.name,
    email: admin.email,
    permissions: admin.permissions,
    legacyId: admin._id,
  });
},
```

Step 4, repoint foreign keys. Any table with `adminId: v.id("admins")` gets a new optional `userId: v.id("users")` field, backfilled by looking up `users` via `legacyId`, then the old reference is removed with the "Remove a field" recipe.

Step 5, switch all reads and writes to `users`. Delete every document in `admins` and `customers` (a clearing migration or the dashboard), then remove both tables from the schema and deploy. Finally drop `legacyId` if nothing needs it.

## Add or change an index

Indexes need no data migration. Add the index to the schema, deploy, then start using it in `withIndex`. Convex builds the index during the push. To rename an index, add the new one, switch queries, then remove the old one. Do not change the fields of an existing index name in place; treat it as a new index.
