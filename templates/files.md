# Files

One line per file that matters. What it is for, not how it works. Keep this in sync with the code; the `project-docs` skill does it from the git diff.

## Root

- `AGENTS.md` agent context: stack, commands, rules, workflow
- `CLAUDE.md` symlink to AGENTS.md
- `files.md` this file
- `changelog.md` user facing changes by version, Keep a Changelog format
- `task.md` To Do / In Progress / Completed with UTC timestamps
- `package.json` scripts and dependencies

## convex/

- `schema.ts` tables, validators, indexes
- `convex.config.ts` components registered with app.use

## src/

- `main.tsx` app entry, Convex and auth providers

## prds/

- `lessons.md` one line per lesson learned, read at session start
