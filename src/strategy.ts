/**
 * The Strategy class is the abstract base class that all authentication
 * strategies must extend.
 *
 * Strategies implement the specific authentication logic for different
 * authentication methods (e.g., form-based, OAuth, etc.) and are registered
 * with an Authenticator instance.
 *
 * @typeParam SessionData - The type of session data that will be returned after authentication
 * @typeParam CallbackOptions - The type of parameters that the callback will receive from the strategy
 *
 * @example
 * // Example of a custom strategy implementation
 * class MyCustomStrategy<SessionData> extends Strategy<
 *   SessionData,
 *   { username: string; password: string }
 * > {
 *   async authenticate(request: Request): Promise<SessionData> {
 *     // Implementation details...
 *   }
 * }
 */
export abstract class Strategy<SessionData, CallbackOptions> {
	protected callback: Strategy.CallbackFunction<SessionData, CallbackOptions>;

	/**
	 * Creates a new Strategy instance.
	 *
	 * @param callback - A function that validates the credentials and returns a user or throws an error if authentication fails
	 */
	constructor(
		callback: Strategy.CallbackFunction<SessionData, CallbackOptions>,
	) {
		this.callback = callback;
	}

	/**
	 * The core authentication method that each strategy must implement.
	 *
	 * This method handles the specific authentication flow for the strategy.
	 * It extracts the necessary information from the request, validates it,
	 * and calls the callback function to authenticate the user.
	 *
	 * @param request - The incoming request to authenticate
	 * @param ...args - Additional arguments specific to the strategy
	 * @returns A promise that resolves to the authenticated user data
	 * @throws Appropriate error if authentication fails
	 */
	abstract authenticate(
		request: Request,
		...args: unknown[]
	): Promise<SessionData>;
}

export namespace Strategy {
	/**
	 * A function type for the callback used by authentication strategies.
	 *
	 * The callback function is responsible for validating credentials extracted
	 * by the strategy and returning the corresponding user object if
	 * authentication succeeds.
	 *
	 * @typeParam User - The type of user object that will be returned after authentication
	 * @typeParam CallbackParams - The type of parameters that will be passed to the callback function by the strategy
	 *
	 * @param params - The authentication parameters extracted by the strategy (e.g., username/password, token, etc.)
	 * @returns A promise that resolves to the authenticated user data
	 * @throws Should throw an appropriate error if authentication fails (e.g., invalid credentials)
	 *
	 * @example
	 * // Example callback function for a form strategy
	 * const callback: Strategy.CallbackFunction<User, { form: FormData }> = async ({ form }) => {
	 *   const username = form.get("username");
	 *   const password = form.get("password");
	 *
	 *   const user = await db.user.findUnique({ where: { username } });
	 *   if (!user || !await comparePasswords(password, user.password)) {
	 *     throw new Error("Invalid username or password");
	 *   }
	 *
	 *   return user;
	 * };
	 */
	export type CallbackFunction<SessionData, CallbackOptions> = (
		options: CallbackOptions,
	) => Promise<SessionData>;
}
