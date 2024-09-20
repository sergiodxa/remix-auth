# Contribution

## Setup

Run `bun install` to install the dependencies.

Run the tests with `bun test`.

Run the code quality checker with `bun run quality`.

Run the typechecker with `bun run typecheck`.

Run the exports checker with `bun run exports`.

## Create a Strategy

Follow the steps on the [Create a Strategy](https://github.com/sergiodxa/remix-auth/blob/main/docs/create-a-strategy.md) documentation. Create your new strategy inside the folder [`src/strategies`](https://github.com/sergiodxa/remix-auth/tree/main/src/strategies) and re-export it from the `index.ts` file.
