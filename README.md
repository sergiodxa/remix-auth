![](/assets/header.png)

# Remix Auth

### Simple Authentication for [Remix](https://remix.run) and [React Router](https://reactrouter.com) apps.

## Support the Project

If you find Remix Auth useful, please consider [sponsoring the project](https://github.com/sponsors/sergiodxa). Your support helps maintain this stable, production-ready library!

## Features

- Full **Server-Side** Authentication
- Complete **TypeScript** Support
- **Strategy**-based Authentication
- Implement **custom** strategies

## Overview

Remix Auth is a complete open-source authentication solution for Remix and React Router applications.

Heavily inspired by [Passport.js](https://passportjs.org), but completely rewrote it from scratch to work on top of the [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). Remix Auth can be dropped in to any Remix or React Router based application with minimal setup.

As with Passport.js, it uses the strategy pattern to support the different authentication flows. Each strategy is published individually as a separate npm package.

## Installation

```bash
npm install remix-auth
```

## Supported Authentication Methods

Remix Auth supports various authentication methods through its strategy system. Here are some popular strategies:

- [Form Strategy](https://github.com/sergiodxa/remix-auth-form) - Username/password form-based authentication
- [OAuth 2.0](https://github.com/sergiodxa/remix-auth-oauth2) - Generic OAuth 2.0 authentication
- [GitHub](https://github.com/sergiodxa/remix-auth-github) - GitHub authentication

For a complete list of community-maintained strategies, check the [Community Strategies discussion](https://github.com/sergiodxa/remix-auth/discussions/111).

> [!TIP]
> Check in the strategies what versions of Remix Auth they support, as they may not be updated to the latest version.

## Usage

Import the `Authenticator` class and instantiate it with your authentication strategies.

```ts
// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { createCookieSessionStorage } from "react-router";

// Create a session storage
export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "__session",
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secrets: ["s3cr3t"], // replace this with an actual secret
		secure: process.env.NODE_ENV === "production",
	},
});

// Your authentication logic (replace with your actual DB/API calls)
async function login(email: string, password: string) {
	// Verify credentials and return user data or throw an error
	const user = await db.user.findUnique({ where: { email } });
	if (!user || !(await bcrypt.compare(password, user.password))) {
		throw new Error("Invalid email or password");
	}

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		// ... other user properties
	};
}

// Create an instance of the authenticator with your strategies
export const authenticator = new Authenticator({
	strategies: {
		// Form strategy for username/password authentication
		"user-pass": new FormStrategy(async ({ form }) => {
			const email = form.get("email") as string;
			const password = form.get("password") as string;

			if (!email || !password) {
				throw new Error("Email and password are required");
			}

			// The return type will be automatically inferred from your login function
			return await login(email, password);
		}),

		// You can add multiple strategies with different names
		// This is useful for having different authentication flows
	},
});

// Infer the session data type from the authenticator
export type SessionData = Authenticator.infer<typeof authenticator>;
```

The `SessionData` type is automatically inferred from your strategies using `Authenticator.infer<typeof authenticator>`. This ensures type safety and eliminates the need to manually define the session data type. The type will be whatever your strategies return after identifying the authenticated user - it can be the complete user data, a string with a token, or any other data structure you need.

Each strategy is registered with a name (the key in the strategies object), which is used to identify it during the authentication process. You can use the same strategy multiple times with different names, which is especially useful for OAuth2 strategies.

Once we have at least one strategy registered, it is time to set up the routes.

First, create a `/login` page. Here we will render a form to get the email and password of the user and use Remix Auth to authenticate the user.

```tsx
// app/routes/login.tsx or equivalent route file
import { Form, data, redirect } from "react-router";
import { authenticator, sessionStorage } from "~/services/auth.server";

// Import this from correct place for your route
import type { Route } from "./+types";

// First we create our UI with the form doing a POST and the inputs with
// the names we are going to use in the strategy
export default function Component({ actionData }: Route.ComponentProps) {
	return (
		<div>
			<h1>Login</h1>

			{actionData?.error ? (
				<div className="error">{actionData.error}</div>
			) : null}

			<Form method="post">
				<div>
					<label htmlFor="email">Email</label>
					<input type="email" name="email" id="email" required />
				</div>

				<div>
					<label htmlFor="password">Password</label>
					<input
						type="password"
						name="password"
						id="password"
						autoComplete="current-password"
						required
					/>
				</div>

				<button type="submit">Sign In</button>
			</Form>
		</div>
	);
}

// Second, we need to export an action function, here we will use the
// `authenticator.authenticate` method
export async function action({ request }: Route.ActionArgs) {
	try {
		// we call the method with the name of the strategy we want to use and the
		// request object
		let sessionData = await authenticator.authenticate("user-pass", request);

		let session = await sessionStorage.getSession(
			request.headers.get("cookie"),
		);

		session.set("user", sessionData);

		// Redirect to the home page after successful login
		return redirect("/", {
			headers: {
				"Set-Cookie": await sessionStorage.commitSession(session),
			},
		});
	} catch (error) {
		// Return validation errors or authentication errors
		if (error instanceof Error) {
			return json({ error: error.message });
		}

		// Re-throw any other errors (including redirects)
		throw error;
	}
}

// Finally, we need to export a loader function to check if the user is already
// authenticated and redirect them to the dashboard
export async function loader({ request }: Route.LoaderArgs) {
	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	let user = session.get("user");

	// If the user is already authenticated redirect to the dashboard
	if (user) return redirect("/dashboard");

	// Otherwise return null to render the login page
	return json(null);
}
```

The sessionStorage can be created using React Router's session storage hepler, is up to you to decide what session storage mechanism you want to use, or how you plan to keep the user data after authentication, maybe you just need a plain cookie.

## Advanced Usage

### Redirect the user to different routes based on their data

Say we have `/dashboard` and `/onboarding` routes, and after the user authenticates, you need to check some value in their data to know if they are onboarded or not.

```ts
export async function action({ request }: Route.ActionArgs) {
	let sessionData = await authenticator.authenticate("user-pass", request);

	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	session.set("user", sessionData);

	// commit the session
	let headers = new Headers({
		"Set-Cookie": await sessionStorage.commitSession(session),
	});

	// and do your validation to know where to redirect the user
	if (isOnboarded(sessionData)) return redirect("/dashboard", { headers });
	return redirect("/onboarding", { headers });
}
```

### Handle errors

In case of error, the authenticator and the strategy will simply throw an error. You can catch it and handle it as you wish.

```ts
export async function action({ request }: Route.ActionArgs) {
	try {
		return await authenticator.authenticate("user-pass", request);
	} catch (error) {
		if (error instanceof Error) {
			// here the error related to the authentication process
		}

		throw error; // Re-throw other values or unhandled errors
	}
}
```

> [!TIP]
> Some strategies may throw a redirect response, this is common on OAuth2/OIDC flows as they need to redirect the user to the identity provider and then back to the application, ensure you re-throw anything that's not a handled error
> Use `if (error instanceof Response) throw error;` at the beginning of the catch block to re-throw any response first in case you want to handle it differently.

### Logout the user

Because you're in charge of keeping the user data after login, how you handle the logout will depend on that. You can simply remove the user data from the session, or you can create a new session, or you can even invalidate the session.

```ts
export async function action({ request }: Route.ActionArgs) {
	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	return redirect("/login", {
		headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
	});
}
```

### Protect a route

To protect a route, you can use the `loader` function to check if the user is authenticated. If not, you can redirect them to the login page.

```ts
export async function loader({ request }: Route.LoaderArgs) {
	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	let user = session.get("user");
	if (!user) throw redirect("/login");
	return null;
}
```

This is outside the scope of Remix Auth as where you store the user data depends on your application.

A simple way could be to create an `authenticate` helper.

```ts
export async function authenticate(
	request: Request,
	returnTo?: string,
): Promise<SessionData> {
	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	let user = session.get("user") as SessionData | null;
	if (user) return user;
	if (returnTo) session.set("returnTo", returnTo);
	throw redirect("/login", {
		headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
	});
}
```

Then in your loaders and actions call that:

```ts
export async function loader({ request }: Route.LoaderArgs) {
	let sessionData = await authenticate(request, "/dashboard");
	// use the session data here
}
```

### Create a strategy

All strategies extend the `Strategy` abstract class exported by Remix Auth. You can create your own strategies by extending this class and implementing the `authenticate` method.

```ts
import { Strategy } from "remix-auth/strategy";

export namespace MyStrategy {
	export interface ConstructorOptions {
		// The values you will pass to the constructor
	}

	export interface CallbackOptions {
		// The values you will pass to the callback function
	}
}

export class MyStrategy<SessionData> extends Strategy<
	SessionData,
	MyStrategy.CallbackOptions
> {
	constructor(
		protected options: MyStrategy.ConstructorOptions,
		callback: Strategy.CallbackFunction<
			SessionData,
			MyStrategy.CallbackOptions
		>,
	) {
		super(callback);
	}

	async authenticate(request: Request): Promise<SessionData> {
		// Your logic here, you can use `this.options` to get constructor options
		// Extract data from the request and call the callback
		return await this.callback({
			/* your callback options here */
		});
	}
}
```

At some point in your `authenticate` method, you will need to call `this.callback(options)` to call the callback function the application defined.

The options will depend on the second generic you pass to the `Strategy` class.

What you want to pass to the `callback` method is up to you and what your authentication flow needs.

#### Strategy with extra authenticate parameters

You can also create strategies that accept additional parameters in their `authenticate` method. This is useful when you need to pass extra configuration or options at authentication time.

```ts
export class LoginStrategy<SessionData> extends Strategy<
	SessionData,
	LoginStrategy.CallbackOptions
> {
	constructor(
		callback: Strategy.CallbackFunction<
			SessionData,
			LoginStrategy.CallbackOptions
		>,
	) {
		super(callback);
	}

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

export namespace LoginStrategy {
	export interface CallbackOptions {
		form: FormData;
		fields: { username: string; password: string };
	}
}
```

When using this strategy, you can pass the extra parameters to the authenticate method:

```ts
// In your authenticator setup
const authenticator = new Authenticator({
	strategies: {
		login: new LoginStrategy(async ({ form, fields }) => {
			const username = form.get(fields.username) as string;
			const password = form.get(fields.password) as string;

			if (username && password) {
				return await findUserByCredentials(username, password);
			}
			throw new Error("Invalid login data");
		}),
	},
});

// In your route action
export async function action({ request }: Route.ActionArgs) {
	// Pass the username field name as an extra parameter
	let sessionData = await authenticator.authenticate("login", request, "email");
	// ... rest of your logic
}
```

#### Store intermediate state

If your strategy needs to store intermediate state, you can override the `contructor` method to expect a `Cookie` object, or even a `SessionStorage` object.

```ts
import { SetCookie } from "@mjackson/headers";

export class MyStrategy<SessionData> extends Strategy<
	SessionData,
	MyStrategy.CallbackOptions
> {
	constructor(
		protected cookieName: string,
		callback: Strategy.CallbackFunction<
			SessionData,
			MyStrategy.CallbackOptions
		>,
	) {
		super(callback);
	}

	async authenticate(request: Request): Promise<SessionData> {
		let header = new SetCookie({
			name: this.cookieName,
			value: "some value",
			// more options
		});
		// More code
	}
}
```

The result of `header.toString()` will be a string you have to send to the browser using the `Set-Cookie` header, this can be done by throwing a redirect with the header.

```ts
export class MyStrategy<SessionData> extends Strategy<
	SessionData,
	MyStrategy.CallbackOptions
> {
	constructor(
		protected cookieName: string,
		callback: Strategy.CallbackFunction<
			SessionData,
			MyStrategy.CallbackOptions
		>,
	) {
		super(callback);
	}

	async authenticate(request: Request): Promise<SessionData> {
		let header = new SetCookie({
			name: this.cookieName,
			value: "some value",
			// more options
		});
		throw redirect("/some-route", {
			headers: { "Set-Cookie": header.toString() },
		});
	}
}
```

Then you can read the value in the next request using the `Cookie` object from the `@mjackson/headers` package.

```ts
import { Cookie } from "@mjackson/headers";

export class MyStrategy<SessionData> extends Strategy<
	SessionData,
	MyStrategy.CallbackOptions
> {
	constructor(
		protected cookieName: string,
		callback: Strategy.CallbackFunction<
			SessionData,
			MyStrategy.CallbackOptions
		>,
	) {
		super(callback);
	}

	async authenticate(request: Request): Promise<SessionData> {
		let cookie = new Cookie(request.headers.get("cookie") ?? "");
		let value = cookie.get(this.cookieName);
		// More code
	}
}
```

#### Use AsyncLocalStorage to pass context data to strategy callbacks

If you need to pass additional context data from your middleware, loader, or action functions to your strategy callbacks (such as a database instance, request context, or user preferences), you can use the `AsyncLocalStorage` API. This is particularly useful when you want to avoid tight coupling between your strategies and specific database or service implementations.

```ts
import { AsyncLocalStorage } from "async_hooks";

// Define the context data you want to pass to strategies
export const asyncLocalStorage = new AsyncLocalStorage<{
	db: DatabaseInstance;
	requestId: string;
	// ... other context values
}>();

// In your strategy callback, access the context
export const authenticator = new Authenticator({
	strategies: {
		"user-pass": new FormStrategy(async ({ form }) => {
			const email = form.get("email") as string;
			const password = form.get("password") as string;

			if (!email || !password) {
				throw new Error("Email and password are required");
			}

			// Access the context from AsyncLocalStorage
			const store = asyncLocalStorage.getStore();
			if (!store) throw new Error("Authentication context not available");

			const { db, requestId } = store;

			// Use the database instance from context
			const user = await db.user.findUnique({ where: { email } });
			if (!user || !(await bcrypt.compare(password, user.password))) {
				throw new Error("Invalid email or password");
			}

			// Log with request ID for debugging
			console.log(`User ${user.id} authenticated for request ${requestId}`);

			return {
				id: user.id,
				email: user.email,
				name: user.name,
			};
		}),
	},
});
```

Then you can set the context in your route functions:

```ts
export async function action({ request }: Route.ActionArgs) {
	// Set up the context for the authentication
	const context = {
		db: getDatabaseInstance(),
		requestId: generateRequestId(),
	};

	// Run authentication with the context
	let sessionData = await asyncLocalStorage.run(context, () =>
		authenticator.authenticate("user-pass", request),
	);

	let session = await sessionStorage.getSession(request.headers.get("cookie"));
	session.set("user", sessionData);

	return redirect("/dashboard", {
		headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
	});
}
```

## License

See [LICENSE](./LICENSE).

## Author

- [Sergio Xalambrí](https://sergiodxa.com)
