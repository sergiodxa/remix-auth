# Contribution

## Setup

Create an environment variable called `REMIX_TOKEN` with your [Remix install token](https://remix.run/dashboard).

Run `npm install` to install the dependencies.

Run the tests with `npm run test`.

Run the linter with `npm run lint`.

Run the typechecker with `npm run typecheck`.

## Create a Strategy

Follow the steps on the [Create a Strategy](https://github.com/sergiodxa/remix-auth/blob/main/docs/create-a-strategy.md) documentation. Create your new strategy inside the folder [`src/strategies`](https://github.com/sergiodxa/remix-auth/tree/main/src/strategies) and re-export it from the `index.ts` file.
