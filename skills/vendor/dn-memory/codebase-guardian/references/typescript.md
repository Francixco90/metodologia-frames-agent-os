# TypeScript / Node

## Validate (run these — don't judge types by eye)

- **Type-check:** `npx tsc --noEmit` (or the project's `typecheck`/`build` script). This is the primary error catcher.
- **Lint:** `npx eslint .` (check for `lint` script first; respect the project's config and plugins).
- **Format check:** `npx prettier --check .` if Prettier is configured.
- **Tests:** run the project's runner (`vitest`, `jest`, `node --test`). Prefer the configured `test` script.
- **Build:** the framework build (`next build`, `vite build`, `tsup`, etc.) catches things `tsc` alone may miss.

Detect package manager from the lockfile: `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `package-lock.json`→npm, `bun.lockb`→bun. Use the right one; mixing managers corrupts installs.

## Study before editing

Check `tsconfig.json` for `strict`, `paths` aliases, and module settings — they change what's valid. Note whether the codebase uses ESM or CJS, default vs named exports, and how it handles async errors. Match the import style exactly (path aliases vs relative).

## Ripple traps

- **Changed an exported function/type signature** → `tsc --noEmit` will surface broken callers across the project; fix them, don't `// @ts-ignore`.
- **Renamed an export** → grep the symbol; barrel files (`index.ts`) often re-export it.
- **Changed a shared `interface`/`type`** → every producer and consumer is affected; the type-checker is your dependency tracker here.
- **Touched an API route handler** → update the client fetch/typed SDK and any shared request/response types.
- **Discriminated unions / exhaustive switches** → adding a variant should break `never`-checked switches; that's the type system helping — handle the new case.
- **`package.json` exports / path changes** → update import sites and rebuild.
- **Frameworks:** Next.js server vs client component boundaries (`"use client"`); changing a server action signature ripples to its callers. tRPC/Zod schemas: the schema *is* the type — update it, not a separate type.

## Don't

- Don't silence `tsc` with `any`, `as`, or `@ts-ignore` to get green. If you must cast, say why.
- Don't add a dependency without checking it's already in `package.json`.

## Version note

These commands and traps reflect common, recent usage. Pin the exact version from the lockfile and, if it is recent or unfamiliar, check the current official docs for TypeScript/ESLint/the framework (Next.js, Vite, etc.) on the web before relying on a flag, command, or API here — they change between releases. Live docs win over this file.
