# RAG and workflows

How to feed an agent your own documents through vector search, and how to chain several LLM steps into a durable job with `@convex-dev/workflow`.

## Three ways to do retrieval

| Approach | Good for | Setup |
| --- | --- | --- |
| Message history search | Long threads where older turns matter | Set `embeddingModel` on the Agent |
| `@convex-dev/rag` component | Documents, docs sites, per user knowledge bases | Install the RAG component |
| Hand rolled vector index | Full control over chunking, filters, and schema | `vectorIndex` on your own table plus `ctx.vectorSearch` |

## Message history search

Give the agent an embedding model and it embeds every saved message. Prior turns from the same thread are then pulled into context by similarity, not only recency.

```typescript
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

export const supportAgent = new Agent(components.agent, {
  name: "Support Agent",
  languageModel: openai.chat("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  instructions: "You are a support assistant.",
});
```

When you save a prompt in a mutation, the embedding is generated later inside the action that uses it, since mutations cannot call the embedding API. Context fetch options live on the Agent's `contextOptions`; see https://docs.convex.dev/agents/context for the fields.

## The RAG component

```bash
npm install @convex-dev/rag
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(agent);
app.use(rag);
export default app;
```

```typescript
// convex/rag.ts
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});
```

Ingest text from an action. The component chunks it and stores embeddings. Use `namespace` to scope data per user, team, or "global", and `key` so adding the same document again replaces the old chunks.

```typescript
// convex/knowledge.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { rag } from "./rag";

export const addDocument = internalAction({
  args: { namespace: v.string(), key: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rag.add(ctx, {
      namespace: args.namespace,
      key: args.key,
      text: args.text,
    });
    return null;
  },
});
```

### Prompt based retrieval

Search first, then put the results in the prompt. Predictable, and the thread history keeps only the user's question and the answer.

```typescript
// convex/chat.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { rag } from "./rag";
import { supportAgent } from "./agent";

export const answerWithContext = internalAction({
  args: { threadId: v.string(), userId: v.string(), question: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await rag.search(ctx, {
      namespace: args.userId,
      query: args.question,
      limit: 8,
    });
    await supportAgent.generateText(
      ctx,
      { threadId: args.threadId },
      {
        prompt: `# Context\n\n${context.text}\n\n---\n\n# Question\n\n"""${args.question}"""`,
      },
    );
    return null;
  },
});
```

### Tool based retrieval

Let the model decide when to search. The tool call and result land in the thread, so later turns can reference them.

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "./rag";

export const searchDocs = createTool({
  description: "Search the user's documents for passages related to a question",
  args: z.object({
    query: z.string().describe("What to look for, phrased as a search query"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) return "No user context available.";
    const context = await rag.search(ctx, { namespace: ctx.userId, query: args.query });
    return context.text;
  },
});
```

Pick prompt based when every question benefits from context (FAQ, doc search). Pick tool based when the agent should sometimes answer from history alone.

## Hand rolled vector index

When you need your own schema, filters, or chunking, embed in an action and store vectors on your table.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chunks: defineTable({
    documentId: v.string(),
    text: v.string(),
    embedding: v.array(v.float64()),
  })
    .index("by_document", ["documentId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    }),
});
```

```typescript
// convex/search.ts
import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export const fetchChunks = internalQuery({
  args: { ids: v.array(v.id("chunks")) },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const texts: Array<string> = [];
    for (const id of args.ids) {
      const chunk = await ctx.db.get(id);
      if (chunk) texts.push(chunk.text);
    }
    return texts;
  },
});

export const searchChunks = internalAction({
  args: { query: v.string(), limit: v.number() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.query,
    });
    // vectorSearch is only available in actions
    const hits = await ctx.vectorSearch("chunks", "by_embedding", {
      vector: embedding,
      limit: args.limit,
    });
    return await ctx.runQuery(internal.search.fetchChunks, {
      ids: hits.map((h) => h._id),
    });
  },
});
```

`ctx.vectorSearch` returns ids and scores only, so a follow up query loads the documents. Keep `dimensions` equal to the embedding model's output size.

## Durable multi step jobs with the workflow component

A workflow records each step's result. If the server restarts or a step fails, it resumes from the last completed step instead of starting over.

```bash
npm install @convex-dev/workflow
```

```typescript
// convex/convex.config.ts
import workflow from "@convex-dev/workflow/convex.config";
// ...
app.use(workflow);
```

Expose agent generation as an action the workflow can call as a step:

```typescript
// convex/agent.ts (continued)
export const getSupport = supportAgent.asTextAction({
  stopWhen: stepCountIs(10),
});
```

Define the workflow. Steps that only touch the database (`createThread`, `saveMessage`) can take `step` in place of `ctx`. Anything that needs `fetch` or a model call runs through `step.runAction`.

```typescript
// convex/supportWorkflow.ts
import { v } from "convex/values";
import { WorkflowManager } from "@convex-dev/workflow";
import { createThread, saveMessage } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { mutation } from "./_generated/server";

export const workflow = new WorkflowManager(components.workflow);

export const supportWorkflow = workflow.define({
  args: { userId: v.string(), prompt: v.string() },
  handler: async (step, args) => {
    const threadId = await createThread(step, components.agent, {
      userId: args.userId,
      title: args.prompt,
    });
    const { messageId } = await saveMessage(step, components.agent, {
      threadId,
      prompt: args.prompt,
    });
    // promptMessageId lets a retried step reuse the same prompt and any partial replies
    const { text } = await step.runAction(
      internal.agent.getSupport,
      { threadId, userId: args.userId, promptMessageId: messageId },
      { retry: true },
    );
    await step.runMutation(internal.notifications.send, {
      userId: args.userId,
      message: text,
    });
  },
});

export const startSupport = mutation({
  args: { prompt: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await workflow.start(ctx, internal.supportWorkflow.supportWorkflow, {
      userId: identity.subject,
      prompt: args.prompt,
    });
    return null;
  },
});
```

Step arguments and return values are stored as workflow state and count toward bandwidth. Pass ids between steps and load large data inside the step rather than returning it.

### Structured output as a step

```typescript
import { z } from "zod";

export const classifyRequest = supportAgent.asObjectAction({
  schema: z.object({
    category: z.enum(["billing", "bug", "feature"]).describe("Request type"),
    urgency: z.number().int().min(1).max(5).describe("1 low, 5 critical"),
  }),
});
```

Call it with `step.runAction(internal.agent.classifyRequest, { userId, prompt })` and branch on `object.category`.

### When a plain action is enough

Two or three sequential `generateText` calls in one action work fine when a failure can just be retried from scratch. Reach for the workflow component when steps have side effects (sending email, charging a card), when the job runs longer than an action timeout allows, or when partial progress must survive a crash.
