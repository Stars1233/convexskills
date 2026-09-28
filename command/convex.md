# /convex

OpenCode slash command. Routes a Convex request to the right builder skill and loads only that one.

## Usage

```
/convex create a schema with users and posts
/convex set up file uploads
/convex add a cron job to clean up expired sessions
/convex build an AI agent with tools
/convex add a Stripe webhook endpoint
/convex run a security check before launch
/convex write a PRD for the billing rewrite
/convex sync task.md, changelog.md, and files.md
```

## How to route

Read the request. Pick one skill from the table. Load its `SKILL.md`. Follow any `references/` link it points to. Do not load more than one skill unless the request clearly spans two areas.

| Request mentions | Load |
| --- | --- |
| tables, fields, indexes, validators, `v.` | `convex-schema-validator` |
| query, mutation, action, internal function, `ctx.db` | `convex-functions` |
| `useQuery`, live updates, optimistic UI, presence | `convex-realtime` |
| webhook, REST, `http.ts`, CORS, Stripe, Clerk events | `convex-http-actions` |
| upload, download, image, `_storage` | `convex-file-storage` |
| cron, schedule, `runAfter`, background job | `convex-cron-jobs` |
| rename field, backfill, schema change on live data | `convex-migrations` |
| agent, LLM, thread, tool call, RAG, embeddings | `convex-agents` |
| component, `defineComponent`, publish to npm | `convex-component-authoring` |
| quick security pass, before merge | `convex-security-check` |
| full audit, before launch, threat model | `convex-security-audit` |
| performance, OCC, ESLint plugin, "is this right" | `convex-best-practices` |
| scope creep, "while we're here", extra features | `avoid-feature-creep` |
| PRD, plan, multi step task, task.md | `project-workflow` |
| changelog, files.md, docs out of date, build log | `project-docs` |
| revert, reset, checkout, undo, force push | `git-safety` |
| nothing above fits | `convex` (router) |

## Quick reference

| Type | Database | External APIs | Use for |
| --- | --- | --- | --- |
| `query` | read only | no | reactive reads, cached |
| `mutation` | read and write | no | transactional writes |
| `action` | via `runQuery` / `runMutation` | yes | third party calls |
| `httpAction` | via `runQuery` / `runMutation` | yes | webhooks, REST |

Rules that hold across every skill:

1. Validate `args` and `returns` on every function.
2. `withIndex` over `filter`.
3. Mutations are idempotent. Early return when nothing changes.
4. Schedule `internal.*` functions only, never `api.*`.
5. Fetch https://docs.convex.dev/llms.txt before trusting memory on an API.

## Do not

- Run `npx convex deploy` without an explicit instruction. `npx convex dev` is for development.
- Run git commands that discard work. See `git-safety`.
- Edit anything in `convex/_generated/`.
- Add features the request did not ask for. See `avoid-feature-creep`.

## Install

```bash
npx skills add waynesutton/builder-skills
```

or

```bash
npx @waynesutton/builder-skills install-all --target opencode
```

## References

- Repo: https://github.com/waynesutton/builder-skills
- Convex docs: https://docs.convex.dev/
- Convex llms.txt: https://docs.convex.dev/llms.txt
- Official Convex plugins: https://github.com/get-convex/convex-agent-plugins
