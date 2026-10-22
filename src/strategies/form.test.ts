import { describe, expect, test } from "bun:test";
import { BodyUsedError, FormStrategy } from "./form.js";

describe(FormStrategy.name, () => {
	test("authenticates with form data and request", async () => {
		let strategy = new FormStrategy(async ({ form, request }) => {
			expect(request.url).toBe("https://example.com/login");
			return {
				username: form.get("username"),
				password: form.get("password"),
			};
		});

		let formData = new FormData();
		formData.set("username", "user");
		formData.set("password", "pass");

		let request = new Request("https://example.com/login", {
			method: "POST",
			body: formData,
		});

		await expect(strategy.authenticate(request)).resolves.toEqual({
			username: "user",
			password: "pass",
		});
	});

	test("throws BodyUsedError when the body was already consumed", async () => {
		let strategy = new FormStrategy(async () => ({ id: "1" }));

		let formData = new FormData();
		formData.set("username", "user");

		let request = new Request("https://example.com/login", {
			method: "POST",
			body: formData,
		});

		await request.formData();

		await expect(strategy.authenticate(request)).rejects.toBeInstanceOf(
			BodyUsedError,
		);
	});

	test("still works when the caller cloned the request first", async () => {
		let strategy = new FormStrategy(async ({ form }) => ({
			username: String(form.get("username")),
		}));

		let formData = new FormData();
		formData.set("username", "user");

		let request = new Request("https://example.com/login", {
			method: "POST",
			body: formData,
		});

		let peek = await request.clone().formData();
		expect(peek.get("username")).toBe("user");

		await expect(strategy.authenticate(request)).resolves.toEqual({
			username: "user",
		});
	});
});
