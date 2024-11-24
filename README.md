![](/assets/header.png)

# Remix Auth

### Simple Authentication for [React Router v7](https://reactrouter.com)

## Features

- Full **Server-Side** Authentication
- Complete **TypeScript** Support
- **Strategy**-based Authentication
- Implement **custom** strategies

## Overview

Remix Auth is a complete open-source authentication solution for Remix applications.

Heavily inspired by [Passport.js](https://passportjs.org), but completely rewrote it from scratch to work on top of the [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). Remix Auth can be dropped in to any Remix-based application with minimal setup.

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

### Handle rrrors

In case of error, the authenticator and the strategy will simply throw an error. You can catch it and handle it as you wish.

```ts
export async function action({ request }: ActionFunctionArgs) {
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
export async function action({ request }: ActionFunctionArgs) {
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
  export interface VerifyOptions {
    // The values you will pass to the verify function
  }
}

export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
    // Your logic here
  }
}
```

At some point of your `authenticate` method, you will need to call `this.verify(options)` to call the `verify` function the application defined.

```ts
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
    return await this.verify({
      /* your options here */
    });
  }
}
```

The options will depend on the second generic you pass to the `Strategy` class.

What you want to pass to the `verify` method is up to you and what your authentication flow needs.

#### Store intermediate state

If your strategy needs to store intermediate state, you can use override the `contructor` method to expect a `Cookie` object, or even a `SessionStorage` object.

```ts
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookie: Cookie,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
    let setCookieHeader = await this.cookie.serialize("some value");
    // More code
  }
}
```

The result of `this.cookie.serialize` will be a string you have to send to the browser using the `Set-Cookie` header, this can be done by throwing a redirect with the header.

```ts
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookie: Cookie,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
    let setCookieHeader = await this.cookie.serialize("some value");
    throw redirect("/some-route", {
      headers: { "Set-Cookie": setCookieHeader },
    });
  }
}
```

Then you can read the value in the next request using the `this.cookie` object.

```ts
export class MyStrategy<User> extends Strategy<User, MyStrategy.VerifyOptions> {
  name = "my-strategy";

  constructor(
    protected cookie: Cookie,
    verify: Strategy.VerifyFunction<User, MyStrategy.VerifyOptions>
  ) {
    super(verify);
  }

  async authenticate(
    request: Request,
    options: Strategy.AuthenticateOptions
  ): Promise<User> {
    let value = await this.cookie.parse(request.headers.get("cookie"));
    // More code
  }
}
```

Note that the result of `this.cookie.parse` is typed as `any` by React Router, so you may want to use a library like [Zod](https://zod.dev) to validate the value before using it.

## License

See [LICENSE](./LICENSE).

## Author

- [Sergio Xalambrí](https://sergiodxa.com)
