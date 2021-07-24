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
import { sessionStorage } from "./session.server";
import { User } from "./models/user";

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
      let user = await User.findOne({ username });
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
import { authenticator } from "../auth.server";
import { getSession, commitSession } from "../session.server";

export let action: ActionFunction = async ({ request }) => {
  // Authenticate the request, your callback will be called if the user is
  // logged-in, if not a redirect will be performed to the login URL
  return authenticator.authenticate("local", request, async (user) => {
    let session = await getSession(request.headers.get("Cookie"));
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  // Check if the user is already logged-in
  let user = await authenticator.isAuthenticated(request);
  if (!user) return new Response("");
  return redirect("/dashboard");
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
