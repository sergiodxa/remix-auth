import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { Cookie, SetCookie } from "@remix-run/headers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/native";
import { OAuth2Strategy } from "./oauth2.js";
import { CodeVerifier, State, StateStore } from "../lib/state-store.js";

const server = setupServer(
	http.post("https://example.app/token", async () => {
		return HttpResponse.json({
			access_token: "mocked",
			expires_in: 3600,
			refresh_token: "mocked",
			scope: ["user:email", "user:profile"].join(" "),
			token_type: "Bearer",
		});
	}),
);

describe(OAuth2Strategy.name, () => {
	let verify = mock();

	let options = Object.freeze({
		authorizationEndpoint: "https://example.app/authorize",
		tokenEndpoint: "https://example.app/token",
		clientId: "MY_CLIENT_ID",
		clientSecret: "MY_CLIENT_SECRET",
		redirectURI: "https://example.com/callback",
		scopes: ["user:email", "user:profile"],
	} satisfies OAuth2Strategy.ConstructorOptions);

	interface User {
		id: string;
	}

	beforeAll(() => {
		server.listen();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	afterAll(() => {
		server.close();
	});

	test("redirects to authorization url if there's no state", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let request = new Request("https://remix.auth/login");

		let response = await catchResponse(strategy.authenticate(request));

		let redirect = new URL(response.headers.get("location")!);

		let setCookie = new SetCookie(response.headers.get("set-cookie") ?? "");
		let params = new URLSearchParams(setCookie.value);

		expect(redirect.pathname).toBe("/authorize");
		expect(redirect.searchParams.get("response_type")).toBe("code");
		expect(redirect.searchParams.get("client_id")).toBe(options.clientId);
		expect(redirect.searchParams.get("redirect_uri")).toBe(options.redirectURI);
		expect(redirect.searchParams.has("state")).toBeTruthy();
		expect(redirect.searchParams.get("scope")).toBe(options.scopes.join(" "));
		expect(params.get("state")).toBe(redirect.searchParams.get("state"));
		expect(redirect.searchParams.get("code_challenge_method")).toBe("S256");
	});

	test("redirects with the audience if configured", async () => {
		let strategy = new OAuth2Strategy<User>(
			{ ...options, audience: "api.example.com" },
			verify,
		);

		let request = new Request("https://remix.auth/login");

		let response = await catchResponse(strategy.authenticate(request));

		let redirect = new URL(response.headers.get("location")!);

		expect(redirect.searchParams.get("audience")).toBe("api.example.com");
	});

	test("redirects with multiple audience if configured as array", async () => {
		let strategy = new OAuth2Strategy<User>(
			{ ...options, audience: ["api.example.com", "internal.example.com"] },
			verify,
		);

		let request = new Request("https://remix.auth/login");

		let response = await catchResponse(strategy.authenticate(request));

		let redirect = new URL(response.headers.get("location")!);

		expect(redirect.searchParams.getAll("audience")).toEqual([
			"api.example.com",
			"internal.example.com",
		]);
	});

	test("throws if there's no state in the session", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let request = new Request(
			"https://example.com/callback?state=random-state&code=random-code",
		);

		expect(strategy.authenticate(request)).rejects.toThrowError(
			new ReferenceError("Missing state on cookie."),
		);
	});

	test("throws if the state in the url doesn't match the state in the session", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let store = new StateStore();
		store.set("random-state" as State, "random-code-verifier" as CodeVerifier);

		let cookie = new Cookie();
		cookie.set("oauth2", store.toString());

		let request = new Request(
			"https://example.com/callback?state=another-state&code=random-code",
			{ headers: { Cookie: cookie.toString() } },
		);

		expect(strategy.authenticate(request)).rejects.toThrowError(
			new RangeError("State in URL doesn't match state in cookie."),
		);
	});

	test("calls verify with the tokens and request", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let store = new StateStore();
		store.set("random-state" as State, "random-code-verifier" as CodeVerifier);

		let cookie = new Cookie();
		cookie.set(store.toSetCookie()?.name as string, store.toString());

		let request = new Request(
			"https://example.com/callback?state=random-state&code=random-code",
			{ headers: { cookie: cookie.toString() } },
		);

		await strategy.authenticate(request);

		expect(verify).toHaveBeenCalled();
	});

	test("returns the result of verify", () => {
		let user = { id: "123" };
		verify.mockResolvedValueOnce(user);

		let strategy = new OAuth2Strategy<User>(options, verify);

		let store = new StateStore();
		store.set("random-state" as State, "random-code-verifier" as CodeVerifier);

		let cookie = new Cookie();
		cookie.set(store.toSetCookie()?.name as string, store.toString());

		let request = new Request(
			"https://example.com/callback?state=random-state&code=random-code",
			{ headers: { cookie: cookie.toString() } },
		);

		expect(strategy.authenticate(request)).resolves.toEqual(user);
	});

	test("discovers provider configuration", async () => {
		let handler = mock().mockImplementationOnce(() =>
			HttpResponse.json({
				authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
				token_endpoint: "https://oauth2.googleapis.com/token",
				revocation_endpoint: "https://oauth2.googleapis.com/revoke",
				code_challenge_methods_supported: ["plain", "S256"],
			}),
		);

		server.use(
			http.get(
				"https://accounts.google.com/.well-known/openid-configuration",
				handler,
			),
		);

		await OAuth2Strategy.discover(
			"https://accounts.google.com",
			{
				clientId: options.clientId,
				clientSecret: options.clientSecret,
				redirectURI: options.redirectURI,
				scopes: options.scopes,
			},
			verify,
		);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("discover in a subclass returns the subclass", async () => {
		class SubStrategy<U> extends OAuth2Strategy<U> {}

		let handler = mock().mockImplementationOnce(() =>
			HttpResponse.json({
				authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
				token_endpoint: "https://oauth2.googleapis.com/token",
				revocation_endpoint: "https://oauth2.googleapis.com/revoke",
				code_challenge_methods_supported: ["plain", "S256"],
			}),
		);

		server.use(
			http.get(
				"https://accounts.google.com/.well-known/openid-configuration",
				handler,
			),
		);

		let strategy = await SubStrategy.discover<User, SubStrategy<User>>(
			"https://accounts.google.com",
			{
				clientId: options.clientId,
				clientSecret: options.clientSecret,
				redirectURI: options.redirectURI,
				scopes: options.scopes,
			},
			verify,
		);

		expect(strategy).toBeInstanceOf(SubStrategy);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("handles race condition of state and code verifier", async () => {
		let verify = mock().mockImplementation(() => ({ id: "123" }));
		let strategy = new OAuth2Strategy<User>(options, verify);

		let responses = await Promise.all(
			Array.from({ length: random() }, () =>
				catchResponse(
					strategy.authenticate(new Request("https://remix.auth/login")),
				),
			),
		);

		let setCookies: SetCookie[] = responses
			.flatMap((res) => res.headers.getSetCookie())
			.map((header) => new SetCookie(header));

		let cookie = new Cookie();

		for (let setCookie of setCookies) {
			cookie.set(setCookie.name as string, setCookie.value as string);
		}

		let urls = setCookies.map((setCookie) => {
			let params = new URLSearchParams(setCookie.value);
			let url = new URL("https://remix.auth/callback");
			url.searchParams.set("state", params.get("state") as string);
			url.searchParams.set("code", crypto.randomUUID());
			return url;
		});

		await Promise.all(
			urls.map((url) =>
				strategy.authenticate(
					new Request(url, { headers: { cookie: cookie.toString() } }),
				),
			),
		);

		expect(verify).toHaveBeenCalledTimes(responses.length);
	});

	test("override audience per authentication", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let request = new Request("https://remix.auth/login");

		let response = await catchResponse(
			strategy.authenticate(request, {
				audience: "custom-audience.example.com",
			}),
		);

		let redirect = new URL(response.headers.get("location")!);

		expect(redirect.searchParams.get("audience")).toBe(
			"custom-audience.example.com",
		);
	});

	test("override scopes per authentication", async () => {
		let strategy = new OAuth2Strategy<User>(options, verify);

		let request = new Request("https://remix.auth/login");

		let response = await catchResponse(
			strategy.authenticate(request, {
				scopes: ["custom:scope1", "custom:scope2"],
			}),
		);

		let redirect = new URL(response.headers.get("location")!);

		expect(redirect.searchParams.get("scope")).toBe(
			"custom:scope1 custom:scope2",
		);
	});
});

function isResponse(value: unknown): value is Response {
	return value instanceof Response;
}

async function catchResponse(promise: Promise<unknown>) {
	try {
		await promise;
		throw new Error("Should have failed.");
	} catch (error) {
		if (isResponse(error)) return error;
		throw error;
	}
}

function random(min = 1, max = 10) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
