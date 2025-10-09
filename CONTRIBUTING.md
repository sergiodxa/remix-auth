# Contributing

Thank you for your interest in contributing. This is an open-source but personal project. I appreciate help, and I may decline changes that don't align with the project's goals and scope.

- **Discussions first**: Before opening a PR, please open a Discussion to propose your change and align on the approach.
- **Code of Conduct**: By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Sponsorship**: If your company relies on this project and needs prioritization, consider sponsoring: https://github.com/sponsors/sergiodxa

## Bugs

If you find a bug, please open an issue. To help me help you, include:

- **Reproduction**: A minimal reproduction repository or code snippet.
- **Environment**: `remix-auth` version, strategy package and version (if relevant), Remix/React Router version, Node version, Bun version, OS.
- **Steps**: Exact steps to reproduce.
- **Expected vs actual**: What you expected, what happened instead.
- **Logs**: Relevant stack traces or console output.

Note: I maintain this in my free time. Issues without a minimal repro are hard to action and may be closed.

## Security

Please do not open public issues for security reports. Email me at `hello+oss@sergiodxa.com` with details so we can coordinate a fix and disclosure.

## Development Setup

**Requirements:**

- Node: >= 20 (as enforced by `engines`)
- Bun: latest stable (used as package manager, test runner, and task runner)

**Commands:**

- Install: `bun install`
- Build: `bun run build`
- Test: `bun test`
- Lint: `bun run lint` (auto-fix: `bun run lint:fix`)
- Format: `bun run format` (write: `bun run format:fix`)
- Types: `bun run typecheck`
- Exports check: `bun run exports`

## Before You Open a PR

- **Scope**: Keep pull requests focused and small when possible.
- **Tests**: Add tests for new behavior or bug fixes.
- **Type safety**: Types must pass `bun run typecheck`.
- **Lint/Format**: Code must pass `bun run lint` and `bun run format`.
- **Build**: Ensure `bun run build` succeeds.
- **Docs**: Update README or relevant comments when behavior or APIs change.
- **Description**: Include motivation, approach, and tradeoffs. Link related issues/discussions.

## Commit/PR Guidelines

- Clear messages describing the "why".
- Reference issues: "Fixes #123" when applicable.
- Avoid adding dependencies unless discussed.

## Creating a Strategy

Strategies are published as separate packages. Official strategies:

- [FormStrategy](https://github.com/sergiodxa/remix-auth-form)
- [OAuth2Strategy](https://github.com/sergiodxa/remix-auth-oauth2)

If you build a custom strategy and want to share it, please publish it yourself. Recommended checklist:

- **Types**: Ship full TypeScript typings.
- **ESM**: Export ESM and point `exports` correctly.
- **API**: Keep a consistent `Strategy<SessionData, CallbackOptions>` shape.
- **Docs**: README with installation, configuration, usage, and examples.
- **Tests**: Cover happy-path and failure cases.
- **Compatibility**: Note supported Remix/React Router versions and Node runtime.
- **Minimal deps**: Keep dependencies minimal and well-justified.

## Maintenance Notes

- I may prioritize sponsor-impacting issues/PRs, but non-sponsored contributions are welcome and appreciated.
- Large or breaking changes should be discussed first to avoid wasted effort.
