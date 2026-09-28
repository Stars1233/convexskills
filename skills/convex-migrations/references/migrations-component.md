# Migrations component

How to install, define, run, check, and cancel migrations with `@convex-dev/migrations`. The component stores progress per migration, so runs are resumable and completed migrations are skipped.

## Install

```bash
npm install @convex-dev/migrations
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp();
app.use(migrations);
export default app;
```

Run `npx convex dev` once so `components.migrations` appears in `_generated/api`.

```typescript
// convex/migrations.ts
import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);
```

The `DataModel` type parameter gives `migrateOne` a typed document for the table you name.

## Define a migration

`migrateOne` receives one document. The component handles pagination, batching, and scheduling the next batch.

```typescript
export const addDefaultRole = migrations.define({
  table: "users",
  migrateOne: async (ctx, user) => {
    if (user.role === undefined) {
      await ctx.db.patch(user._id, { role: "user" });
    }
  },
});
```

Returning an object applies it as a patch:

```typescript
export const clearLegacyField = migrations.define({
  table: "users",
  migrateOne: () => ({ legacyField: undefined }),
});
```

Keep `migrateOne` idempotent. A rerun after a failure or a `reset` should not double apply.

### Options

Smaller batches for large documents or hot tables:

```typescript
export const migrateHeavyTable = migrations.define({
  table: "largeDocuments",
  batchSize: 10,
  migrateOne: async (ctx, doc) => {
    // conversion
  },
});
```

Only touch documents matched by an index:

```typescript
export const fixEmptyNames = migrations.define({
  table: "users",
  customRange: (query) => query.withIndex("by_name", (q) => q.eq("name", "")),
  migrateOne: () => ({ name: "unknown" }),
});
```

Process a batch in parallel when order does not matter:

```typescript
export const clearField = migrations.define({
  table: "myTable",
  parallelize: true,
  migrateOne: () => ({ optionalField: undefined }),
});
```

## Run from the CLI

The function returned by `migrations.define` is callable directly. No separate runner is needed for a single migration.

```bash
# dev deployment
npx convex run migrations:addDefaultRole

# production
npx convex run migrations:addDefaultRole --prod
```

### Dry run

Runs one batch, then rolls the transaction back. Nothing is written. Use this before every production run.

```bash
npx convex run migrations:addDefaultRole '{"dryRun": true}'
```

### Restart from the beginning

```bash
npx convex run migrations:addDefaultRole '{"reset": true}'
```

## Run several in order

Ad hoc, by passing `next`:

```bash
npx convex run migrations:addDefaultRole '{"next":["migrations:clearLegacyField","migrations:normalizeEmails"]}'
```

Reusable, with a runner:

```typescript
export const runAll = migrations.runner([
  internal.migrations.addDefaultRole,
  internal.migrations.clearLegacyField,
  internal.migrations.normalizeEmails,
]);
```

```bash
npx convex run migrations:runAll
```

If one fails the series stops. Calling it again resumes from the failed migration. Completed ones are skipped.

A general runner that takes the migration name as an argument:

```typescript
export const run = migrations.runner();
```

```bash
npx convex run migrations:run '{"fn": "migrations:addDefaultRole"}'
```

## Run from another Convex function

```typescript
await migrations.runOne(ctx, internal.migrations.addDefaultRole);

await migrations.runSerially(ctx, [
  internal.migrations.addDefaultRole,
  internal.migrations.clearLegacyField,
]);
```

## Check status

```bash
npx convex run --component migrations lib:getStatus --watch
```

Shows each migration's cursor, processed count, and whether it is running, done, or failed.

## Cancel

```bash
npx convex run --component migrations lib:cancel '{"name": "migrations:addDefaultRole"}'
```

```typescript
await migrations.cancel(ctx, internal.migrations.addDefaultRole);
```

## Run on deploy

Only in a CI or release script, never during development:

```bash
npx convex deploy --cmd 'npm run build' && npx convex run migrations:runAll --prod
```

## Docs

- https://www.convex.dev/components/migrations
- https://docs.convex.dev/components
- https://stack.convex.dev/migrating-data-with-mutations
