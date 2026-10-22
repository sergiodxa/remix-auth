import { describe, expect, test } from "bun:test";
import {
	CodeChallengeMethod,
	OAuth2Client,
	OAuth2Tokens,
	createS256CodeChallenge,
	generateCodeVerifier,
	generateState,
} from "./index.js";

describe("oauth2 helpers", () => {
	test("generateState and generateCodeVerifier return base64url without padding", () => {
		let state = generateState();
		let verifier = generateCodeVerifier();

		expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(state).not.toInclude("=");
		expect(verifier).not.toInclude("=");
		expect(state.length).toBeGreaterThanOrEqual(40);
		expect(verifier.length).toBeGreaterThanOrEqual(40);
	});

	test("createS256CodeChallenge is deterministic for a verifier", async () => {
		let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
		let a = await createS256CodeChallenge(verifier);
		let b = await createS256CodeChallenge(verifier);

		expect(a).toBe(b);
		// RFC 7636 appendix B (base64url, no padding)
		expect(a).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
	});

	test("OAuth2Client builds a PKCE authorization URL", async () => {
		let client = new OAuth2Client(
			"client-id",
			"client-secret",
			"https://app.example/callback",
		);

		let url = await client.createAuthorizationURLWithPKCE(
			"https://idp.example/authorize",
			"state-value",
			CodeChallengeMethod.S256,
			"dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
			["openid", "email"],
		);

		expect(url.origin + url.pathname).toBe("https://idp.example/authorize");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"https://app.example/callback",
		);
		expect(url.searchParams.get("state")).toBe("state-value");
		expect(url.searchParams.get("scope")).toBe("openid email");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("code_challenge")).toBe(
			"E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		);
	});

	test("OAuth2Tokens reads token response fields", () => {
		let tokens = new OAuth2Tokens({
			token_type: "Bearer",
			access_token: "access",
			expires_in: 3600,
			refresh_token: "refresh",
			scope: "a b",
			id_token: "id",
		});

		expect(tokens.tokenType()).toBe("Bearer");
		expect(tokens.accessToken()).toBe("access");
		expect(tokens.accessTokenExpiresInSeconds()).toBe(3600);
		expect(tokens.hasRefreshToken()).toBe(true);
		expect(tokens.refreshToken()).toBe("refresh");
		expect(tokens.hasScopes()).toBe(true);
		expect(tokens.scopes()).toEqual(["a", "b"]);
		expect(tokens.idToken()).toBe("id");
	});
});
