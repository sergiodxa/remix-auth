import { describe, test, expect } from "bun:test";
import { Authenticator } from "./index.js";
import { Strategy } from "./strategy.js";

class FormStrategy<SessionData> extends Strategy<
	SessionData,
	FormStrategy.CallbackOptions
> {
	async authenticate(request: Request): Promise<SessionData> {
		let formData = await request.formData();
		return await this.callback(formData);
	}
}

namespace FormStrategy {
	export type CallbackOptions = FormData;
}

class LoginStrategy<SessionData> extends Strategy<
	SessionData,
	LoginStrategy.CallbackOptions
> {
	async authenticate(
		request: Request,
		usernameField: string,
		passwordField = "password",
	): Promise<SessionData> {
		let formData = await request.formData();
		return await this.callback({
			form: formData,
			fields: {
				username: usernameField,
				password: passwordField,
			},
		});
	}
}

namespace LoginStrategy {
	export interface CallbackOptions {
		form: FormData;
		fields: { username: string; password: string };
	}

	export interface AuthenticateOptions {
		usernameField: string;
		passwordField: string;
	}
}

describe(Authenticator, () => {
	const auth = new Authenticator({
		strategies: {
			form: new FormStrategy(async (form) => {
				let username = form.get("username") as string;
				let password = form.get("password") as string;

				if (username && password) return { userId: "124" };
				throw new Error("Invalid signup data");
			}),

			login: new LoginStrategy(async ({ form, fields }) => {
				let username = form.get(fields.username) as string;
				let password = form.get(fields.password) as string;

				if (username && password) return { userId: "124" };
				throw new Error("Invalid signup data");
			}),
		},
	});

	test("authenticate without options", async () => {
		let formData = new FormData();
		formData.append("username", "user");
		formData.append("password", "pass");

		let request = new Request("https://example.com/form", {
			method: "POST",
			body: formData,
		});

		let sessionData = await auth.authenticate("form", request);

		expect(sessionData).toEqual({ userId: "124" });
	});

	test("authenticate with REQUIRED options", async () => {
		let formData = new FormData();
		formData.append("user", "user");
		formData.append("password", "pass");

		let request = new Request("https://example.com/login", {
			method: "POST",
			body: formData,
		});

		let sessionData = await auth.authenticate("login", request, "user");

		expect(sessionData).toEqual({ userId: "124" });
	});

	test("access strategies", () => {
		expect(auth.strategies.form).toBeInstanceOf(FormStrategy);
		expect(auth.strategies.login).toBeInstanceOf(LoginStrategy);
	});
});
