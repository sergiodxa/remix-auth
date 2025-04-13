/**
 * The Strategy class is the abstract base class that all authentication
 * strategies must extend.
 *
 * Strategies implement the specific authentication logic for different
 * authentication methods (e.g., form-based, OAuth, etc.) and are registered
 * with an Authenticator instance.
 *
 * @typeParam User - The type of user object that will be returned after authentication
 * @typeParam VerifyOptions - The type of parameters that the verify callback will receive from the strategy
 *
 * @example
 * ```ts
 * // Example of a custom strategy implementation
 * class MyCustomStrategy extends Strategy<User, { username: string; password: string }> {
 *   name = "my-custom";
 *
 *   async authenticate(request: Request): Promise<User> {
 *     // Implementation details...
 *   }
 * }
 * ```
 */
export abstract class Strategy<User, VerifyOptions> {
	/**
	 * The unique name of the strategy.
	 *
	 * This name is used by the Authenticator to identify and retrieve the
	 * strategy when authentication is requested. If no custom name is provided
	 * when registering with the Authenticator, this property will be used as the
	 * default name.
	 */
	public abstract name: string;

	/**
	 * Creates a new Strategy instance.
	 *
	 * @param verify - A function that validates the credentials and returns a user or throws an error if authentication fails
	 */
	public constructor(
		protected verify: Strategy.VerifyFunction<User, VerifyOptions>,
	) {}

	/**
	 * The core authentication method that each strategy must implement.
	 *
	 * This method handles the specific authentication flow for the strategy.
	 * It extracts the necessary information from the request, validates it,
	 * and calls the verify function to authenticate the user.
	 *
	 * @param request - The incoming request to authenticate
	 * @returns A promise that resolves to the authenticated user data
	 * @throws Appropriate error if authentication fails
	 */
	public abstract authenticate(request: Request): Promise<User>;
}

export namespace Strategy {
	/**
	 * A function type for the verification callback used by authentication
	 * strategies.
	 *
	 * The verify function is responsible for validating credentials extracted by
	 * the strategy and returning the corresponding user object if authentication
	 * succeeds.
	 *
	 * @typeParam User - The type of user object that will be returned after authentication
	 * @typeParam VerifyParams - The type of parameters that will be passed to the verify function by the strategy
	 *
	 * @param params - The authentication parameters extracted by the strategy (e.g., username/password, token, etc.)
	 * @returns A promise that resolves to the authenticated user data
	 * @throws Should throw an appropriate error if authentication fails (e.g., invalid credentials)
	 *
	 * @example
	 * ```ts
	 * // Example verify function for a form strategy
	 * const verify: Strategy.VerifyFunction<User, { form: FormData }> = async ({ form }) => {
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
	 * ```
	 */
	export type VerifyFunction<User, VerifyParams> = (
		params: VerifyParams,
	) => Promise<User>;
}
