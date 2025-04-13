import type { Strategy } from "./strategy.js";

/**
 * The Authenticator class is the main entry point for Remix Auth.
 *
 * It manages authentication strategies and provides methods to authenticate
 * requests. Each strategy is registered with a name, which is used to identify
 * it during the authentication process.
 *
 * @typeParam User - The type of user object that will be returned after authentication
 *
 * @example
 * ```ts
 * import { Authenticator } from "remix-auth";
 * import { FormStrategy } from "remix-auth-form";
 *
 * // Create an instance of the authenticator
 * const authenticator = new Authenticator<User>();
 *
 * // Register a strategy
 * authenticator.use(new FormStrategy(async ({ form }) => {
 *   // Implement your authentication logic here
 *   return findUserByCredentials(form);
 * }));
 * ```
 */
export class Authenticator<User = unknown> {
	/**
	 * A map of the configured strategies, where the key is the name of the
	 * strategy and the value is the strategy instance
	 * @private
	 */
	private strategies = new Map<string, Strategy<User, never>>();

	/**
	 * Registers an authentication strategy with the authenticator.
	 *
	 * @param strategy - The strategy instance to register
	 * @param name - Optional custom name for the strategy. If not provided, the strategy's name property will be used
	 * @returns The authenticator instance for method chaining
	 *
	 * @example
	 * ```ts
	 * // Register with default name
	 * auth.use(new FormStrategy(verify));
	 *
	 * // Register with custom name
	 * auth.use(new FormStrategy(verify), "admin-form");
	 * ```
	 */
	use(strategy: Strategy<User, never>, name?: string): Authenticator<User> {
		this.strategies.set(name ?? strategy.name, strategy);
		return this;
	}

	/**
	 * Removes a previously registered strategy from the authenticator.
	 *
	 * @param name - The name of the strategy to remove
	 * @returns The authenticator instance for method chaining
	 *
	 * @example
	 * ```ts
	 * // Remove a strategy
	 * auth.unuse("form");
	 *
	 * // Chain multiple removals
	 * auth.unuse("form").unuse("oauth2");
	 * ```
	 */
	unuse(name: string): Authenticator {
		this.strategies.delete(name);
		return this;
	}

	/**
	 * Retrieves a registered strategy by name.
	 *
	 * @param name - The name of the strategy to retrieve
	 * @returns The strategy instance if found, null otherwise
	 * @typeParam S - The specific strategy type to cast to
	 *
	 * @example
	 * ```ts
	 * // Get a strategy
	 * const formStrategy = auth.get<FormStrategy>("form");
	 * ```
	 */
	get<S extends Strategy<User, never>>(name: string): S | null {
		return (this.strategies.get(name) as S) ?? null;
	}

	/**
	 * Authenticates a request using the specified strategy.
	 *
	 * This method delegates the authentication process to the named strategy and
	 * returns the authenticated user data if successful.
	 *
	 * @param strategy - The name of the strategy to use for authentication
	 * @param request - The request object to authenticate
	 * @returns Promise resolving to the authenticated user
	 * @throws {ReferenceError} If the specified strategy is not found
	 *
	 * @example
	 * ```ts
	 * async function action({ request }: ActionFunctionArgs) {
	 *   try {
	 *     const user = await auth.authenticate("form", request);
	 *     // User is authenticated, do something with the user data
	 *     return redirect("/dashboard");
	 *   } catch (error) {
	 *     // Handle authentication error
	 *     return json({ error: error.message });
	 *   }
	 * }
	 * ```
	 */
	authenticate(strategy: string, request: Request): Promise<User> {
		let instance = this.get(strategy);
		if (!instance) throw new ReferenceError(`Strategy ${strategy} not found.`);
		return instance.authenticate(new Request(request.url, request));
	}
}
