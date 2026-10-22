/**
 * Built-in OAuth 2.0 authorization-code client used by `OAuth2Strategy`.
 *
 * Replaces the deprecated `arctic` dependency. Core protocol helpers are
 * adapted from Arctic by pilcrowOnPaper; see `./LICENSE` for the upstream MIT
 * copyright and permission notice that ships with this module.
 */

export { CodeChallengeMethod, OAuth2Client } from "./client.js";
export {
	OAuth2FetchError,
	OAuth2RequestError,
	UnexpectedErrorResponseBodyError,
	UnexpectedResponseError,
} from "./request.js";
export {
	createS256CodeChallenge,
	generateCodeVerifier,
	generateState,
	OAuth2Tokens,
} from "./tokens.js";
