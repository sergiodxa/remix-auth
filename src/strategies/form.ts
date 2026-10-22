import { Strategy } from "../strategy.js";

/**
 * A strategy for authenticating users based on form data submitted in a
 * request.
 *
 * @template SessionData - The type of data to be stored in the session upon successful authentication.
 * @extends Strategy
 */
export class FormStrategy<SessionData> extends Strategy<
	SessionData,
	FormStrategy.CallbackOptions
> {
	/**
	 * This method handles the specific authentication flow for the strategy.
	 * It extracts the necessary information from the request, validates it,
	 * and calls the callback function to authenticate the user.
	 *
	 * @param request - The incoming request to authenticate
	 * @returns A promise that resolves to the authenticated session data
	 * @throws {BodyUsedError} If the request body was already consumed
	 * @throws Appropriate error if authentication fails
	 */
	override async authenticate(request: Request): Promise<SessionData> {
		if (request.bodyUsed) throw new BodyUsedError();
		let form = await request.clone().formData();
		return await this.callback({ form, request });
	}
}

/**
 * Thrown when `authenticator.authenticate` is called with a FormStrategy and
 * the request body was already read.
 *
 * To fix it, move body-dependent logic into the strategy callback, or clone the
 * request before reading (`request.clone().formData()`).
 *
 * @example
 * let formData = await request.clone().formData();
 * // do something with formData
 * let sessionData = await authenticator.authenticate("form", request);
 *
 * @example
 * new FormStrategy(async ({ form }) => {
 *   // do something with form here
 * });
 */
export class BodyUsedError extends Error {
	override name = "BodyUsedError";

	constructor() {
		super(
			"Your request.body was already used. This means you called `request.formData()` or another way to read the body before using Remix Auth's FormStrategy. Because FormStrategy needs to read the body, ensure that you either don't read it yourself by moving your logic to the strategy callback or clone the request before reading the body with `request.clone().formData()`.",
		);
	}
}

export namespace FormStrategy {
	/**
	 * Options that are passed to the callback function.
	 */
	export interface CallbackOptions {
		/**
		 * The parsed form data from the request.
		 *
		 * Here you can read any input value using the FormData API.
		 */
		form: FormData;

		/**
		 * The request that triggered the authentication.
		 */
		request: Request;
	}
}
