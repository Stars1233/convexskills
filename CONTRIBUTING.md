# Contributing to builder-skills

Thanks for helping. Small focused pull requests land fastest.

## Report a problem

Open a GitHub issue at https://github.com/waynesutton/builder-skills/issues with the skill name, what you asked the agent, and what it did instead. For anything sensitive, contact Wayne directly through https://waynesutton.ai.

## Submit a change

1. Fork and branch.
2. Make the change.
3. Run `npm run check`. It has to pass.
4. Open a pull request with a one paragraph summary and, for skill changes, a before and after prompt that shows the difference.

## Skill rules

Every skill in `skills/<name>/` follows the same shape.

- `SKILL.md` frontmatter has exactly two keys: `name` and `description`. `name` matches the folder.
- `description` is third person, says what the skill does, and includes a `Use when ...` sentence. Under 1024 characters.
- `SKILL.md` body stays under 300 lines. Hard limit 500. Move deep material into `references/*.md` and link it from the body.
- Every `references/*.md` file is linked from `SKILL.md`.
- Code samples use the object form (`query({ args, returns, handler })`), validators on `args` and `returns`, and `withIndex` over `filter`.
- Verify any Convex API you cite against https://docs.convex.dev/llms.txt.
- No emojis. No em dashes. No marketing words. `npm run check` flags the common ones.

## Adding a skill

1. `mkdir skills/<name>` and write `SKILL.md`.
2. Add `agents/openai.yaml` pointing at icons in `assets/` (copy from a sibling skill).
3. Add the skill to `bin/cli.js`, `index.js`, and `.claude-plugin/plugin.json`. The check script fails if the three lists disagree with the folder.
4. Add a row to the README table and `docs.md`.
5. Run `ln -s ../../skills/<name> .codex/skills/<name>` so Codex finds it in this repo.

## Commit messages

`type: short description` in present tense. Types: feat, fix, docs, chore.

## License

Contributions are licensed under Apache-2.0, same as the repo.
