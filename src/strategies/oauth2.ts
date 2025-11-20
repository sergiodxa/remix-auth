import { ObjectParser } from "@edgefirst-dev/data/parser";
import {
	CodeChallengeMethod,
	OAuth2Client,
	OAuth2RequestError,
	type OAuth2Tokens,
	UnexpectedErrorResponseBodyError,
	UnexpectedResponseError,
	generateCodeVerifier,
	generateState,
} from "arctic";
import { Strategy } from "../strategy.js";
import { redirect } from "../lib/redirect.js";
import {
	StateStore,
	type CodeVerifier,
	type State,
} from "../lib/state-store.js";
import type { SetCookieInit } from "@remix-run/headers";

type URLConstructor = ConstructorParameters<typeof URL>[0];

const WELL_KNOWN = ".well-known/openid-configuration";

export {
	OAuth2RequestError,
	CodeChallengeMethod,
	UnexpectedResponseError,
	UnexpectedErrorResponseBodyError,
	StateStore,
};

export type { OAuth2Tokens };

/**
 * A strategy for authenticating users using the OAuth 2.0 authorization flow.
 *
 * @template SessionData - The type of data to be stored in the session upon successful authentication.
 * @extends Strategy
 */
export class OAuth2Strategy<SessionData> extends Strategy<
	SessionData,
	OAuth2Strategy.CallbackOptions
> {
	protected client: OAuth2Client;

	constructor(
		protected options: OAuth2Strategy.ConstructorOptions,
		callback: Strategy.CallbackFunction<
			SessionData,
			OAuth2Strategy.CallbackOptions
		>,
	) {
		super(callback);

		this.client = new OAuth2Client(
			options.clientId,
			options.clientSecret,
			options.redirectURI?.toString() ?? null,
		);
	}

	private get cookieName() {
		if (typeof this.options.cookie === "string") {
			return this.options.cookie || "oauth2";
		}
		return this.options.cookie?.name ?? "oauth2";
	}

	private get cookieOptions() {
		if (typeof this.options.cookie !== "object") return {};
		return this.options.cookie ?? {};
	}

	/**
	 * This method handles the specific authentication flow for the strategy.
	 * It extracts the necessary information from the request, validates it,
	 * and calls the callback function to authenticate the user.
	 *
	 * @param request - The incoming request to authenticate
	 * @param options - Override options for this authentication request
	 * @returns A promise that resolves to the authenticated session data
	 * @throws Appropriate error if authentication fails
	 */
	override async authenticate(
		request: Request,
		options: OAuth2Strategy.AuthenticateOptions = {},
	): Promise<SessionData> {
		let url = new URL(request.url);

		let stateFromURL = url.searchParams.get("state");

		if (stateFromURL === null) {
			let { state, codeVerifier, url } = this.createAuthorizationURL(
				options.scopes,
			);

			let audience = options.audience ?? this.options.audience;

			if (audience) {
				if (Array.isArray(audience)) {
					for (let aud of audience) url.searchParams.append("audience", aud);
				} else url.searchParams.append("audience", audience);
			}

			url.search = this.authorizationParams(
				url.searchParams,
				request,
				options,
			).toString();

			let store = StateStore.fromRequest(request, this.cookieName);
			store.set(state as State, codeVerifier as CodeVerifier);

			throw redirect(url.toString(), {
				headers: {
					"Set-Cookie": store
						.toSetCookie(this.cookieName, this.cookieOptions)
						.toString(),
				},
			});
		}

		let store = StateStore.fromRequest(request, this.cookieName);

		if (!store.has()) {
			throw new ReferenceError("Missing state on cookie.");
		}

		if (!store.has(stateFromURL as State)) {
			throw new RangeError("State in URL doesn't match state in cookie.");
		}

		let error = url.searchParams.get("error");

		if (error) {
			let description = url.searchParams.get("error_description");
			let uri = url.searchParams.get("error_uri");
			throw new OAuth2RequestError(error, description, uri, stateFromURL);
		}

		let code = url.searchParams.get("code");

		if (!code) throw new ReferenceError("Missing code in the URL");

		let codeVerifier = store.get(stateFromURL as State);

		if (!codeVerifier) {
			throw new ReferenceError("Missing code verifier on cookie.");
		}

		let tokens = await this.validateAuthorizationCode(code, codeVerifier);

		return await this.callback({ request, tokens });
	}

	protected createAuthorizationURL(scopes?: string[]) {
		let state = generateState();
		let codeVerifier = generateCodeVerifier();

		let url = this.client.createAuthorizationURLWithPKCE(
			this.options.authorizationEndpoint.toString(),
			state,
			this.options.codeChallengeMethod ?? CodeChallengeMethod.S256,
			codeVerifier,
			scopes ?? this.options.scopes ?? [],
		);

		return { state, codeVerifier, url };
	}

	protected validateAuthorizationCode(code: string, codeVerifier: string) {
		return this.client.validateAuthorizationCode(
			this.options.tokenEndpoint.toString(),
			code,
			codeVerifier,
		);
	}

	/**
	 * Return extra parameters to be included in the authorization request.
	 *
	 * Some OAuth 2.0 providers allow additional, non-standard parameters to be
	 * included when requesting authorization.  Since these parameters are not
	 * standardized by the OAuth 2.0 specification, OAuth 2.0-based authentication
	 * strategies can override this function in order to populate these
	 * parameters as required by the provider.
	 *
	 * @param searchParams - The existing URL search parameters for the authorization request
	 * @param request - The request that initiated the authentication flow
	 * @param options - The options passed to the authenticate method
	 * @returns The modified URL search parameters including any additional parameters
	 */
	protected authorizationParams(
		searchParams: URLSearchParams,
		// oxlint-disable-next-line no-unused-vars - needed for overrides
		request: Request,
		// oxlint-disable-next-line no-unused-vars - needed for overrides
		options: OAuth2Strategy.AuthenticateOptions = {},
	): URLSearchParams {
		return new URLSearchParams(searchParams);
	}

	/**
	 * Get a new OAuth2 Tokens object using the refresh token once the previous
	 * access token has expired.
	 * @param refreshToken The refresh token to use to get a new access token
	 * @returns The new OAuth2 tokens object
	 * @example
	 * ```ts
	 * let tokens = await strategy.refreshToken(refreshToken);
	 * console.log(tokens.accessToken());
	 * ```
	 */
	public refreshToken(refreshToken: string, scopes?: string[]) {
		return this.client.refreshAccessToken(
			this.options.tokenEndpoint.toString(),
			refreshToken,
			scopes ?? this.options.scopes ?? [],
		);
	}

	/**
	 * Uses the token revocation endpoint of the identity provider to revoke the
	 * access token and make it invalid.
	 *
	 * @param token The access token to revoke
	 * @example
	 * ```ts
	 * // Get it from where you stored it
	 * let accessToken = await getAccessToken();
	 * await strategy.revokeToken(tokens.access_token);
	 * ```
	 */
	public revokeToken(token: string) {
		let endpoint = this.options.tokenRevocationEndpoint;
		if (!endpoint) throw new Error("Token revocation endpoint is not set.");
		return this.client.revokeToken(endpoint.toString(), token);
	}

	/**
	 * Discover the OAuth2 issuer and create a new OAuth2Strategy instance from
	 * the OIDC configuration that is returned.
	 *
	 * This method will fetch the OIDC configuration from the issuer and create a
	 * new OAuth2Strategy instance with the provided options and callback
	 * function.
	 *
	 * @param uri The URI of the issuer, this can be a full URL or just the domain
	 * @param options The rest of the options to pass to the OAuth2Strategy constructor, clientId, clientSecret, redirectURI, and scopes are required.
	 * @param callback The callback function to use with the OAuth2Strategy instance
	 * @returns A new OAuth2Strategy instance
	 * @example
	 * ```ts
	 * let strategy = await OAuth2Strategy.discover(
	 *   "https://accounts.google.com",
	 *   {
	 *     clientId: "your-client-id",
	 *     clientSecret: "your-client-secret",
	 *     redirectURI: "https://your-app.com/auth/callback",
	 *     scopes: ["openid", "email", "profile"],
	 *   },
	 *   async ({ tokens }) => {
	 *     return getUserProfile(tokens.access_token);
	 *   },
	 * );
	 */
	static async discover<U, M extends OAuth2Strategy<U> = OAuth2Strategy<U>>(
		this: new (
			options: OAuth2Strategy.ConstructorOptions,
			callback: Strategy.CallbackFunction<U, OAuth2Strategy.CallbackOptions>,
		) => M,
		uri: string | URL,
		options: Pick<
			OAuth2Strategy.ConstructorOptions,
			"clientId" | "clientSecret" | "cookie" | "redirectURI" | "scopes"
		> &
			Partial<
				Omit<
					OAuth2Strategy.ConstructorOptions,
					"clientId" | "clientSecret" | "cookie" | "redirectURI" | "scopes"
				>
			>,
		callback: Strategy.CallbackFunction<U, OAuth2Strategy.CallbackOptions>,
	) {
		// Parse the URI into a URL object
		let url = new URL(uri);

		if (!url.pathname.includes("well-known")) {
			// Add the well-known path to the URL if it's not already there
			url.pathname = url.pathname.endsWith("/")
				? `${url.pathname}${WELL_KNOWN}`
				: `${url.pathname}/${WELL_KNOWN}`;
		}

		// Fetch the metadata from the issuer and validate it
		let response = await fetch(url, {
			headers: { Accept: "application/json" },
		});

		// If the response is not OK, throw an error
		if (!response.ok) throw new Error(`Failed to discover issuer at ${url}`);

		// Parse the response body
		let parser = new ObjectParser(await response.json());

		return new this(
			{
				authorizationEndpoint: new URL(parser.string("authorization_endpoint")),
				tokenEndpoint: new URL(parser.string("token_endpoint")),
				tokenRevocationEndpoint: parser.has("revocation_endpoint")
					? new URL(parser.string("revocation_endpoint"))
					: undefined,
				codeChallengeMethod: parser.has("code_challenge_methods_supported")
					? parser.array("code_challenge_methods_supported").includes("S256")
						? CodeChallengeMethod.S256
						: CodeChallengeMethod.Plain
					: undefined,
				...options,
			},
			callback,
		);
	}
}

export namespace OAuth2Strategy {
	export interface CallbackOptions {
		/** The request that triggered the verification flow */
		request: Request;
		/** The OAuth2 tokens retrieved from the identity provider */
		tokens: OAuth2Tokens;
	}

	export interface ConstructorOptions {
		/**
		 * The name of the cookie used to keep state and code verifier around.
		 *
		 * The OAuth2 flow requires generating a random state and code verifier, and
		 * then checking that the state matches when the user is redirected back to
		 * the application. This is done to prevent CSRF attacks.
		 *
		 * The state and code verifier are stored in a cookie, and this option
		 * allows you to customize the name of that cookie if needed.
		 *
		 * @default "oauth2"
		 */
		cookie?: string | (Omit<SetCookieInit, "value"> & { name: string });

		/**
		 * This is the Client ID of your application, provided to you by the Identity
		 * Provider you're using to authenticate users.
		 */
		clientId: string;
		/**
		 * This is the Client Secret of your application, provided to you by the
		 * Identity Provider you're using to authenticate users.
		 */
		clientSecret: string | null;

		/**
		 * The endpoint the Identity Provider asks you to send users to log in, or
		 * authorize your application.
		 */
		authorizationEndpoint: URLConstructor;
		/**
		 * The endpoint the Identity Provider uses to let you exchange an access
		 * code for an access and refresh token.
		 */
		tokenEndpoint: URLConstructor;
		/**
		 * The URL of your application where the Identity Provider will redirect the
		 * user after they've logged in or authorized your application.
		 */
		redirectURI: URLConstructor | null;

		/**
		 * The endpoint the Identity Provider uses to revoke an access or refresh
		 * token, this can be useful to log out the user.
		 */
		tokenRevocationEndpoint?: URLConstructor;

		/**
		 * The scopes you want to request from the Identity Provider, this is a list
		 * of strings that represent the permissions you want to request from the
		 * user.
		 */
		scopes?: string[];

		/**
		 * The code challenge method to use when sending the authorization request.
		 * This is used when the Identity Provider requires a code challenge to be
		 * sent with the authorization request.
		 * @default "CodeChallengeMethod.S256"
		 */
		codeChallengeMethod?: CodeChallengeMethod;

		/**
		 * The audience of the token to request from the Identity Provider. This is
		 * used when the Identity Provider requires a specific audience to be set on
		 * the token.
		 *
		 * This can be a string or an array of strings.
		 */
		audience?: string | string[];
	}

	/**
	 * Options that can be passed to the `authenticate` method.
	 */
	export interface AuthenticateOptions
		extends Pick<ConstructorOptions, "audience" | "scopes"> {}
}
