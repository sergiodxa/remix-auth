/**
 * OAuth 2.0 token response helpers.
 *
 * Adapted from Arctic by pilcrowOnPaper (MIT).
 */

import { encodeBase64urlNoPadding } from "./encoding.js";

export class OAuth2Tokens {
	constructor(public data: object) {}

	tokenType(): string {
		if ("token_type" in this.data && typeof this.data.token_type === "string") {
			return this.data.token_type;
		}
		throw new Error("Missing or invalid 'token_type' field");
	}

	accessToken(): string {
		if (
			"access_token" in this.data &&
			typeof this.data.access_token === "string"
		) {
			return this.data.access_token;
		}
		throw new Error("Missing or invalid 'access_token' field");
	}

	accessTokenExpiresInSeconds(): number {
		if ("expires_in" in this.data && typeof this.data.expires_in === "number") {
			return this.data.expires_in;
		}
		throw new Error("Missing or invalid 'expires_in' field");
	}

	accessTokenExpiresAt(): Date {
		return new Date(Date.now() + this.accessTokenExpiresInSeconds() * 1000);
	}

	hasRefreshToken(): boolean {
		return (
			"refresh_token" in this.data &&
			typeof this.data.refresh_token === "string"
		);
	}

	refreshToken(): string {
		if (
			"refresh_token" in this.data &&
			typeof this.data.refresh_token === "string"
		) {
			return this.data.refresh_token;
		}
		throw new Error("Missing or invalid 'refresh_token' field");
	}

	hasScopes(): boolean {
		return "scope" in this.data && typeof this.data.scope === "string";
	}

	scopes(): string[] {
		if ("scope" in this.data && typeof this.data.scope === "string") {
			return this.data.scope.split(" ");
		}
		throw new Error("Missing or invalid 'scope' field");
	}

	idToken(): string {
		if ("id_token" in this.data && typeof this.data.id_token === "string") {
			return this.data.id_token;
		}
		throw new Error("Missing or invalid field 'id_token'");
	}
}

export async function createS256CodeChallenge(
	codeVerifier: string,
): Promise<string> {
	let data = new TextEncoder().encode(codeVerifier);
	let digest = await crypto.subtle.digest("SHA-256", data);
	return encodeBase64urlNoPadding(new Uint8Array(digest));
}

export function generateCodeVerifier(): string {
	let randomValues = new Uint8Array(32);
	crypto.getRandomValues(randomValues);
	return encodeBase64urlNoPadding(randomValues);
}

export function generateState(): string {
	let randomValues = new Uint8Array(32);
	crypto.getRandomValues(randomValues);
	return encodeBase64urlNoPadding(randomValues);
}
