# Documentation index

Where everything in this repo is documented.

## Start here

| Document | Purpose |
| --- | --- |
| [README.md](README.md) | What this is, install paths, skills table, why |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Skill rules, how to add a skill, `npm run check` |
| [LICENSE](LICENSE) | Apache-2.0 |

## Agent context

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Context for agents working in this repo. `CLAUDE.md` symlinks here. |
| [GEMINI.md](GEMINI.md) | Gemini CLI context for Convex projects |
| [command/convex.md](command/convex.md) | OpenCode `/convex` slash command with a routing table |
| [.codex/README.md](.codex/README.md) | How Codex finds skills through `.codex/skills/` symlinks |

## Skills

Fourteen Convex skills, three workflow skills. Each is `skills/<name>/SKILL.md`. Some have `references/` loaded on demand.

| Skill | Use when | References |
| --- | --- | --- |
| [convex](skills/convex/SKILL.md) | Convex task with no closer match | |
| [convex-best-practices](skills/convex-best-practices/SKILL.md) | Reviewing patterns, OCC, ESLint plugin | eslint-setup |
| [convex-functions](skills/convex-functions/SKILL.md) | Any function in `convex/` | |
| [convex-schema-validator](skills/convex-schema-validator/SKILL.md) | Tables, validators, indexes | |
| [convex-realtime](skills/convex-realtime/SKILL.md) | Subscriptions, optimistic updates | |
| [convex-http-actions](skills/convex-http-actions/SKILL.md) | Webhooks, REST, CORS | webhooks, rest-and-cors |
| [convex-file-storage](skills/convex-file-storage/SKILL.md) | Uploads, serving, metadata | |
| [convex-cron-jobs](skills/convex-cron-jobs/SKILL.md) | Crons, scheduled functions | scheduling-patterns, cron-recipes |
| [convex-migrations](skills/convex-migrations/SKILL.md) | Live schema changes | migration-patterns, migrations-component |
| [convex-agents](skills/convex-agents/SKILL.md) | AI agents, tools, RAG | tools-and-streaming, rag-and-workflows |
| [convex-component-authoring](skills/convex-component-authoring/SKILL.md) | Building a component | publishing |
| [convex-security-check](skills/convex-security-check/SKILL.md) | Quick pass before merge | |
| [convex-security-audit](skills/convex-security-audit/SKILL.md) | Full review before launch | authorization-patterns, attack-surface, audit-report-template |
| [avoid-feature-creep](skills/avoid-feature-creep/SKILL.md) | Scope is drifting | |
| [project-workflow](skills/project-workflow/SKILL.md) | Multi step work, PRDs, task.md | prd-template |
| [project-docs](skills/project-docs/SKILL.md) | Sync changelog, files.md, task.md | evidence-rules, convex-detection |
| [git-safety](skills/git-safety/SKILL.md) | Git commands that could discard work | |

## Templates

Installed into a user's project by `builder-skills install-templates`. Nothing is overwritten.

| Template | Lands at |
| --- | --- |
| [templates/AGENTS.md](templates/AGENTS.md) | `AGENTS.md`, with `CLAUDE.md` symlinked to it |
| [templates/files.md](templates/files.md) | `files.md` |
| [templates/changelog.md](templates/changelog.md) | `changelog.md` |
| [templates/task.md](templates/task.md) | `task.md` |
| [templates/prds/lessons.md](templates/prds/lessons.md) | `prds/lessons.md` |
| [templates/skills/dev/](templates/skills/dev/SKILL.md) | `.claude/skills/dev/` |
| [templates/skills/help/](templates/skills/help/SKILL.md) | `.claude/skills/help/` |
| [templates/skills/README.md](templates/skills/README.md) | not installed, explains the two skill templates |

## Tooling

| File | Purpose |
| --- | --- |
| [bin/cli.js](bin/cli.js) | `builder-skills` CLI |
| [index.js](index.js) | Programmatic API |
| [scripts/check-skills.mjs](scripts/check-skills.mjs) | Lint. `npm run check`. Runs before publish. |
| [.claude-plugin/plugin.json](.claude-plugin/plugin.json) | Claude Code plugin manifest |
| [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) | Marketplace manifest for `claude plugins marketplace add` |

## Project tracking

| Document | Purpose |
| --- | --- |
| [changelog.md](changelog.md) | Keep a Changelog, dates from git |
| [files.md](files.md) | One line per file |
| [task.md](task.md) | To Do / In Progress / Completed |
| [prds/](prds/) | One PRD per non trivial change. `lessons.md`. `archive/` for old ones. |

## External

| Resource | URL |
| --- | --- |
| Convex docs | https://docs.convex.dev/ |
| Convex llms.txt | https://docs.convex.dev/llms.txt |
| Official Convex skills | https://github.com/get-convex/convex-agent-plugins |
| Anthropic Agent Skills | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview |
| OpenAI skills guidance | https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra |
| skills.sh | https://skills.sh |
