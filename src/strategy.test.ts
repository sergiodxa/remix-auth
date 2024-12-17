import { describe, expect, test } from "bun:test";
import { Cookie } from "@mjackson/headers";
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
		protected cookieName: string,
		verify: Strategy.VerifyFunction<User, VerifyOptions>,
	) {
		super(verify);
	}

	public async authenticate(request: Request): Promise<User> {
		let cookie = new Cookie(request.headers.get("cookie") ?? "");
		let userId = cookie.get(this.cookieName);
		if (!userId) throw new Error("Invalid credentials");
		return this.verify({ userId });
	}
}

describe(CookieStrategy.name, () => {
	test("#constructor", () => {
		let strategy = new CookieStrategy("auth", async ({ userId }) =>
			Number(userId),
		);
		expect(strategy).toBeInstanceOf(Strategy);
	});

	test("#authenticate (success)", async () => {
		let strategy = new CookieStrategy("auth", async ({ userId }) =>
			Number(userId),
		);

		let cookie = new Cookie();
		cookie.set("auth", "1");

		let request = new Request("http://remix.auth/test", {
			headers: { cookie: cookie.toString() },
		});

		expect(strategy.authenticate(request)).resolves.toBe(1);
	});

	test("#authenticate (failure)", async () => {
		let strategy = new CookieStrategy("auth", async ({ userId }) =>
			Number(userId),
		);
		let request = new Request("http://remix.auth/test");

		expect(() => strategy.authenticate(request)).toThrow("Invalid credentials");
	});
});
