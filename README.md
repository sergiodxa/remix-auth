![](/assets/header.png)

# Remix Auth

### Simple Authentication for [Remix](https://remix.run/)

## Features

- Server-Side Authentication.
- TypeScript Support.
- OAuth2 Support
- User+Password Auth Support

## Overview

Remix Auth is a complete open source authentication solution for Remix.run applications.

It was heavily inspired by [Passport.js](https://passportjs.org), but completely rewrote it from scratch to work on top of the [Web Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## Getting Started

```bash
npm install --save remix-auth
```

## Example with the Local Strategy

### Create your session storage

```ts
// app/session.server.ts
import { createCookieSessionStorage } from "remix";

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});

export let { getSession, commitSession, destroySession } = sessionStorage;
```

### Setup Remix Auth

```ts
// app/auth.server.ts
import { Authenticator, LocalStrategy } from "remix-auth";
import { sessionStorage } from "~/session.server";
import { User, findOrCreateUser } from "~/models/user";

// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export let authenticator = new Authenticator<User>(sessionStorage);

// Add the local strategy
authenticator.use(
  new LocalStrategy(
    // The strategy will use this URL to redirect the user in case it's logged-in
    // And to know if it should grab the username and password from the request
    // body in case of a POST request
    { loginURL: "/login" },
    async (username, password) => {
      // Find your user data in your database or external service
      let user = await findOrCreateUser({ username });
      await user.validatePassword(password);
      return user;
    }
  ),
  // The name of the strategy, every strategy has a default name, only add one
  // if you want to override it (e.g. setup more than one strategy)
  "local"
);
```

### Setup your routes

```tsx
// app/routes/login.tsx
import { ActionFunction, LoaderFunction, redirect } from "remix";
import { authenticator } from "~/auth.server";

export let action: ActionFunction = async ({ request }) => {
  // Authenticate the request, after that it will redirect to the defined URLs
  // and set the user in the session if it's a success
  await authenticator.authenticate("local", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  // If the user is already authenticated redirect to /dashboard directly
  await authenticator.isAuthenticated(request, {
    successRedirect: "/dashboard",
  });
};

export default function Login() {
  return (
    <form action="/login" method="post">
      <input type="text" name="username" required />
      <input type="password" name="password" required />
      <button>Log In</button>
    </form>
  );
}
```
