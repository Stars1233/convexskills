# Project context

[Project name]. [One sentence on what it does and who uses it.]

Stack: Convex (backend), [React / Next.js / Vite / Expo] (frontend), [auth provider], [email provider].

## Docs first

For any Convex API, fetch https://docs.convex.dev/llms.txt and follow the link for the area before relying on memory. The skills in `.claude/skills/` (or `.agents/skills/`) cover each area in depth. Load the one that matches the task.

## Commands

```bash
npx convex dev                 # development. watches, syncs, regenerates types
npx convex dev --once          # single sync
npx convex run file:fn '{}'    # run a function with args
npx convex logs                # tail logs
npx convex dashboard           # open dashboard
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint with @convex-dev/eslint-plugin
```

Do not run `npx convex deploy`, `git commit`, `git push`, or any publish command unless the current message asks for it.

## Layout

```
convex/
  _generated/     generated, never edit, commit to git
  schema.ts       tables, validators, indexes
  http.ts         http router (exact name required)
  crons.ts        cron jobs
  convex.config.ts components registered with app.use
  <feature>.ts    functions, referenced as api.<feature>.<name>
src/              frontend
prds/             one PRD per non trivial change, plus lessons.md
files.md          what each file is for
changelog.md      Keep a Changelog, dates from git log
task.md           To Do / In Progress / Completed
```

## Rules that hold everywhere

1. Every function uses the object form with `args` and `returns` validators. `returns: v.null()` when nothing comes back.
2. `withIndex` over `filter`. Index names list their fields: `by_user_and_status`.
3. Mutations are idempotent. Early return when the doc is already in the target state. Patch without reading first when possible.
4. Schedule `internal.*` functions only. Never `api.*`.
5. No `Date.now()` inside a query. Pass time as an argument.
6. `"use node"` only in action files that need Node APIs. No queries or mutations in those files.
7. Throw `ConvexError` for errors the client should see.
8. Keep `query` / `mutation` / `action` wrappers thin. Logic lives in plain functions.

## Workflow

- Non trivial work starts with a PRD in `prds/`. Load the `project-workflow` skill.
- After a change lands, sync `task.md`, `changelog.md`, `files.md`. Load the `project-docs` skill.
- Before any git command that could discard work, load the `git-safety` skill.
- The request sets the scope. Extra ideas go in the summary, not the diff. Load `avoid-feature-creep` if unsure.

## Style

- No emojis. No em dashes.
- Site design system for modals, alerts, confirmations. Never `window.confirm` or `alert`.
- No placeholder text or images. Everything renders real data from Convex.
- Short comments that say what a block is for.
- Type safe. No `any`.

## Project notes

[Business rules, naming conventions, architecture decisions, things that bit you before.]
