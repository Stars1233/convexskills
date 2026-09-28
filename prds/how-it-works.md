# How Convex Skills Works: AGENTS.md vs Skills

This document explains the dual-approach architecture for AI coding agents based on findings from Vercel's agent evaluation research.

## Background

Vercel's research ([AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), January 2026) found that:

| Configuration                  | Pass Rate |
| ------------------------------ | --------- |
| Baseline (no docs)             | 53%       |
| Skills (default behavior)      | 53%       |
| Skills + explicit instructions | 79%       |
| AGENTS.md with docs index      | 100%      |

Skills weren't being invoked reliably. In 56% of eval cases, agents had access to skills but chose not to use them.

## Why Passive Context Wins

AGENTS.md outperformed skills because:

1. **No decision point**: Information is always present in the system prompt
2. **Consistent availability**: No async loading or invocation required
3. **No ordering issues**: No sequencing decisions (explore first vs read docs first)

## Our Dual Approach

This package uses both approaches for maximum effectiveness:

### 1. AGENTS.md (Passive Context)

Always-available knowledge that doesn't require agent invocation:

- Convex docs index pointing to https://docs.convex.dev/llms.txt
- Core function patterns (query, mutation, action syntax)
- Schema and index examples
- Key principles and anti-patterns
- Retrieval-led reasoning instruction

**Best for**: General Convex knowledge, API patterns, always-available reference

### 2. Skills (On-Demand)

Task-specific workflows that agents invoke explicitly:

- `convex-file-storage`: Set up file uploads
- `convex-cron-jobs`: Create scheduled tasks
- `convex-http-actions`: Add webhook endpoints
- `convex-security-audit`: Run security reviews
- `convex-migrations`: Schema evolution patterns

**Best for**: Specific workflows, step-by-step guidance, explicit tasks

## The Retrieval-Led Reasoning Pattern

The key instruction in AGENTS.md:

```
IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
for any Convex tasks.
```

This shifts agents from relying on potentially outdated training data to consulting the latest documentation via llms.txt.

## Documentation Index Format

We use a compressed pipe-delimited format to minimize context overhead:

```
[Convex Docs]|https://docs.convex.dev/llms.txt
|functions:{query-functions.md,mutation-functions.md,actions.md}
|database:{schemas.md,reading-data.md,writing-data.md,indexes.md}
...
```

This tells agents where to find specific docs without embedding full content.

## How Agents Should Use This

1. **Always-available context**: AGENTS.md content is in the system prompt for every turn
2. **Doc retrieval**: When working on Convex code, fetch llms.txt for the full index
3. **Skill invocation**: For specific tasks (file storage, cron jobs, etc.), read the relevant skill
4. **Latest over training**: Prefer retrieved docs over pre-training knowledge

## Comparison with Next.js Approach

Next.js uses `npx @next/codemod agents-md` to:

- Download version-matched docs to `.next-docs/`
- Inject a compressed index into AGENTS.md

We take a simpler approach:

- Reference the live llms.txt URL directly
- Agents with network access fetch latest docs
- No local sync required (though we could add this)

## Future Enhancements

Potential additions:

1. **CLI command**: `convex-skills fetch-docs` to download llms.txt locally
2. **Version matching**: Detect Convex version and fetch matching docs
3. **Offline mode**: Local doc cache for agents without network access
4. **Skill triggers**: Explicit instructions for when to invoke specific skills

## Key Takeaways

1. Skills still work and are valuable for task-specific workflows
2. AGENTS.md provides passive context that's always available
3. The combination gives agents both horizontal (general) and vertical (specific) coverage
4. Retrieval-led reasoning beats pre-training for framework-specific code

## References

- Vercel Blog: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- Convex LLMs.txt: https://docs.convex.dev/llms.txt
- Agent Skills Spec: https://github.com/anthropics/skills
- AGENTS.md Spec: https://agents.md/
