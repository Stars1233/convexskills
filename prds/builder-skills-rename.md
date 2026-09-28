# Rename convex-skills to builder-skills and rewrite every skill

Created: 2026-09-16 01:30 UTC
Last Updated: 2026-09-16 02:25 UTC
Status: Done (owner steps remain in task.md)

## Problem

The package is called `@waynesutton/convex-skills` and the repo `waynesutton/convexskills`. Convex now ships official skills at `get-convex/convex-agent-plugins`, so the name reads as a second official set and sends people to the wrong place. The skills themselves also predate the current authoring guidance from Anthropic and OpenAI: five are over 500 lines, all carry non standard frontmatter keys that trip some parsers, and the CLI only knows about 12 of the 14 folders. The workflow that makes these skills useful day to day (PRD first, `task.md`, `changelog.md`, `files.md`, lessons) lives in other repos and in the author's head, not in the package.

## Root cause

Not a bug. The repo grew by accretion. Each skill was written to be complete on its own, so they repeat boilerplate and never learned to hand off to references. The name was picked before the official set existed.

## Proposed solution

1. Rename everything to `builder-skills`. Package `@waynesutton/builder-skills` 2.0.0, binary `builder-skills`, plugin `builder-skills`, repo `waynesutton/builder-skills`. Author is Wayne Sutton, not Convex.
2. Standardize every `SKILL.md` on `name` + `description` frontmatter, third person, with a `Use when` trigger. Body under 300 lines. Split the five long skills into a router `SKILL.md` plus `references/*.md`.
3. Add three workflow skills: `project-workflow` (PRD, task.md, lessons), `project-docs` (sync changelog, files, task from git evidence, with Convex feature detection rules borrowed from `convex-hackathon-skill`), `git-safety` (from the old `gitrules.md` template).
4. Convert `templates/` into project starters: `AGENTS.md`, `files.md`, `changelog.md`, `task.md`, `prds/lessons.md`, and `dev` / `help` as skill folders. Drop `gitrules.md` since it is a real skill now. Drop `templates/CLAUDE.md`; the CLI symlinks `CLAUDE.md` to `AGENTS.md`.
5. CLI copies whole skill folders (so references travel), accepts multiple skills per `install`, adds `cursor` and `opencode` target aliases, and `install-templates` installs the new starters.
6. Add `.claude-plugin/marketplace.json` so `claude plugins marketplace add waynesutton/builder-skills` works.
7. Add `scripts/check-skills.mjs` and wire it to `npm run check` and `prepublishOnly`.
8. Rewrite README in the shape of `mattpocock/skills`: badge, pitch, three install paths, why, skills table, structure.
9. Trim `AGENTS.md` to under 80 lines. Rewrite `command/convex.md`, `GEMINI.md`, `.codex/README.md`, `CONTRIBUTING.md`, `docs.md`.
10. Track `prds/` and `task.md` in git from now on. Archive the old PRDs.

## Files to change

- `package.json`, `bin/cli.js`, `index.js` rename, 2.0.0, 17 skill map, folder copy, aliases
- `.claude-plugin/plugin.json` fix author and repo, list 17 skills. New `marketplace.json`
- `.gitignore` stop ignoring `prds/` and `task.md`, ignore `.agents/`
- `.npmignore` exclude `scripts/`, `.codex/`, `.agents/`
- `skills/*/SKILL.md` all 14 rewritten, 5 gain `references/`
- new `skills/project-workflow`, `skills/project-docs`, `skills/git-safety` with `agents/`, `assets/`, `references/`
- `.codex/skills/` three new symlinks
- `templates/` full restructure
- `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `GEMINI.md`, `docs.md`, `command/convex.md`, `.codex/README.md`
- `changelog.md`, `files.md`, `task.md`
- `prds/archive/` old PRDs, `prds/lessons.md` new
- new `scripts/check-skills.mjs`

## Edge cases

- Existing installs of `@waynesutton/convex-skills` keep working. `npm deprecate` with a pointer is a manual step.
- `CLAUDE.md` is a symlink to `AGENTS.md`. Any tool that follows symlinks sees the new content. Windows checkouts get a text file with the path; acceptable, same as before.
- `.codex/skills/` symlinks are relative, so they survive a folder rename.
- Skill descriptions are under 1024 characters. Claude Code truncates longer ones.
- Users who copied flat `templates/skills/*.md` files before will not be affected; those files are simply gone from new installs.
- Git tracks the root context file as `agents.md` (lowercase). macOS case folding hides it, but on GitHub and Linux the `CLAUDE.md -> AGENTS.md` symlink is broken and `package.json` `files: ["AGENTS.md"]` matches nothing. Fix with `git mv agents.md AGENTS.md`. Owner step, in `task.md`.

## Verification steps

1. `node bin/cli.js list` prints 17 skills.
2. `node bin/cli.js install-all --dir /tmp/bs-test --target cursor` creates 17 folders under `/tmp/bs-test/.cursor/skills`, each with `SKILL.md`, and the split skills have `references/`.
3. `node bin/cli.js install-templates --dir /tmp/bs-test` creates `AGENTS.md`, `CLAUDE.md` symlink, `files.md`, `changelog.md`, `task.md`, `prds/lessons.md`, `.claude/skills/dev/SKILL.md`, `.claude/skills/help/SKILL.md`. Running it again skips everything.
4. `npm run check` exits 0. No frontmatter errors, no skill over 500 lines, no reference file unlinked, no old name outside `changelog.md` and `prds/archive/`.
5. `wc -l skills/*/SKILL.md` shows every file under 300.
6. `rg -n "convex-skills|convexskills|get-convex/skills" --glob '!changelog.md' --glob '!prds/archive/**' --glob '!node_modules/**' --glob '!.agents/**'` returns nothing.
7. `node -e "import('./index.js').then(m => console.log(m.listSkills().length, m.getSkillMeta('git-safety')))"` prints 17 and a name + description object.

## Out of scope

- Publishing to npm, renaming the GitHub repo, pushing, committing. Manual steps for the owner, listed in the plan.
- A `write` skill for the author's personal writing style. Lives in the author's dotfiles, not this package.
- A separate hackathon build log skill. The official `convex-hackathon-skill` covers it; `project-docs` borrows its evidence rules instead.

## Task completion log

- 2026-09-16 01:30 UTC Started. Triage: 14 skill folders, 12 in the CLI map, 5 skills over 500 lines, frontmatter has 4 extra keys, plugin.json claims author Convex and repo get-convex/skills.
- 2026-09-16 01:50 UTC package.json, cli.js, index.js, plugin.json, marketplace.json, .gitignore, .npmignore, check script written.
- 2026-09-16 01:58 UTC command/convex.md, GEMINI.md, .codex/README.md, CONTRIBUTING.md rewritten. Three new skills written with references. Codex symlinks added.
- 2026-09-16 02:02 UTC Six subagents dispatched to rewrite the 14 existing skills in parallel from a shared authoring spec. Templates restructured. AGENTS.md and README rewritten. Old PRDs archived.
- 2026-09-16 02:30 UTC Plan reconciliation: `--target cursor` now lands in `.cursor/skills` as the plan states; `package.json` `files` includes `.claude-plugin/` and keywords gain `skills-sh`; README gains "How I build with these" and the markdown-site link; six working PRDs restored to `prds/` root with only the three finished ones in `archive/`; lint gains a nested references check.
- 2026-09-16 02:25 UTC changelog.md, files.md, task.md written. `npm run check` 0 errors 0 warnings across 17 skills. CLI verified: list, install-templates (idempotent), install-all with references, index.js API. Every SKILL.md under 300 lines. Found the `agents.md` case bug during status check; recorded as owner step. Nothing deployed or published.
