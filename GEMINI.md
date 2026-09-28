# Convex context for Gemini CLI

Short project context for Gemini CLI when it works in a Convex codebase that uses builder-skills.

## Docs first

Prefer retrieval over memory for Convex APIs. Fetch https://docs.convex.dev/llms.txt and follow the link for the area you are touching:

- functions: queries, mutations, actions, http actions, validation
- database: schemas, reading data, writing data, indexes, pagination
- file storage: upload, serve, store, delete, metadata
- scheduling: cron jobs, scheduled functions
- auth: convex auth, clerk, auth0, authkit
- search: text search, vector search
- agents: getting started, messages, threads, tools, streaming

## Function types

| Type | Database | External APIs | Use for |
| --- | --- | --- | --- |
| `query` | read only | no | reactive reads |
| `mutation` | read and write | no | transactional writes |
| `action` | via `runQuery` / `runMutation` | yes | third party calls |
| `httpAction` | via `runQuery` / `runMutation` | yes | webhooks, REST |

## Rules

1. Validate `args` and `returns` on every function.
2. `withIndex` over `filter`.
3. Mutations are idempotent. Early return when nothing changes.
4. Schedule `internal.*` functions only.
5. Throw `ConvexError` for errors the client should see.

```typescript
import { ConvexError } from "convex/values";

throw new ConvexError({ code: "NOT_FOUND", message: "Resource not found" });
```

## Commands

```bash
npx convex dev        # development, watches and syncs
npx convex codegen    # regenerate types
npx convex logs       # tail logs
npx convex dashboard  # open dashboard
```

Do not run `npx convex deploy` or any git command without an explicit instruction.

## Layout

```
convex/
  _generated/   # generated, do not edit
  schema.ts     # tables and indexes
  http.ts       # http router, exact name required
  crons.ts      # cron definitions
  *.ts          # functions, api.<file>.<name>
```

## Skills

The skills in `skills/` cover each of these areas in depth. Load the one that matches the task. Index: https://github.com/waynesutton/builder-skills
