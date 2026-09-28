# Tools and streaming

How to give an agent tools that call Convex functions safely, handle tool failures so the model can recover, and stream replies to clients through the database.

## Where tools can be attached

Tools can be passed at four layers. Each layer overrides the one before it: `args.tools ?? thread.tools ?? agent.options.tools`.

- `new Agent(components.agent, { tools: { ... } })`
- `agent.createThread(ctx, { tools: { ... } })`
- `agent.continueThread(ctx, { tools: { ... } })`
- `agent.generateText(ctx, { threadId }, { prompt, tools: { ... } })`

Set `stopWhen: stepCountIs(n)` with `n > 1` wherever tools are in play. Without it the model makes one tool call and stops before writing a text reply.

## createTool with a Convex context

`createTool` wraps the AI SDK `tool` function and hands the handler a `ToolCtx`:

- `ctx.agent`, `ctx.userId`, `ctx.threadId`, `ctx.messageId`
- everything on `ActionCtx`: `runQuery`, `runMutation`, `runAction`, `storage`, `auth`

In scheduled functions and workflows `ctx.auth` resolves to no user, so pass `userId` explicitly and prefer `ctx.userId`.

```typescript
// convex/tools.ts
import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "./_generated/api";

export const listOpenTasks = createTool({
  description: "List the current user's open tasks",
  args: z.object({
    limit: z.number().int().min(1).max(50).describe("How many tasks to return"),
  }),
  handler: async (ctx, args): Promise<Array<{ id: string; title: string }>> => {
    if (!ctx.userId) return [];
    return await ctx.runQuery(internal.tasks.listOpenForUser, {
      userId: ctx.userId,
      limit: args.limit,
    });
  },
});

export const completeTask = createTool({
  description: "Mark one of the user's tasks as complete",
  args: z.object({
    taskId: z.string().describe("The id returned by listOpenTasks"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) return "No signed in user, cannot complete tasks.";
    await ctx.runMutation(internal.tasks.completeForUser, {
      userId: ctx.userId,
      taskId: args.taskId,
    });
    return `Task ${args.taskId} marked complete.`;
  },
});
```

Two habits keep these reliable:

- Always annotate the handler return type. `ctx.runQuery` inside a tool otherwise produces circular type errors.
- Call `internal.*` functions that take `userId` as an argument, rather than public functions that read `ctx.auth`. The tool runs inside an action where auth may be empty.

## Runtime tools with closures

When a tool needs values that only exist at request time (an org id, a document id), build it inside the action with the AI SDK `tool` helper and pass it at the call site.

```typescript
// convex/bookTools.ts
import { tool } from "ai";
import { z } from "zod";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export function getChapterTool(ctx: ActionCtx, bookId: Id<"books">) {
  return tool({
    description: "Read a chapter of the current book",
    inputSchema: z.object({
      chapter: z.number().int().describe("Chapter number, starting at 1"),
    }),
    execute: async (args): Promise<string> => {
      return await ctx.runQuery(internal.books.getChapterText, {
        bookId,
        chapter: args.chapter,
      });
    },
  });
}
```

Then in the action: `agent.generateText(ctx, { threadId }, { prompt, tools: { getChapter: getChapterTool(ctx, bookId) } })`.

## Error handling inside tools

A thrown error in a tool handler aborts the whole generation. For failures the model should be able to work around, catch and return a plain message instead.

```typescript
export const lookupShipment = createTool({
  description: "Get shipping status for an order",
  args: z.object({ orderId: z.string().describe("Order id") }),
  handler: async (ctx, args): Promise<string> => {
    try {
      const status = await ctx.runAction(internal.shipping.fetchStatus, {
        orderId: args.orderId,
      });
      return status ?? "No shipment found for that order.";
    } catch (err) {
      // Give the model something it can explain to the user
      return `Shipping lookup failed: ${err instanceof Error ? err.message : "unknown error"}`;
    }
  },
});
```

Rules of thumb:

- Validate ids and ownership inside the Convex function the tool calls, not only in the tool.
- Return short strings or small objects. Tool results are saved as messages and count toward context size.
- For unrecoverable problems (no auth, bad configuration) let the error throw so the action fails loudly.

## Streaming replies through the database

Delta streaming saves chunks of the reply as the model produces them. Clients subscribe with a normal query, so it works from a scheduled action and survives a dropped connection.

```typescript
// convex/chat.ts
import { v } from "convex/values";
import { internalAction, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { supportAgent } from "./agent";

export const streamReply = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await supportAgent.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      { saveStreamDeltas: { chunking: "word", throttleMs: 250 } },
    );
    return null;
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
```

`chunking` accepts `"word"`, `"line"`, a regex, or a function. `throttleMs` caps how often deltas are written.

Client side, pass `stream: true` and smooth the text:

```tsx
import { useUIMessages, useSmoothText, type UIMessage } from "@convex-dev/agent/react";
import { api } from "../convex/_generated/api";

function Message({ message }: { message: UIMessage }) {
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === "streaming",
  });
  return <div data-role={message.role}>{visibleText}</div>;
}

function Chat({ threadId }: { threadId: string }) {
  const { results } = useUIMessages(
    api.chat.listMessages,
    { threadId },
    { initialNumItems: 20, stream: true },
  );
  return <>{results.map((m) => <Message key={m.key} message={m} />)}</>;
}
```

## Optimistic sends

Show the user's message before the mutation round trip completes:

```typescript
import { useMutation } from "convex/react";
import { optimisticallySendMessage } from "@convex-dev/agent/react";

const sendMessage = useMutation(api.chat.sendMessage).withOptimisticUpdate(
  optimisticallySendMessage(api.chat.listMessages),
);
```

This assumes the mutation args are `{ threadId, prompt }`. If they differ, call `optimisticallySendMessage(api.chat.listMessages)(store, { threadId, prompt })` inside your own optimistic update.

## HTTP streaming from an httpAction

When a single client wants the stream over HTTP as well as saved deltas, pass `returnImmediately`:

```typescript
const result = await supportAgent.streamText(
  ctx,
  { threadId },
  { prompt },
  { saveStreamDeltas: { returnImmediately: true } },
);
return result.toUIMessageStreamResponse();
```

Without `saveStreamDeltas` you can still iterate `result.textStream` inside the action, but nothing is persisted until the stream finishes.
