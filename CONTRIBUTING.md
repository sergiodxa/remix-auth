# Contribution

Thank you for wanting to contribute to Remix Auth. While this project is Open Source, it is also a personal project, and I want to make sure that contributions align with the project's goals and values.

Before opening a pull request, please consider opening a discussion to talk about your proposed changes. This will help ensure that your contribution aligns with the project's goals and values.

## Setup

The project uses Bun as package manager, test runner, and task runner.

Run `bun install` to install the dependencies.

Run the tests with `bun test`.

Run the linter with `bun run lint` and fix issues with `bun run lint:fix`.

Run the typechecker with `bun run typecheck`.

Run the exports checker with `bun run exports`.

## Create a Strategy

Strategies are published as separate packages. The only official ones are:

- [FormStrategy](https://github.com/sergiodxa/remix-auth-form)
- [OAuth2Strategy](https://github.com/sergiodxa/remix-auth-oauth2)

If you're working a custom strategy, and want to share it with the community, feel free to publish it yourself
