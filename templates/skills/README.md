# Skill templates

Two starter skills you are meant to edit. They carry house style, so they live here as templates instead of in `skills/` where the shared, unedited skills are.

| Template | What it is for |
| --- | --- |
| `dev/SKILL.md` | Stack, Convex mutation rules, design system, docs habit, communication style |
| `help/SKILL.md` | Root cause first, confidence bar, scope rules, what not to touch |

The git rules that used to live here are now a real skill, `git-safety`, installed with everything else.

## Install

```bash
npx @waynesutton/builder-skills install-templates
```

That copies both folders into `.claude/skills/`, plus `AGENTS.md`, `files.md`, `changelog.md`, `task.md`, and `prds/lessons.md` at the project root. Existing files are never overwritten.

For Codex or Cursor, copy the folders to `.codex/skills/` or `.cursor/skills/` instead:

```bash
cp -r node_modules/@waynesutton/builder-skills/templates/skills/dev .agents/skills/
cp -r node_modules/@waynesutton/builder-skills/templates/skills/help .agents/skills/
```

## Then edit

Open each `SKILL.md` and replace the bracketed parts: auth provider, email provider, palette, confidence bar, protected areas. Rewrite the `description` so it says what this project's version does. Keep `name` matching the folder.

## Format

Each skill is a folder with a `SKILL.md`. Frontmatter is `name` and `description` only. Claude Code, Codex, Cursor, and OpenCode all read this layout. Flat `.md` files in a skills folder are not picked up anymore.
