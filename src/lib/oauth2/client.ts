/**
 * Generic OAuth 2.0 authorization-code client (with PKCE).
 *
 * Adapted from Arctic by pilcrowOnPaper (MIT). PKCE S256 uses Web Crypto
 * (`crypto.subtle`), so `createAuthorizationURLWithPKCE` is async.
 */

import {
	createOAuth2Request,
	encodeBasicCredentials,
	sendTokenRequest,
	sendTokenRevocationRequest,
} from "./request.js";
import { createS256CodeChallenge, type OAuth2Tokens } from "./tokens.js";

export enum CodeChallengeMethod {
	S256 = 0,
	Plain = 1,
}

export class OAuth2Client {
	clientId: string;
	private clientPassword: string | null;
	private redirectURI: string | null;

	constructor(
		clientId: string,
		clientPassword: string | null,
		redirectURI: string | null,
	) {
		this.clientId = clientId;
		this.clientPassword = clientPassword;
		this.redirectURI = redirectURI;
	}

	createAuthorizationURL(
		authorizationEndpoint: string,
		state: string,
		scopes: string[],
	): URL {
		let url = new URL(authorizationEndpoint);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", this.clientId);
		if (this.redirectURI !== null) {
			url.searchParams.set("redirect_uri", this.redirectURI);
		}
		url.searchParams.set("state", state);
		if (scopes.length > 0) {
			url.searchParams.set("scope", scopes.join(" "));
		}
		return url;
	}

	async createAuthorizationURLWithPKCE(
		authorizationEndpoint: string,
		state: string,
		codeChallengeMethod: CodeChallengeMethod,
		codeVerifier: string,
		scopes: string[],
	): Promise<URL> {
		let url = new URL(authorizationEndpoint);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", this.clientId);
		if (this.redirectURI !== null) {
			url.searchParams.set("redirect_uri", this.redirectURI);
		}
		url.searchParams.set("state", state);
		if (codeChallengeMethod === CodeChallengeMethod.S256) {
			let codeChallenge = await createS256CodeChallenge(codeVerifier);
			url.searchParams.set("code_challenge_method", "S256");
			url.searchParams.set("code_challenge", codeChallenge);
		} else if (codeChallengeMethod === CodeChallengeMethod.Plain) {
			url.searchParams.set("code_challenge_method", "plain");
			url.searchParams.set("code_challenge", codeVerifier);
		}
		if (scopes.length > 0) {
			url.searchParams.set("scope", scopes.join(" "));
		}
		return url;
	}

	async validateAuthorizationCode(
		tokenEndpoint: string,
		code: string,
		codeVerifier: string | null,
	): Promise<OAuth2Tokens> {
		let body = new URLSearchParams();
		body.set("grant_type", "authorization_code");
		body.set("code", code);
		if (this.redirectURI !== null) {
			body.set("redirect_uri", this.redirectURI);
		}
		if (codeVerifier !== null) {
			body.set("code_verifier", codeVerifier);
		}
		if (this.clientPassword === null) {
			body.set("client_id", this.clientId);
		}
		let request = createOAuth2Request(tokenEndpoint, body);
		if (this.clientPassword !== null) {
			let encodedCredentials = encodeBasicCredentials(
				this.clientId,
				this.clientPassword,
			);
			request.headers.set("Authorization", `Basic ${encodedCredentials}`);
		}
		return await sendTokenRequest(request);
	}

	async refreshAccessToken(
		tokenEndpoint: string,
		refreshToken: string,
		scopes: string[],
	): Promise<OAuth2Tokens> {
		let body = new URLSearchParams();
		body.set("grant_type", "refresh_token");
		body.set("refresh_token", refreshToken);
		if (this.clientPassword === null) {
			body.set("client_id", this.clientId);
		}
		if (scopes.length > 0) {
			body.set("scope", scopes.join(" "));
		}
		let request = createOAuth2Request(tokenEndpoint, body);
		if (this.clientPassword !== null) {
			let encodedCredentials = encodeBasicCredentials(
				this.clientId,
				this.clientPassword,
			);
			request.headers.set("Authorization", `Basic ${encodedCredentials}`);
		}
		return await sendTokenRequest(request);
	}

	async revokeToken(
		tokenRevocationEndpoint: string,
		token: string,
	): Promise<void> {
		let body = new URLSearchParams();
		body.set("token", token);
		if (this.clientPassword === null) {
			body.set("client_id", this.clientId);
		}
		let request = createOAuth2Request(tokenRevocationEndpoint, body);
		if (this.clientPassword !== null) {
			let encodedCredentials = encodeBasicCredentials(
				this.clientId,
				this.clientPassword,
			);
			request.headers.set("Authorization", `Basic ${encodedCredentials}`);
		}
		await sendTokenRevocationRequest(request);
	}
}
