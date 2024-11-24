import type { AppLoadContext } from "react-router";

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
	 * This method receives the Request to authenticator and the session storage
	 * to use from the Authenticator. It may receive a custom callback.
	 *
	 * At the end of the flow, it will return a Response to be used by the
	 * application.
	 */
	public abstract authenticate(
		request: Request,
		options: Strategy.AuthenticateOptions,
	): Promise<User>;
}

export namespace Strategy {
	/**
	 * Extra information from the Authenticator to the strategy
	 */
	export interface AuthenticateOptions {
		/**
		 * The name used to register the strategy
		 */
		name: string;
		/**
		 * The context object received by the loader or action.
		 * This can be used by the strategy if needed.
		 */
		context?: AppLoadContext;
	}

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
