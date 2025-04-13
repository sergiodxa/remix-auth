import type { Strategy } from "./strategy.js";

/**
 * Create a new instance of the Authenticator.
 *
 * It receives a instance of a Cookie created using Remix's createCookie.
 *
 * It optionally receives an object with extra options. The supported options
 * are:
 * @example
 * let auth = new Authenticator();
 */
export class Authenticator<User = unknown> {
	/**
	 * A map of the configured strategies, the key is the name of the strategy
	 * @private
	 */
	private strategies = new Map<string, Strategy<User, never>>();

	/**
	 * Call this method with the Strategy, the optional name allows you to setup
	 * the same strategy multiple times with different names.
	 * It returns the Authenticator instance for concatenation.
	 * @example
	 * auth.use(new SomeStrategy((user) => Promise.resolve(user)));
	 * auth.use(new SomeStrategy((user) => Promise.resolve(user)), "another");
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
	 * Call this method with the name of a strategy you want to get.
	 * It returns the Strategy instance or null if the strategy is not found.
	 * @param name
	 * @returns
	 */
	get<S extends Strategy<User, never>>(name: string): S | null {
		return (this.strategies.get(name) as S) ?? null;
	}

	/**
	 * Call this to authenticate a request using some strategy. You pass the name
	 * of the strategy you want to use and the request to authenticate.
	 * @example
	 * async function action({ request }: ActionFunctionArgs) {
	 *   let user = await auth.authenticate("strategy-name", request);
	 * };
	 */
	authenticate(strategy: string, request: Request): Promise<User> {
		let instance = this.get(strategy);
		if (!instance) throw new ReferenceError(`Strategy ${strategy} not found.`);
		return instance.authenticate(new Request(request.url, request));
	}
}
