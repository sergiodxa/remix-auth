/**
 * The Strategy class is the base class every strategy should extend.
 *
 * This class receives two generics, a User and a VerifyParams.
 * - User is the type of the user data.
 * - VerifyParams is the type of the params the verify callback will receive from the strategy.
 */
export abstract class Strategy<User, VerifyOptions> {
	/**
	 * The name of the strategy.
	 * This will be used by the Authenticator to identify and retrieve the
	 * strategy.
	 */
	public abstract name: string;

	public constructor(
		protected verify: Strategy.VerifyFunction<User, VerifyOptions>,
	) {}

	/**
	 * The authentication flow of the strategy.
	 *
	 * This method receives the Request from the authenticator we want to
	 * authenticate.
	 *
	 * At the end of the flow, it will return a the User data to be used by the
	 * application.
	 */
	public abstract authenticate(request: Request): Promise<User>;
}

export namespace Strategy {
	/**
	 * A function which will be called to find the user using the information the
	 * strategy got from the request.
	 *
	 * @param params The params from the strategy.
	 * @returns The user data.
	 * @throws {AuthorizationError} If the user was not found. Any other error will be ignored and thrown again by the strategy.
	 */
	export type VerifyFunction<User, VerifyParams> = (
		params: VerifyParams,
	) => Promise<User>;
}
