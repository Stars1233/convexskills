# Publishing a component to npm

How to lay out `package.json`, build in the right order, write the README, and version a Convex component so other apps can install it with one line.

## Start from the template

```bash
npx create-convex@latest --component
```

The template ships a working `package.json`, build scripts, an example app, and a `test` entry point. Prefer it over hand assembling the layout below. The rest of this file explains what the template does so you can adapt or debug it.

## Entry points the package must expose

| Import path | What it provides |
| --- | --- |
| `@acme/counter` | Client class, types, constants used inside the app |
| `@acme/counter/convex.config.js` | The `defineComponent` export the app passes to `app.use` |
| `@acme/counter/_generated/component.js` | The `ComponentApi` type for wrapper code |
| `@acme/counter/test` | Helper to register the component with `convex-test` |

## package.json

```json
{
  "name": "@acme/counter",
  "version": "0.1.0",
  "description": "Named counters as a Convex component",
  "type": "module",
  "license": "Apache-2.0",
  "repository": { "type": "git", "url": "https://github.com/acme/counter" },
  "keywords": ["convex", "convex-component", "counter"],
  "files": ["dist", "src", "README.md"],
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    },
    "./convex.config.js": {
      "types": "./dist/component/convex.config.d.ts",
      "default": "./dist/component/convex.config.js"
    },
    "./_generated/component.js": {
      "types": "./dist/component/_generated/component.d.ts",
      "default": "./dist/component/_generated/component.js"
    },
    "./test": {
      "types": "./dist/test.d.ts",
      "default": "./dist/test.js"
    }
  },
  "scripts": {
    "codegen": "convex codegen --component-dir ./src/component",
    "build": "npm run codegen && tsc --project tsconfig.build.json",
    "dev": "npm run build && cd example && npx convex dev --typecheck-components",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm test"
  },
  "peerDependencies": {
    "convex": ">=1.17.0"
  },
  "devDependencies": {
    "convex": "^1.17.0",
    "convex-test": "^0.0.35",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

Notes:

- `convex` is a peer dependency so the app and the component share one copy.
- Keep a single `package.json` and `node_modules` at the repo root. The example app then resolves `@acme/counter` to the root `exports`, the same way a real install would.
- Add dependencies used only by the example app as `devDependencies`.
- `files` should include `src` so consumers can jump to readable source in their editor.

## Build order

The example app imports the bundled package, so `npx convex dev` in the example cannot see the component source. Three things have to happen in this order:

1. `npx convex codegen --component-dir ./src/component` generates `_generated/` inside the component.
2. Your build (`tsc`, `esbuild`) emits `dist/`.
3. `npx convex dev --typecheck-components` in the example app deploys and type checks against `dist/`.

If step 3 runs before step 2 finishes you get "cannot find module" or stale type errors. The template wires these with file watchers; if you write your own scripts, run them sequentially or with separate watchers.

## tsconfig.build.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "example"]
}
```

## Test entry point

```typescript
// src/test.ts
/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

// Registers the component with a convex-test instance under the given name
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "counter",
) {
  t.registerComponent(name, schema, modules);
}

export default { register, schema, modules };
```

Component logic itself is tested with `convexTest(schema, modules)` inside `src/component/*.test.ts`. Wrapper code is tested from the example app.

## README shape

Keep it short and copy paste ready. Sections in this order:

1. One sentence on what the component stores and does.
2. Install: the `npm install` line and the `convex.config.ts` snippet with `app.use`.
3. Usage: create the client class in a `convex/` file and one app side mutation and query that call it.
4. Configuration: constructor options and any env the component declares.
5. Boundary notes: ids are strings, auth happens in the app, pagination caveats if any.
6. Example app: how to run `npm run dev` from a clone.

Skip prose about what Convex is. Link to https://docs.convex.dev/components/using for install background.

## Versioning

- Follow semver. A schema change that needs a migration, a renamed public function, or a changed argument shape is a major bump.
- Adding an optional argument or a new public function is a minor bump.
- Document breaking changes in `CHANGELOG.md` with the migration steps an app must run.
- Tag releases in git and publish from a clean build: `npm run prepublishOnly` then `npm publish --access public`.

## Submitting to the component directory

Once published, open a request at https://www.convex.dev/components with the package name, a short description, and the repo link. Include the example app so reviewers can run it.
