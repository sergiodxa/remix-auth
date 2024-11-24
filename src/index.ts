import type { Cookie } from "react-router";
import type { Strategy } from "./strategy.js";

export class Authenticator<User = unknown> {
	/**
	 * A map of the configured strategies, the key is the name of the strategy
	 * @private
	 */
	private strategies = new Map<string, Strategy<User, never>>();

	/**
	 * Create a new instance of the Authenticator.
	 *
	 * It receives a instance of a Cookie created using Remix's createCookie.
	 *
	 * It optionally receives an object with extra options. The supported options
	 * are:
	 * @example
	 * import { createCookie } from "@remix-run/node";
	 * let cookie = createCookie("auth", { path: "/", maxAge: 3600 });
	 * let auth = new Authenticator(cookie);
	 * @example
	 * import { createCookie } from "@remix-run/cloudflare";
	 * let cookie = createCookie("auth", { path: "/", maxAge: 3600 });
	 * let auth = new Authenticator(cookie);
	 * @example
	 * import { createCookie } from "@remix-run/deno";
	 * let cookie = createCookie("auth", { path: "/", maxAge: 3600 });
	 * let auth = new Authenticator(cookie);
	 */
	constructor(private cookie: Cookie) {}

	/**
	 * Call this method with the Strategy, the optional name allows you to setup
	 * the same strategy multiple times with different names.
	 * It returns the Authenticator instance for concatenation.
	 * @example
	 * auth.use(new SomeStrategy({}, (user) => Promise.resolve(user)));
	 * auth.use(new SomeStrategy({}, (user) => Promise.resolve(user)), "another");
	 */
	use(strategy: Strategy<User, never>, name?: string): Authenticator<User> {
		this.strategies.set(name ?? strategy.name, strategy);
		return this;
	}

	/**
	 * Call this method with the name of the strategy you want to remove.
	 * It returns the Authenticator instance for concatenation.
	 * @example
	 * auth.unuse("another").unuse("some");
	 */
	unuse(name: string): Authenticator {
		this.strategies.delete(name);
		return this;
	}

	/**
	 * Call this to authenticate a request using some strategy. You pass the name
	 * of the strategy you want to use and the request to authenticate.
	 * @example
	 * async function action({ request }: ActionFunctionArgs) {
	 *   let user = await auth.authenticate("some", request);
	 * };
	 * @example
	 * async function action({ request, context }: ActionFunctionArgs) {
	 *   let user = await auth.authenticate("some", request, { context });
	 * };
	 */
	authenticate(
		strategy: string,
		request: Request,
		options: Pick<Strategy.AuthenticateOptions, "context"> = {},
	): Promise<User> {
		const obj = this.strategies.get(strategy);
		if (!obj) throw new ReferenceError(`Strategy ${strategy} not found.`);
		return obj.authenticate(new Request(request.url, request), {
			...options,
			cookie: this.cookie,
			name: strategy,
		});
	}
}
