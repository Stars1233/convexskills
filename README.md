# builder-skills

[![skills.sh](https://skills.sh/b/waynesutton/builder-skills)](https://skills.sh/waynesutton/builder-skills)
[![npm](https://img.shields.io/npm/v/@waynesutton/builder-skills)](https://www.npmjs.com/package/@waynesutton/builder-skills)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Agent skills for builders shipping Convex apps. By [Wayne Sutton](https://waynesutton.ai).

Seventeen skills. Fourteen teach an agent how to build on [Convex](https://convex.dev) the way the docs say to: validators on every function, indexes over filters, idempotent mutations, HTTP actions that verify signatures, migrations that do not take the app down. Three teach it how to run a project: write a PRD before touching code, keep `task.md`, `changelog.md`, and `files.md` true from git evidence, and never run a git command that can destroy work.

They work with Claude Code, Codex, Cursor, OpenCode, and anything else that reads a `SKILL.md`.

Looking for the official Convex skills? Those are at [get-convex/convex-agent-plugins](https://github.com/get-convex/convex-agent-plugins). This repo is my opinionated set, tuned for how I build.

## Install

Three ways in. Pick one.

<details open>
<summary><strong>skills.sh (any agent, editable files)</strong></summary>

```bash
npx skills add waynesutton/builder-skills
```

The installer asks which skills you want and which agents to install them for. It writes ordinary files into your repo that you can edit. Pull my updates later with `npx skills update`.

</details>

<details>
<summary><strong>Claude Code plugin (managed, auto updates)</strong></summary>

```bash
claude plugins marketplace add waynesutton/builder-skills
claude plugins install builder-skills@waynesutton
```

Or inside a session:

```
/plugin marketplace add waynesutton/builder-skills
/plugin install builder-skills@waynesutton
```

</details>

<details>
<summary><strong>npm CLI (pick your target folder)</strong></summary>

```bash
npx @waynesutton/builder-skills install-all
npx @waynesutton/builder-skills install-all --target codex
npx @waynesutton/builder-skills install-all --target cursor
npx @waynesutton/builder-skills install convex-functions project-workflow
npx @waynesutton/builder-skills install-templates
```

`--target` takes `claude` (default, `.claude/skills`), `codex` (`.codex/skills`), `cursor` (`.cursor/skills`), `agents` or `opencode` (`.agents/skills`), or any path. Add `--link` to symlink instead of copy.

</details>

## Then run `install-templates`

```bash
npx @waynesutton/builder-skills install-templates
```

This drops five starter files at your project root and two editable skills in `.claude/skills/`:

| File | What it is |
| --- | --- |
| `AGENTS.md` (+ `CLAUDE.md` symlink) | Stack, commands, rules, and a pointer to the skills |
| `files.md` | One line per file. What it is for. |
| `changelog.md` | Keep a Changelog. Dates from `git log`, never invented. |
| `task.md` | To Do / In Progress / Completed with UTC timestamps |
| `prds/lessons.md` | One line per lesson learned. Read at session start. |
| `.claude/skills/dev/` | House style. Edit it. |
| `.claude/skills/help/` | Root cause first, confidence bar, what not to touch. Edit it. |

Nothing existing gets overwritten.

## Why these exist

I build with Convex every day and I got tired of the same three failures.

**The agent forgets the Convex rules.** It writes `filter` instead of `withIndex`. It skips the `returns` validator. It schedules `api.*` instead of `internal.*`. It puts `Date.now()` in a query and wonders why the cache never hits. The `convex-*` skills fix that. Each one is short, points at https://docs.convex.dev/llms.txt for the current API, and pushes deep material into `references/` so the agent only loads what the task needs.

**The agent starts coding before it knows what it is building.** `project-workflow` makes it triage first, write a two screen PRD in `prds/`, track the work in `task.md`, and record a lesson when the same correction happens twice.

**The docs drift from the code.** `project-docs` reads `git log` and the working tree, then updates `changelog.md`, `files.md`, and `task.md` from what shipped. It refuses to log a Convex component that is not registered in `convex.config.ts`, and it scans for secrets before saving. The evidence rules borrow from [get-convex/convex-hackathon-skill](https://github.com/get-convex/convex-hackathon-skill).

And one more that cost me two days once: `git-safety`. No `reset --hard`, `checkout -- .`, `clean -fd`, or `stash drop` without the user saying yes to that exact command. "Undo" means edit the file, not check it out.

## How I build with these

The loop is short. Ask for the change. The agent writes a PRD in `prds/`, builds against it, and moves the task through `task.md`. When it lands, `/project-docs` reads the git evidence and updates the three docs. Then I commit with the message it prints.

A project run this way ends up with four things next to the code:

```
prds/          one PRD per non trivial change, plus lessons.md
task.md        what is queued, in flight, and done, with UTC timestamps
changelog.md   what shipped, dated from git log
files.md       what every file is for
```

[waynesutton-ai](https://github.com/waynesutton/waynesutton-ai) is the live example. This repo runs the same loop on itself.

## Skills

### Convex

| Skill | Use when |
| --- | --- |
| [convex](skills/convex/SKILL.md) | Convex task with no closer match. Routes to the rest. |
| [convex-best-practices](skills/convex-best-practices/SKILL.md) | Reviewing patterns, OCC conflicts, ESLint plugin setup |
| [convex-functions](skills/convex-functions/SKILL.md) | Writing queries, mutations, actions, internal functions |
| [convex-schema-validator](skills/convex-schema-validator/SKILL.md) | Tables, validators, indexes, relationships |
| [convex-realtime](skills/convex-realtime/SKILL.md) | Frontend subscriptions, optimistic updates, presence |
| [convex-http-actions](skills/convex-http-actions/SKILL.md) | Webhooks, REST routes, CORS, auth headers |
| [convex-file-storage](skills/convex-file-storage/SKILL.md) | Uploads, serving, metadata, deletion |
| [convex-cron-jobs](skills/convex-cron-jobs/SKILL.md) | Cron jobs, scheduled functions, batching |
| [convex-migrations](skills/convex-migrations/SKILL.md) | Live schema changes and backfills |
| [convex-agents](skills/convex-agents/SKILL.md) | AI agents, tools, streaming, RAG, workflows |
| [convex-component-authoring](skills/convex-component-authoring/SKILL.md) | Building and publishing a component |
| [convex-security-check](skills/convex-security-check/SKILL.md) | Ten minute pass before merge |
| [convex-security-audit](skills/convex-security-audit/SKILL.md) | Full review before launch |

### Workflow

| Skill | Use when |
| --- | --- |
| [project-workflow](skills/project-workflow/SKILL.md) | Multi step work. PRD first, task.md, lessons loop. |
| [project-docs](skills/project-docs/SKILL.md) | Syncing changelog, files.md, task.md from git evidence |
| [git-safety](skills/git-safety/SKILL.md) | Any git command that could discard work |
| [avoid-feature-creep](skills/avoid-feature-creep/SKILL.md) | Scope is drifting past the request |

## How a skill is built

```
skills/convex-http-actions/
  SKILL.md                    under 300 lines. decision guide, one canonical example, mistakes, checklist
  references/webhooks.md      loaded only when the task is a webhook
  references/rest-and-cors.md loaded only when the task is a REST route
  agents/openai.yaml          icon metadata for Codex
  assets/                     icons
```

Frontmatter is `name` and `description` only. The description is third person and ends with a `Use when ...` sentence, because that is what the agent reads to decide whether to load the skill. Everything else is progressive disclosure: metadata always, body on match, references on demand.

This follows the guidance in Anthropic's [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and OpenAI's [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): short routers over long itineraries, triggers in the description, deep content one hop away.

## Programmatic use

```js
import { listSkills, getSkill, getSkillMeta, SKILLS } from "@waynesutton/builder-skills";

listSkills();                       // ["avoid-feature-creep", "convex", ...]
getSkillMeta("convex-functions");   // { name, description }
getSkill("git-safety");             // raw SKILL.md
```

## Repo layout

```
skills/            the 17 skills
templates/         starters installed by install-templates
bin/cli.js         builder-skills CLI
index.js           programmatic API
scripts/           check-skills.mjs, run with npm run check
.claude-plugin/    plugin.json and marketplace.json
.codex/skills/     symlinks into skills/ so Codex finds them in this repo
command/convex.md  OpenCode slash command
prds/              PRDs for this repo and lessons.md
AGENTS.md          agent context for this repo (CLAUDE.md symlinks here)
GEMINI.md          Gemini CLI context
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Short version: keep `SKILL.md` under 300 lines, frontmatter is `name` + `description`, every reference file is linked, `npm run check` passes.

## Related

- [Convex docs](https://docs.convex.dev) and [llms.txt](https://docs.convex.dev/llms.txt)
- [get-convex/convex-agent-plugins](https://github.com/get-convex/convex-agent-plugins), the official Convex skills
- [get-convex/convex-hackathon-skill](https://github.com/get-convex/convex-hackathon-skill), evidence based build logs
- [mattpocock/skills](https://github.com/mattpocock/skills), the repo whose shape this one borrows
- [waynesutton/markdown-site](https://github.com/waynesutton/markdown-site), the Convex publishing framework behind waynesutton.ai
- [skills.sh](https://skills.sh), the installer

## License

Apache-2.0. See [LICENSE](LICENSE).
