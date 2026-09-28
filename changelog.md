# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-09-16

Renamed from `@waynesutton/convex-skills` to `@waynesutton/builder-skills`. Convex now ships official skills at get-convex/convex-agent-plugins, so this set is named for who it serves. Every skill was rewritten against the current Anthropic and OpenAI skill authoring guidance.

### Added

- `project-workflow` skill: triage, PRD in `prds/`, `task.md` tracking, docs sync, `prds/lessons.md` loop. Ships `references/prd-template.md`.
- `project-docs` skill: syncs `task.md`, `changelog.md`, `files.md` from git evidence. Convex feature detection rules (a component counts only if `convex.config.ts` registers it) and a redaction pass borrowed from get-convex/convex-hackathon-skill. Ships `references/evidence-rules.md` and `references/convex-detection.md`.
- `git-safety` skill, replacing the `gitrules.md` template. Approval table for destructive commands, "undo means edit" rule, diff before discard.
- `references/` folders for `convex-http-actions`, `convex-migrations`, `convex-cron-jobs`, `convex-security-audit`, `convex-agents`, `convex-best-practices`. Deep material loads on demand instead of in every prompt.
- `.claude-plugin/marketplace.json` so `claude plugins marketplace add waynesutton/builder-skills` works.
- `scripts/check-skills.mjs` and `npm run check`. Verifies frontmatter shape, name matches folder, line budgets, linked references, banned words, stale name references, and that `bin/cli.js`, `index.js`, and `plugin.json` agree with `skills/`. Runs on `prepublishOnly`.
- Templates: `AGENTS.md`, `files.md`, `changelog.md`, `task.md`, `prds/lessons.md` starters. `dev` and `help` now ship as skill folders.
- CLI: `install` takes multiple skills, `--target cursor` and `--target opencode` aliases, `install-templates` symlinks `CLAUDE.md` to `AGENTS.md`.
- `index.js`: `getSkillDir()` and `getSkillMeta()`.
- `prds/` and `task.md` are tracked in git. Finished PRDs moved to `prds/archive/`, `convex-skills-updates-plan.md` renamed `builder-skills-updates-plan.md`. `prds/lessons.md` added.

### Changed

- Package name `@waynesutton/builder-skills`, binary `builder-skills`, plugin `builder-skills`, repo `waynesutton/builder-skills`. Author is Wayne Sutton in every manifest.
- All 14 existing `SKILL.md` files: frontmatter is `name` and `description` only. Descriptions are third person with a `Use when` trigger. Bodies under 300 lines. Boilerplate ESLint and documentation source blocks removed.
- `convex` skill rewritten as a router for all 17 skills.
- CLI `install` copies the whole skill folder so `references/` and `agents/openai.yaml` travel with `SKILL.md`. `--link` symlinks the folder.
- `README.md` rewritten: badge, three install paths, why the skills exist, skills table, how a skill is built.
- `AGENTS.md` cut from 206 to under 80 lines. `CLAUDE.md` still symlinks to it.
- `command/convex.md` is now a routing table for all 17 skills.
- `GEMINI.md`, `.codex/README.md`, `CONTRIBUTING.md`, `docs.md` rewritten for the new name and structure.
- `.gitignore` ignores `.agents/` and no longer ignores `prds/` or `task.md`.

### Removed

- `templates/CLAUDE.md`. `install-templates` links `CLAUDE.md` to `AGENTS.md` instead.
- `templates/skills/dev.md`, `help.md`, `gitrules.md` flat files. Claude Code no longer reads flat skill files.
- `displayName`, `version`, `author`, `tags` frontmatter keys from every skill.
- The unofficial pointer text from `package.json` description. The README carries it instead.

### Fixed

- `bin/cli.js` and `index.js` listed 12 skills while `skills/` held 14. Now 17 and checked by script.
- `.claude-plugin/plugin.json` claimed author Convex and repo get-convex/skills.
- `CONTRIBUTING.md` said MIT and pointed at a Convex security email. It is Apache-2.0 and points at the repo owner.

## [1.0.9] - 2026-02-05

### Changed

- Updated README.md to reference official Convex Agent Plugins repo as the primary resource
- Fixed typo in README heading ("offical" to "official")
- Removed banned word "comprehensive" from README description
- Updated package.json npm description to reference official Convex Agent Plugins

### Added

- Support for `.agents/skills` installs via CLI `--target`
- Optional `--link` flag to symlink SKILL.md files instead of copying

### Changed

- Consolidated `convex-eslint` skill into `convex-best-practices` Code Quality section
- ESLint setup instructions now include config example and rules table in one place
- Updated cross-references in `convex-functions`, README, AGENTS.md, and .codex/README.md

### Removed

- Deleted standalone `skills/convex-eslint/` directory (content merged into convex-best-practices)
- Removed `convex-eslint` from SKILLS constants in index.js and bin/cli.js

### Fixed

- Removed unsupported frontmatter fields from `skills/convex-best-practices/SKILL.md` to avoid Pi skill parser conflicts

## [1.0.7] - 2026-02-02

### Added

- Codex skill icons via `agents/openai.yaml` in every skill folder
- `assets/small-logo.svg` and `assets/large-logo.png` for Codex UI display

## [1.0.6] - 2026-02-02

### Added

- Retrieval-led reasoning pattern in AGENTS.md, CLAUDE.md, and GEMINI.md
  - Compressed Convex docs index pointing to https://docs.convex.dev/llms.txt
  - Instruction to prefer retrieval over pre-training for Convex tasks
- Quick Reference section with common code patterns (function syntax, schema, queries)
- `prds/how-it-works.md`: Internal documentation explaining AGENTS.md vs Skills approach
- Dual-approach architecture: passive context (AGENTS.md) + on-demand skills

### Changed

- Updated AGENTS.md with Convex Documentation Index section
- Updated CLAUDE.md with matching documentation index
- Updated GEMINI.md with llms.txt reference and retrieval instruction

### Fixed

- Added missing convex-eslint to bin/cli.js SKILLS object

### Notes

Based on Vercel's research showing AGENTS.md with docs index achieves 100% pass rate vs 53% for skills alone.
See: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals

## [1.0.5] - 2026-02-02

### Added

- `skills/convex-eslint/SKILL.md`: ESLint compliance skill for writing linter-clean Convex code
  - Covers all four @convex-dev/eslint-plugin rules
  - Setup instructions for eslint.config.js
  - Code examples for each rule (no-old-registered-function-syntax, require-argument-validators, explicit-table-ids, import-wrong-runtime)
- `.codex/README.md`: Codex CLI integration instructions
- Code Quality sections in `convex-functions` and `convex-best-practices` skills
- Linting section in `templates/CLAUDE.md`
- Code Quality section in `README.md`

### Changed

- Updated all db.get, db.patch, db.delete, db.replace calls in skills to use explicit table names
- Updated `README.md` Available Skills table to include convex-eslint
- Updated `AGENTS.md` and `CLAUDE.md` to include convex-eslint in skills list
- Updated `index.js` SKILLS constant with convex-eslint
- Updated `package.json` version to 1.0.5, added eslint and linting keywords
- Updated `files.md` to document convex-eslint skill and .codex directory
- Updated repository structure in README to include .codex folder

## [1.0.4] - 2026-01-14

### Added

- Template skills for developers who fork the repository
  - `templates/skills/README.md`: Installation and usage guide
  - `templates/skills/dev.md`: Full-stack development practices template
  - `templates/skills/help.md`: Problem-solving methodology template
  - `templates/skills/gitrules.md`: Git safety protocols template
- `files.md`: Codebase structure reference
- `task.md`: Completed task tracking
- `docs.md`: Documentation index
- `skills/convex/SKILL.md`: Umbrella skill indexing all Convex skills

### Changed

- Updated `README.md` with templates section and repository structure

### Fixed

- Skill `name` field now matches folder name for `/skill` commands to work
  - Changed from human readable (e.g., `Convex Best Practices`) to kebab-case (e.g., `convex-best-practices`)
  - Added `displayName` field for human readable names
  - Affects all 12 Convex skill files

## [1.0.0] - 2026-01-14

### Added

- Initial repository structure mirroring getsentry/skills pattern
- 9 core Convex skills:
  - `convex-best-practices`: Production-ready app guidelines, error handling, OCC
  - `convex-functions`: Queries, mutations, actions, HTTP actions
  - `convex-realtime`: Reactive patterns, subscriptions, optimistic updates
  - `convex-schema-validator`: Schema definition, typing, validation, migrations
  - `convex-file-storage`: File upload, storage, serving, metadata
  - `convex-agents`: AI agents with thread management and tools
  - `convex-security-check`: Quick security audit checklist
  - `convex-security-audit`: Deep security review patterns
  - `convex-component-authoring`: Creating reusable Convex components
- Skill template following Anthropic approved format
- Terminal UI for skill browsing with amber/gold tree design
- GEMINI.md for Gemini CLI integration
- agents.md specification for Convex agents
- CLAUDE.md template for Convex projects
- Future skills exploration document
- OpenCode plugin for Convex sync:
  - Plugin hooks for session, file, and tool events
  - Custom tools (schema_suggest, function_test, migration_plan)
  - Agent templates (convex-build.md, convex-debug.md)
  - Command templates (convex-init, convex-deploy, convex-logs)
  - Installation script
- Phase 3 documentation recommendations for Convex docs
- Phase 4 documentation recommendations for convex.dev/ai
- Project tracking files (files.md, changelog.md)
- README.md with installation instructions
- CONTRIBUTING.md with guidelines
- MIT License
