![](/assets/header.png)

# Remix Auth

### Simple Authentication for [Remix](https://remix.run) and [React Router](https://reactrouter.com) apps.

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

To use it, install it from npm (or yarn):

```bash
npm install remix-auth
```

Also, install one of the strategies. A list of strategies is available in the [Community Strategies discussion](https://github.com/sergiodxa/remix-auth/discussions/111).

> [!TIP]
> Check in the strategies what versions of Remix Auth they support, as they may not be updated to the latest version.

## Usage

Import the `Authenticator` class and instantiate with a generic type that will be the type of the user data you will get from the strategies.

```ts
// Create an instance of the authenticator, pass a generic with what
// strategies will return
export let authenticator = new Authenticator<User>();
```

The `User` type is whatever your strategies will give you after identifying the authenticated user. It can be the complete user data, or a string with a token. It is completely up to you.

After that, register the strategies. In this example, we will use the [FormStrategy](https://github.com/sergiodxa/remix-auth-form) to check the documentation of the strategy you want to use to see any configuration you may need.

```ts
import { FormStrategy } from "remix-auth-form";

// Tell the Authenticator to use the form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    let email = form.get("email");
    let password = form.get("password");
    // the type of this user must match the type you pass to the Authenticator
    // the strategy will automatically inherit the type if you instantiate
    // directly inside the `use` method
    return await login(email, password);
  }),
  // each strategy has a name and can be changed to use another one
  // same strategy multiple times, especially useful for the OAuth2 strategy.
  "user-pass"
);
```

Once we have at least one strategy registered, it is time to set up the routes.

First, create a `/login` page. Here we will render a form to get the email and password of the user and use Remix Auth to authenticate the user.

```tsx
import { Form } from "react-router";
import { authenticator } from "~/services/auth.server";

// Import this from correct place for your route
import type { Route } from "./+types";

// First we create our UI with the form doing a POST and the inputs with the
// names we are going to use in the strategy
export default function Screen() {
  return (
    <Form method="post">
      <input type="email" name="email" required />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />
      <button>Sign In</button>
    </Form>
  );
}

// Second, we need to export an action function, here we will use the
// `authenticator.authenticate method`
export async function action({ request }: Route.ActionArgs) {
  // we call the method with the name of the strategy we want to use and the
  // request object
  let user = await authenticator.authenticate("user-pass", request);

  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  session.set("user", user);

  throw redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  });
}

// Finally, we need to export a loader function to check if the user is already
// authenticated and redirect them to the dashboard
export async function loader({ request }: Route.LoaderArgs) {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  let user = session.get("user");
  if (user) throw redirect("/dashboard");
  return data(null);
}
```

The sessionStorage can be created using React Router's session storage hepler, is up to you to decide what session storage mechanism you want to use, or how you plan to keep the user data after authentication, maybe you just need a plain cookie.

## Advanced Usage

### Redirect the user to different routes based on their data

Say we have `/dashboard` and `/onboarding` routes, and after the user authenticates, you need to check some value in their data to know if they are onboarded or not.

```ts
export async function action({ request }: Route.ActionArgs) {
  let user = await authenticator.authenticate("user-pass", request);

  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  session.set("user", user);

  // commit the session
  let headers = new Headers({ "Set-Cookie": await commitSession(session) });

  // and do your validation to know where to redirect the user
  if (isOnboarded(user)) return redirect("/dashboard", { headers });
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
export async function authenticate(request: Request, returnTo?: string) {
  let session = await sessionStorage.getSession(request.headers.get("cookie"));
  let user = session.get("user");
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
  let user = await authenticate(request, "/dashboard");
  // use the user data here
}
```

### Create a strategy

All strategies extends the `Strategy` abstract class exported by Remix Auth. You can create your own strategies by extending this class and implementing the `authenticate` method.

```ts
import { Strategy } from "remix-auth/strategy";

export namespace MyStrategy {
  export interface ConstructorOptions {
    // The values you will pass to the constructor
  }

  export interface VerifyOptions {
    // The values you will pass to the verify function
  }
}

export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected options: MyStrategy.ConstructorOptions,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
    // Your logic here, you can use `this.options` to get constructor options
  }
}
```

At some point of your `authenticate` method, you will need to call `this.verify(options)` to call the `verify` function the application defined.

```ts
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected options: MyStrategy.ConstructorOptions,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
    return await this.verify({
      /* your verify options here */
    });
  }
}
```

The options will depend on the second generic you pass to the `Strategy` class.

What you want to pass to the `verify` method is up to you and what your authentication flow needs.

#### Store intermediate state

If your strategy needs to store intermediate state, you can override the `contructor` method to expect a `Cookie` object, or even a `SessionStorage` object.

```ts
import { SetCookie } from "@mjackson/headers";

export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookieName: string,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
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
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookieName: string,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
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

export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookieName: string,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
    let cookie = new Cookie(request.headers.get("cookie") ?? "");
    let value = cookie.get(this.cookieName);
    // More code
  }
}
```

#### Use AsyncLocalStorage to pass extra data to authenticate

If you need more than the request object to authenticate the user, you can use the `AsyncLocalStorage` API to pass data to the `authenticate` method.

```ts
import { AsyncLocalStorage } from "async_hooks";

export const asyncLocalStorage = new AsyncLocalStorage<{
  someValue: string;
  // more values
}>();

export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookieName: string,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
    let store = asyncLocalStorage.getStore();
    if (!store) throw new Error("Failed to get AsyncLocalStorage store");
    let { someValue } = store;
    // More code
  }
}
```

Then you can set the value in the `authenticate` method.

```ts
export async function action({ request }: Route.ActionArgs) {
  // Set the value in the AsyncLocalStorage
  let user = await asyncLocalStorage.run({ someValue: "some value" }, () =>
    authenticator.authenticate("user-pass", request)
  );

  let session = await sessionStorage.getSession(request.headers.get("cookie"));

  session.set("user", user);

  return redirect("/dashboard", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
```

## License

See [LICENSE](./LICENSE).

## Author

- [Sergio Xalambrí](https://sergiodxa.com)
