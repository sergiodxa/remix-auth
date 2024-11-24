import { describe, expect, test } from "bun:test";
import { type Cookie, createCookie } from "react-router";
import { z } from "zod";
import { Strategy } from "./strategy";

type User = number;
type VerifyOptions = { userId: string };

class SimpleStrategy extends Strategy<User, VerifyOptions> {
	name = "mock";

	public authenticate(request: Request): Promise<User> {
		let url = new URL(request.url);
		let userId = url.searchParams.get("userId");
		if (!userId) throw new Error("Invalid credentials");
		return this.verify({ userId });
	}
}

describe(SimpleStrategy.name, () => {
	test("#constructor", () => {
		let strategy = new SimpleStrategy(async ({ userId }) => Number(userId));
		expect(strategy).toBeInstanceOf(Strategy);
	});

	test("#authenticate (success)", async () => {
		let strategy = new SimpleStrategy(async ({ userId }) => Number(userId));
		let request = new Request("http://remix.auth/test?userId=1");
		expect(strategy.authenticate(request)).resolves.toBe(1);
	});

	test("#authenticate (failure)", async () => {
		let strategy = new SimpleStrategy(async ({ userId }) => Number(userId));
		let request = new Request("http://remix.auth/test");
		expect(() => strategy.authenticate(request)).toThrow("Invalid credentials");
	});
});

class CookieStrategy extends Strategy<User, VerifyOptions> {
	name = "cookie";

	constructor(
		protected cookie: Cookie,
		verify: Strategy.VerifyFunction<User, VerifyOptions>,
	) {
		super(verify);
	}

	public async authenticate(
		request: Request,
		_: Strategy.AuthenticateOptions,
	): Promise<User> {
		let data = await this.cookie.parse(request.headers.get("Cookie"));
		let userId = z.string().nullable().parse(data);
		if (!userId) throw new Error("Invalid credentials");
		return this.verify({ userId });
	}
}

describe(CookieStrategy.name, () => {
	let cookie = createCookie("auth", { secrets: ["s3cr3t"] });

	test("#constructor", () => {
		let strategy = new CookieStrategy(cookie, async ({ userId }) =>
			Number(userId),
		);
		expect(strategy).toBeInstanceOf(Strategy);
	});

	test("#authenticate (success)", async () => {
		let strategy = new CookieStrategy(cookie, async ({ userId }) =>
			Number(userId),
		);
		let request = new Request("http://remix.auth/test", {
			headers: { Cookie: await cookie.serialize("1") },
		});

		expect(strategy.authenticate(request, { name: "cookie" })).resolves.toBe(1);
	});

	test("#authenticate (failure)", async () => {
		let strategy = new CookieStrategy(cookie, async ({ userId }) =>
			Number(userId),
		);
		let request = new Request("http://remix.auth/test");

		expect(() => strategy.authenticate(request, { name: "cookie" })).toThrow(
			"Invalid credentials",
		);
	});
});
