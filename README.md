![](/assets/header.png)

# Remix Auth

### Simple Authentication for [Remix](https://remix.run/)

## Features

- Full **Server-Side** Authentication
- Complete **TypeScript** Support
- **Strategy**-based Authentication
- Easily handle **success and failure**
- Implement **custom** strategies
- Supports persistent **sessions**

## Overview

Remix Auth is a complete open-source authentication solution for Remix.run applications.

Heavily inspired by [Passport.js](https://passportjs.org), but completely rewrote it from scratch to work on top of the [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). Remix Auth can be dropped in to any Remix-based application with minimal setup.

As with Passport.js, it uses the strategy pattern to support the different authentication flows. Each strategy is published individually as a separate npm package.

## Installation

To use it, install it from npm (or yarn):

```bash
npm install remix-auth
```

Also, install one of the strategies. A list of strategies is available in the [Community Strategies discussion](https://github.com/sergiodxa/remix-auth/discussions/111).

## Usage

Remix Auth needs a session storage object to store the user session. It can be any object that implements the [SessionStorage interface from Remix](https://remix.run/docs/en/main/utils/sessions#createsessionstorage).

In this example I'm using the [createCookieSessionStorage](https://remix.run/docs/en/main/utils/sessions#createcookiesessionstorage) function.

```ts
// app/services/session.server.ts
import { createCookieSessionStorage } from "@remix-run/node";

// export the whole sessionStorage object
export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session", // use any name you want here
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: ["s3cr3t"], // replace this with an actual secret
    secure: process.env.NODE_ENV === "production", // enable this in prod only
  },
});

// you can also export the methods individually for your own usage
export let { getSession, commitSession, destroySession } = sessionStorage;
```

Now, create a file for the Remix Auth configuration. Here import the `Authenticator` class and your `sessionStorage` object.

```ts
// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/services/session.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export let authenticator = new Authenticator<User>(sessionStorage);
```

The `User` type is whatever you will store in the session storage to identify the authenticated user. It can be the complete user data or a string with a token. It is completely configurable.

After that, register the strategies. In this example, we will use the [FormStrategy](https://github.com/sergiodxa/remix-auth-form) to check the documentation of the strategy you want to use to see any configuration you may need.

```ts
import { FormStrategy } from "remix-auth-form";

// Tell the Authenticator to use the form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    let email = form.get("email");
    let password = form.get("password");
    let user = await login(email, password);
    // the type of this user must match the type you pass to the Authenticator
    // the strategy will automatically inherit the type if you instantiate
    // directly inside the `use` method
    return user;
  }),
  // each strategy has a name and can be changed to use another one
  // same strategy multiple times, especially useful for the OAuth2 strategy.
  "user-pass"
);
```

Now that at least one strategy is registered, it is time to set up the routes.

First, create a `/login` page. Here we will render a form to get the email and password of the user and use Remix Auth to authenticate the user.

```tsx
// app/routes/login.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";

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
export async function action({ request }: ActionFunctionArgs) {
  // we call the method with the name of the strategy we want to use and the
  // request object, optionally we pass an object with the URLs we want the user
  // to be redirected to after a success or a failure
  return await authenticator.authenticate("user-pass", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

// Finally, we can export a loader function where we check if the user is
// authenticated with `authenticator.isAuthenticated` and redirect to the
// dashboard if it is or return null if it's not
export async function loader({ request }: LoaderFunctionArgs) {
  // If the user is already authenticated redirect to /dashboard directly
  return await authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard",
  });
};
```

With this, we have our login page. If we need to get the user data in another route of the application, we can use the `authenticator.isAuthenticated` method passing the request this way:

```ts
// get the user data or redirect to /login if it failed
let user = await authenticator.isAuthenticated(request, {
  failureRedirect: "/login",
});

// if the user is authenticated, redirect to /dashboard
await authenticator.isAuthenticated(request, {
  successRedirect: "/dashboard",
});

// get the user or null, and do different things in your loader/action based on
// the result
let user = await authenticator.isAuthenticated(request);
if (user) {
  // here the user is authenticated
} else {
  // here the user is not authenticated
}
```

Once the user is ready to leave the application, we can call the `logout` method inside an action.

```ts
export async function action({ request }: ActionFunctionArgs) {
  await authenticator.logout(request, { redirectTo: "/login" });
};
```

## Advanced Usage

### Custom redirect URL based on the user

Say we have `/dashboard` and `/onboarding` routes, and after the user authenticates, you need to check some value in their data to know if they are onboarded or not.

If we do not pass the `successRedirect` option to the `authenticator.authenticate` method, it will return the user data.

Note that we will need to store the user data in the session this way. To ensure we use the correct session key, the authenticator has a `sessionKey` property.

```ts
export async function action({ request }: ActionFunctionArgs) {
  let user = await authenticator.authenticate("user-pass", request, {
    failureRedirect: "/login",
  });

  // manually get the session
  let session = await getSession(request.headers.get("cookie"));
  // and store the user data
  session.set(authenticator.sessionKey, user);

  // commit the session
  let headers = new Headers({ "Set-Cookie": await commitSession(session) });

  // and do your validation to know where to redirect the user
  if (isOnboarded(user)) return redirect("/dashboard", { headers });
  return redirect("/onboarding", { headers });
};
```

### Changing the session key

If we want to change the session key used by Remix Auth to store the user data, we can customize it when creating the `Authenticator` instance.

```ts
export let authenticator = new Authenticator<AccessToken>(sessionStorage, {
  sessionKey: "accessToken",
});
```

With this, both `authenticate` and `isAuthenticated` will use that key to read or write the user data (in this case, the access token).

If we need to read or write from the session manually, remember always to use the `authenticator.sessionKey` property. If we change the key in the `Authenticator` instance, we will not need to change it in the code.

### Reading authentication errors

When the user cannot authenticate, the error will be set in the session using the `authenticator.sessionErrorKey` property.

We can customize the name of the key when creating the `Authenticator` instance.

```ts
export let authenticator = new Authenticator<User>(sessionStorage, {
  sessionErrorKey: "my-error-key",
});
```

Furthermore, we can read the error using that key after a failed authentication.

```ts
// in the loader of the login route
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard",
  });
  let session = await getSession(request.headers.get("cookie"));
  let error = session.get(authenticator.sessionErrorKey);
  return json({ error }, {
    headers:{
      'Set-Cookie': await commitSession(session) // You must commit the session whenever you read a flash
    }
  });
};
```

Remember always to use the `authenticator.sessionErrorKey` property. If we change the key in the `Authenticator` instance, we will not need to change it in the code.

### Errors Handling

By default, any error in the authentication process will throw a Response object. If `failureRedirect` is specified, this will always be a redirect response with the error message on the `sessionErrorKey`.

If a `failureRedirect` is not defined, Remix Auth will throw a 401 Unauthorized response with a JSON body containing the error message. This way, we can use the CatchBoundary component of the route to render any error message.

If we want to get an error object inside the action instead of throwing a Response, we can configure the `throwOnError` option to `true`. We can do this when instantiating the `Authenticator` or calling `authenticate`.

If we do it in the `Authenticator,` it will be the default behavior for all the `authenticate` calls.

```ts
export let authenticator = new Authenticator<User>(sessionStorage, {
  throwOnError: true,
});
```

Alternatively, we can do it on the action itself.

```ts
import { AuthorizationError } from "remix-auth";

export async function action({ request }: ActionFunctionArgs) {
  try {
    return await authenticator.authenticate("user-pass", request, {
      successRedirect: "/dashboard",
      throwOnError: true,
    });
  } catch (error) {
    // Because redirects work by throwing a Response, you need to check if the
    // caught error is a response and return it or throw it again
    if (error instanceof Response) return error;
    if (error instanceof AuthorizationError) {
      // here the error is related to the authentication process
    }
    // here the error is a generic error that another reason may throw
  }
};
```

If we define both `failureRedirect` and `throwOnError`, the redirect will happen instead of throwing an error.
