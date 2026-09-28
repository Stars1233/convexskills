# builder-skills

Agent skills for builders shipping Convex apps. This file is context for agents working inside this repo. It also symlinks to `CLAUDE.md`.

## What this repo is

Seventeen skills in `skills/<name>/`. Fourteen cover Convex. Three cover how to run a project: PRD first, docs synced from git evidence, git commands that cannot destroy work. Each skill is a folder with `SKILL.md`, an `agents/openai.yaml` for Codex icons, and sometimes a `references/` folder that the skill loads on demand.

The CLI in `bin/cli.js` installs skills into `.claude/skills`, `.codex/skills`, or `.agents/skills`. Templates in `templates/` are starters a user edits. `scripts/check-skills.mjs` is the lint.

## Docs first

For Convex APIs, fetch https://docs.convex.dev/llms.txt and follow the link for the area. Do not rely on memory for method names, validator names, or component APIs. When a skill cites an API, it was checked against that index; keep it that way.

## Working on skills

- Frontmatter is `name` and `description` only. `name` matches the folder.
- `description` is third person, says what the skill does, and includes a `Use when ...` sentence.
- `SKILL.md` under 300 lines. Hard limit 500. Deep material goes in `references/*.md` and gets linked from the body.
- Code samples use the object form with `args` and `returns` validators, `withIndex` over `filter`, `internal.*` for scheduling.
- No emojis. No em dashes. No marketing words.
- Adding a skill means updating `bin/cli.js`, `index.js`, `.claude-plugin/plugin.json`, the README table, `docs.md`, and adding a symlink in `.codex/skills/`.
- Run `npm run check` before calling anything done. It has to pass.

## Working on this repo

- Non trivial work gets a PRD in `prds/`. See `skills/project-workflow`.
- After a change, sync `task.md`, `changelog.md`, `files.md`. See `skills/project-docs`. Dates come from `git log --date=short`.
- Before any git command that could discard work, see `skills/git-safety`.
- Do not commit, push, publish, tag, or deploy. Print a suggested commit message and stop.

## Layout

```
skills/<name>/SKILL.md          the skill
skills/<name>/references/*.md   loaded on demand from SKILL.md
skills/<name>/agents/openai.yaml Codex icon metadata
bin/cli.js                      builder-skills CLI
index.js                        programmatic API
scripts/check-skills.mjs        lint, run with npm run check
templates/                      starters installed by install-templates
.claude-plugin/                 plugin.json and marketplace.json for Claude Code
.codex/skills/                  symlinks into skills/ for Codex discovery
command/convex.md               OpenCode slash command
prds/                           PRDs for this repo, lessons.md, archive/
```

## Skills

| Skill | Load when |
| --- | --- |
| `convex` | Convex task with no closer match |
| `convex-best-practices` | reviewing patterns, OCC conflicts, ESLint setup |
| `convex-functions` | writing any function in `convex/` |
| `convex-schema-validator` | tables, validators, indexes |
| `convex-realtime` | frontend subscriptions, optimistic updates |
| `convex-http-actions` | webhooks, REST, CORS |
| `convex-file-storage` | uploads, serving, metadata |
| `convex-cron-jobs` | crons, scheduled functions |
| `convex-migrations` | live schema changes, backfills |
| `convex-agents` | AI agents, tools, RAG |
| `convex-component-authoring` | building a component |
| `convex-security-check` | quick pass before merge |
| `convex-security-audit` | full review before launch |
| `avoid-feature-creep` | scope is drifting |
| `project-workflow` | multi step work, PRDs, task.md |
| `project-docs` | syncing changelog, files.md, task.md |
| `git-safety` | any git command that could discard work |
