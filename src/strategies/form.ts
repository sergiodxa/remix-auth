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
	 * @throws Appropriate error if authentication fails
	 */
	override async authenticate(request: Request): Promise<SessionData> {
		const form = await request.formData();
		return await this.callback({ form });
	}
}

export namespace FormStrategy {
	/**
	 * Options that are passed to the callback function.
	 */
	export interface CallbackOptions {
		/**
		 * The parsed form data from the request.
		 */
		form: FormData;
	}
}
