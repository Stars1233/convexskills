# Files

One line per file that matters. What it is for, not how it works.

## Root

- `README.md` what this is, three install paths, why the skills exist, skills table, how a skill is built
- `AGENTS.md` context for agents working in this repo: layout, skill authoring rules, workflow, 17 skill table
- `CLAUDE.md` symlink to `AGENTS.md`
- `GEMINI.md` Gemini CLI context for Convex projects
- `CONTRIBUTING.md` skill rules, how to add a skill, `npm run check`
- `docs.md` index of every document, skill, template, and tool in the repo
- `changelog.md` Keep a Changelog, dates from `git log`
- `files.md` this file
- `task.md` To Do / In Progress / Completed with UTC timestamps
- `LICENSE` Apache-2.0
- `package.json` `@waynesutton/builder-skills` 2.0.0, binary `builder-skills`, `check` and `prepublishOnly` scripts
- `index.js` programmatic API: `listSkills`, `getSkill`, `getSkillPath`, `getSkillDir`, `getSkillMeta`, `SKILLS`
- `.gitignore` ignores node_modules, env files, `.claude/`, `.cursor/`, `.opencode/`, `.agents/`. `prds/` and `task.md` are tracked.
- `.npmignore` keeps agent config folders, `prds/`, `scripts/`, and repo only docs out of the npm package

## bin/

- `cli.js` `builder-skills` CLI: `list`, `install <skills...>`, `install-all`, `install-templates`, `show`, `path`. `--target claude|codex|agents|cursor|opencode|<path>`, `--dir`, `--link`. Copies whole skill folders.

## scripts/

- `check-skills.mjs` lint. Frontmatter is `name` + `description`, name matches folder, line budgets, references linked, banned words, no stale old name, CLI / index / plugin.json agree with `skills/`. `npm run check`.

## .claude-plugin/

- `plugin.json` Claude Code plugin manifest, `builder-skills` 2.0.0, lists all 17 skills
- `marketplace.json` marketplace manifest so `claude plugins marketplace add waynesutton/builder-skills` works

## .codex/

- `README.md` how Codex discovers skills in this repo
- `skills/<name>` one symlink per skill into `../../skills/<name>`

## command/

- `convex.md` OpenCode `/convex` slash command. Routing table for all 17 skills, rules that hold everywhere, install.

## skills/

Each folder: `SKILL.md`, `agents/openai.yaml` (Codex icon metadata), `assets/` (icons). Some have `references/` loaded on demand from links in `SKILL.md`.

### Convex

- `convex/SKILL.md` router. Table of all skills with load triggers, rules that hold everywhere, do not list.
- `convex-best-practices/SKILL.md` production patterns, OCC and write conflicts, pagination over collect, thin wrappers
  - `references/eslint-setup.md` `@convex-dev/eslint-plugin` install, flat config, rule list
- `convex-functions/SKILL.md` query / mutation / action / internal decision table, object form, validators, reads, writes, runtime boundaries, ConvexError
- `convex-schema-validator/SKILL.md` defineSchema, validator table, discriminated unions, index naming, relationships, limits
- `convex-realtime/SKILL.md` subscriptions, useQuery loading state, usePaginatedQuery, optimistic updates, avoiding churn, presence
- `convex-http-actions/SKILL.md` http.ts router skeleton, httpAction vs mutation, calling internal functions, one webhook example
  - `references/webhooks.md` Stripe, Clerk, Resend, generic HMAC, idempotency by event id
  - `references/rest-and-cors.md` path params, CORS preflight, bearer auth, streaming and file responses
- `convex-file-storage/SKILL.md` upload URLs, storing from actions, getUrl, HTTP serving, `_storage` metadata, deletion
- `convex-cron-jobs/SKILL.md` crons.ts with interval and cron only, runAfter vs runAt, internal.* rule, one batched job
  - `references/scheduling-patterns.md` self rescheduling batches, retry with backoff, cancel, inspect `_scheduled_functions`
  - `references/cron-recipes.md` digest email, expire sessions, aggregate stats, external sync
- `convex-migrations/SKILL.md` the safe sequence, hand rolled batched backfill, when to use the component, reading deploy errors
  - `references/migration-patterns.md` rename, change type, split, merge, add required field, remove field
  - `references/migrations-component.md` `@convex-dev/migrations` install, define, run, status, dry run
- `convex-agents/SKILL.md` `@convex-dev/agent` install, Agent definition, threads, generating replies from actions, one tool
  - `references/tools-and-streaming.md` createTool, tools calling queries and mutations, streaming, tool errors
  - `references/rag-and-workflows.md` embeddings, vector index, retrieval, `@convex-dev/rag`, `@convex-dev/workflow`
- `convex-component-authoring/SKILL.md` when a component fits, folder layout, defineComponent, app.use, client wrapper, parent table rule
  - `references/publishing.md` package.json exports, build, README shape, versioning
- `convex-security-check/SKILL.md` ten minute checklist in groups with rg commands, one fix example, handoff to audit
- `convex-security-audit/SKILL.md` audit procedure as numbered steps, severity scale, example finding
  - `references/authorization-patterns.md` getCurrentUser, customQuery / customMutation wrappers, ownership via indexes, roles
  - `references/attack-surface.md` HTTP exposure, storage URL leakage, scheduled trust, rate limiting, secrets, client IDs
  - `references/audit-report-template.md` findings template and per table data access matrix

### Workflow

- `avoid-feature-creep/SKILL.md` the request sets the scope, creep signals, what to do instead, stakeholder framing
- `project-workflow/SKILL.md` triage, PRD, task.md tracking, docs sync handoff, execution style, lessons loop
  - `references/prd-template.md` the PRD layout with notes on filling it in
- `project-docs/SKILL.md` sync task.md / changelog.md / files.md from git evidence, Convex detection, redaction, boundaries, report format
  - `references/evidence-rules.md` strong vs weak vs not evidence, deriving facts, idempotency check, conflicts
  - `references/convex-detection.md` which file proves which Convex feature, components via convex.config.ts, AI claims, deployment
- `git-safety/SKILL.md` status first, approval table for destructive commands, revert and undo mean edit, diff before discard, safe defaults

## templates/

Installed into a user's project by `builder-skills install-templates`. Nothing existing is overwritten.

- `AGENTS.md` project context starter: stack, commands, layout, rules, workflow, style. `CLAUDE.md` gets symlinked to it.
- `files.md` starter with root, convex/, src/, prds/ sections
- `changelog.md` starter with Unreleased and a first version block
- `task.md` starter with To Do / In Progress / Completed
- `prds/lessons.md` starter with one example lesson
- `skills/README.md` explains the two editable skill templates and how to install them for each agent
- `skills/dev/SKILL.md` house style skill: core, Convex mutation rules, React, design, code, docs, communication. Meant to be edited.
- `skills/help/SKILL.md` reflect before acting, confidence bar, scope rules, UI, docs policy, git handoff. Meant to be edited.

## prds/

- `builder-skills-rename.md` PRD for the 2.0.0 rename and skill rewrite
- `builder-skills-updates-plan.md` running plan for skill updates, renamed from the 1.x name
- `lessons.md` one line per lesson for this repo
- `how-it-works.md` how skills load across Claude Code, Codex, Cursor, OpenCode
- `skillsplan.md` the original 1.x skill plan
- `future-skills-exploration.md` candidate skills not yet built
- `create-convex-opencode-integration.md` how the OpenCode `/convex` command came together
- `CLAUDE-MD-STRATEGY.md` why `CLAUDE.md` symlinks to `AGENTS.md`
- `archive/` finished or superseded: marketplace submission, Convex docs recommendations, convex.dev AI site recommendations

## .opencode/

Local OpenCode config from an earlier experiment (markdown publishing framework). Not tracked. Not part of the package.
