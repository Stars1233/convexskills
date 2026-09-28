# Codex integration

Codex discovers skills from `.codex/skills` at the repo root. This folder holds one symlink per skill pointing at `../../skills/<name>` so the source of truth stays in `skills/`.

## In another project

```bash
npx @waynesutton/builder-skills install-all --target codex
```

or link instead of copy so updates flow through:

```bash
npx @waynesutton/builder-skills install-all --target codex --link
```

## Global install

```bash
# CODEX_HOME defaults to ~/.codex
cp -r skills/* "$CODEX_HOME/skills/"
```

## Skills

Every folder in `skills/` is linked here. Each has `SKILL.md`, an `agents/openai.yaml` with icon metadata, and where needed a `references/` folder the skill loads on demand.

See the main [README](../README.md) for the full list.
