# Tasks

Three sections. Items move down as they land. An item moves to Completed only after its verification step ran. Timestamps in `YYYY-MM-DD HH:mm UTC`.

## To Do

Owner steps. The agent does not run these.

- [ ] Fix the case of `AGENTS.md` in git. Git tracks it as `agents.md`; `CLAUDE.md -> AGENTS.md` and `package.json` `files` both expect uppercase, so the symlink is broken on GitHub and Linux. Run `git mv agents.md AGENTS.md` before committing. macOS hides this locally.
- [ ] Review the diff. `git status`, `git diff --stat`, read README and the three workflow skills first.
- [ ] Rename the GitHub repo to `builder-skills`. Update the remote: `git remote set-url origin git@github.com:waynesutton/builder-skills.git`.
- [ ] Commit and push `main`.
- [ ] `npm publish --access public` for `@waynesutton/builder-skills` 2.0.0.
- [ ] `npm deprecate @waynesutton/convex-skills "Renamed to @waynesutton/builder-skills"`.
- [ ] Test `npx skills add waynesutton/builder-skills` in a scratch project.
- [ ] Test `claude plugins marketplace add waynesutton/builder-skills` then `claude plugins install builder-skills@waynesutton`.
- [ ] Claim https://skills.sh/waynesutton/builder-skills so the README badge resolves.
- [ ] Update the GitHub repo description and topics. Update the link on waynesutton.ai.
- [ ] Optional: rename the local folder to `builder-skills`.

## In Progress

## Completed

- [x] 2026-09-16 02:20 UTC Rename to builder-skills and rewrite every skill. `prds/builder-skills-rename.md`. Files: `package.json`, `bin/cli.js`, `index.js`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (new), `.gitignore`, `.npmignore`, `scripts/check-skills.mjs` (new), all 14 `skills/*/SKILL.md`, 13 new `references/*.md`, 3 new skills (`project-workflow`, `project-docs`, `git-safety`) with `agents/` and `assets/`, 3 new `.codex/skills/` symlinks, `templates/` restructured (5 starters, `dev` and `help` as folders, `CLAUDE.md` and flat skill files removed), `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `GEMINI.md`, `docs.md`, `command/convex.md`, `.codex/README.md`, `changelog.md`, `files.md`, `task.md`, `prds/lessons.md` (new), `prds/archive/` (3 finished PRDs moved, `convex-skills-updates-plan.md` renamed `builder-skills-updates-plan.md`). Verified: `node bin/cli.js list` prints 17; `install-templates` into `/tmp/bs-test` creates 8 files and skips all 8 on rerun; `install-all --target cursor` writes 17 folders with references to `.cursor/skills`; `npm run check` exits 0; every `SKILL.md` under 300 lines; no old name outside `changelog.md` and `prds/`.

## Earlier work (1.x)

Kept for history. Details in `changelog.md`.

- [x] 2026-02-05 README and npm description point at official Convex Agent Plugins
- [x] 2026-02-05 Consolidated `convex-eslint` into `convex-best-practices`
- [x] 2026-02-03 `.agents/skills` install target and `--link` flag
- [x] 2026-02-02 Removed unsupported frontmatter fields for Pi skill parser
- [x] 2026-02-02 Codex skill icons via `agents/openai.yaml`
- [x] 2026-02-02 Retrieval led reasoning and llms.txt index in AGENTS.md, CLAUDE.md, GEMINI.md
- [x] 2026-01-23 Skill `name` field matches folder name so slash commands resolve
- [x] 2026-01-18 OpenCode slash command support
- [x] 2026-01-17 AI agents as stakeholders in `avoid-feature-creep`
- [x] 2026-01-14 Initial 12 skills, templates, CLAUDE.md strategy, docs index
