# Authenticator

The Authenticator is the most important and the simplest part of Remix Auth. This is how you define what strategies to use and how you use them without the need to write any strategy specific code in your routes.

## Usage

To use it you need to import it first, you may want to create a new file in your `app` folder so you don't need to import it in every file you want to use it.

Let's say we have a file at `app/auth.server.ts` with the following code:

```ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/session.server";

type User = { id: string; name: string; email: string };

export let authenticator = new Authenticator<User>(sessionStorage);
```

Some important things to note here:

We create a type `User` and pass it to the Authenticator constructor. This type is what the user object will look like, all strategies will need to follow this same interface in the object returned after authenticating the user. You can get this type from your API schema or ORM models.

We are importing `sessionStorage` from `app/session.server.ts`, in this file you need to create a new session storage and export the whole object.

You may also want to export only `getSession`, `commitSession` and `destroySession` to use them in your routes.

```ts
import { createCookieSessionStorage } from "@remix-run/node";

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

This session storage can be a cookie based, a file system based, a memory based or a custom one made with `createSessionStorage`.

## Setup a strategy

Once you have your authenticator instance defined, you will need to create a new strategy and tell your authenticator to use it.

Let's update our `app/auth.server.ts` file to look like this:

```ts
import { Authenticator, LocalStrategy } from "remix-auth";
import { sessionStorage } from "~/session.server";

type User = { id: string; name: string; email: string };

export let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new LocalStrategy({ loginURL: "/login" }, async (username, password) => {
    // the result of this call must follow the User type defined above
    return getUserSomehow(username, password);
  })
);
```

## Setup your routes

This will depend a lot on what strategy you are using since each one may have different requirements. Continuing our example of the `LocalStrategy`, we need to create a `/login` route and call our authenticator there.

```tsx
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { authenticator } from "~/auth.server"; // import our authenticator
import { getSession, commitSession } from "~/session.server";

export async function action({ request }: ActionArgs) {
  // Authenticate the request and redirect to /dashboard if user is
  // authenticated or to /login if it's not
  authenticator.authenticate("local", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

export async function loader({ request }: LoaderArgs) {
  // Check if the user is already logged-in (this checks the key user in the session)
  let user = await authenticator.isAuthenticated(request);
  // If the user is logged-in, redirect to the dashboard directly
  if (user) return redirect("/dashboard");
  // If we don't have a user return an empty JSON response (or something else)
  return json({});
};

export default function Login() {
  // In the view, we will render our login form and do a POST against /login to
  // trigger our action and authenticate the user, you may also want to change
  // it to use the Form component from Remix in case you provide a custom loading
  // state to your form
  return (
    <Form action="/login" method="post">
      <input type="text" name="username" required />
      <input type="password" name="password" required />
      <button>Log In</button>
    </Form>
  );
}
```

And that's it, you have now setup your first strategy and can use it in your routes.
