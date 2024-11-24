import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Authenticator } from "./index.js";
import { Strategy } from "./strategy.js";

class MockStrategy<User> extends Strategy<User, Record<string, never>> {
	name = "mock";

	async authenticate() {
		let user = await this.verify({});
		if (user) return user;
		throw new Error("Invalid credentials");
	}
}

describe(Authenticator.name, () => {
	beforeEach(() => mock.restore());

	test("#constructor", () => {
		let auth = new Authenticator();
		expect(auth).toBeInstanceOf(Authenticator);
	});

	test("#use", () => {
		let auth = new Authenticator();

		expect(auth.use(new MockStrategy(async () => ({ id: 1 })))).toBe(auth);

		expect(
			auth.authenticate("mock", new Request("http://remix.auth/test")),
		).resolves.toEqual({ id: 1 });
	});

	test("#unuse", () => {
		let auth = new Authenticator().use(new MockStrategy(async () => null));

		expect(auth.unuse("mock")).toBe(auth);

		expect(
			async () =>
				await auth.authenticate("mock", new Request("http://remix.auth/test")),
		).toThrow(new ReferenceError("Strategy mock not found."));
	});

	test("#authenticate", async () => {
		let auth = new Authenticator().use(
			new MockStrategy(async () => ({ id: 1 })),
		);

		expect(
			await auth.authenticate("mock", new Request("http://remix.auth/test")),
		).toEqual({ id: 1 });
	});
});
