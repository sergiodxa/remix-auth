import type { Strategy } from "./strategy.js";

/**
 * The Authenticator class is the main entry point for Remix Auth.
 *
 * It manages authentication strategies and provides methods to authenticate
 * requests. Each strategy is registered with a name, which is used to identify
 * it during the authentication process.
 *
 * @param StrategyRecord - A record of strategies where the key is the strategy name and the value is the strategy instance
 *
 * @example
 * import { Authenticator } from "remix-auth";
 * import { FormStrategy } from "remix-auth-form";
 *
 * // Create an instance of the authenticator
 * const authenticator = new Authenticator({
 *   strategies: {
 *    login: new FormStrategy(async ({ form }) => {
 *       // Implement your authentication logic here
 *       return findUserByCredentials(form);
 *    }),
 *   },
 * });
 *
 * let sessionData = await authenticator.authenticate("login", request);
 */
export class Authenticator<
	StrategyRecord extends Record<string, Strategy<any, any>>,
> {
	/**
	 * A readonly record of the configured strategies, where the key is the name
	 * of the strategy and the value is the strategy instance
	 */
	#strategies: Readonly<StrategyRecord>;

	constructor(options: { strategies: StrategyRecord }) {
		this.#strategies = Object.freeze(options.strategies);
	}

	/**
	 * Authenticates a request using the specified strategy.
	 *
	 * This method delegates the authentication process to the named strategy and
	 * returns the authenticated user data if successful.
	 *
	 * @param strategy - The name of the strategy to use for authentication
	 * @param request - The request object to authenticate
	 * @param ...args - Additional arguments required by the strategy's authenticate method
	 * @returns Promise resolving to the session data
	 *
	 * @example
	 * async function action({ request }: ActionFunctionArgs) {
	 *   try {
	 *     const sessionData = await auth.authenticate("login", request);
	 *     // User is authenticated, do something with the session data
	 *     return redirect("/dashboard");
	 *   } catch (error) {
	 *     // Handle authentication error
	 *     return json({ error: error.message });
	 *   }
	 * }
	 */
	async authenticate<StrategyName extends keyof StrategyRecord>(
		strategyName: StrategyName,
		...args: Parameters<StrategyRecord[StrategyName]["authenticate"]>
	): Promise<
		StrategyRecord[StrategyName] extends Strategy<infer SD, any> ? SD : never
	> {
		const strategy = this.#strategies[strategyName];
		return strategy.authenticate.apply(
			strategy,
			args as Parameters<StrategyRecord[StrategyName]["authenticate"]>,
		);
	}

	/**
	 * Retrieves a readonly record of all registered strategies.
	 * Useful if the strategy exposes additional methods.
	 * @example
	 * let loginStrategy = auth.strategies.login;
	 */
	get strategies(): Readonly<{
		[K in keyof StrategyRecord]: Omit<StrategyRecord[K], "authenticate">;
	}> {
		return this.#strategies;
	}
}

export namespace Authenticator {
	/**
	 * Infers the session data type from a record of strategies.
	 *
	 * This utility type extracts the session data type associated with the
	 * strategies in the provided record. It is useful for ensuring type safety
	 * when working with authenticated session data.
	 *
	 * @typeParam SR - A record of strategies from which to infer the session data type
	 *
	 * @example
	 * type SessionData = Authenticator.StrategySessionData<typeof auth.strategies>;
	 */
	export type StrategySessionData<
		SR extends Record<string, Strategy<any, any>>,
	> = SR[keyof SR] extends Strategy<infer SD, any> ? SD : never;

	/**
	 * Infers the session data type from an Authenticator instance.
	 *
	 * This utility type extracts the session data type associated with the
	 * strategies registered in the Authenticator. It is useful for ensuring
	 * type safety when working with authenticated session data.
	 *
	 * @typeParam T - The Authenticator instance from which to infer the session data type
	 *
	 * @example
	 * type SessionData = Authenticator.infer<typeof auth>;
	 */
	export type infer<T> =
		T extends Authenticator<infer SR> ? StrategySessionData<SR> : never;
}
