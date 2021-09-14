# Authenticator

The Authenticator is the most important and the simples part of Remix Auth. This is how you define what strategies to use and how you use them without the need to write any strategy specific code in your routes.

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
    // the resutl of this call must follow the User type defined above
    return getUserSomehow(username, password);
  })
);
```

## Setup your routes

This will depend a lot on what strategy you are using, since they may have different requirements, but continuing the example of the `LocalStrategy` we need to create a `/login` route and call our authenticator there.

```tsx
import { ActionFunction, LoaderFunction, redirect, json } from "remix";
import { authenticator } from ".~/auth.server"; // import our authenticator
import { getSession, commitSession } from ".~/session.server";

export let action: ActionFunction = async ({ request }) => {
  // Authenticate the request, your callback will be called if the user is
  // logged-in, if not a redirect will be performed to the login URL
  return authenticator.authenticate("local", request, async (user) => {
    // get the session from the cookie
    let session = await getSession(request.headers.get("Cookie"));
    // store the user in the session (it's important that you do this)
    session.set(authenticator.sessionKey, user);
    // commit the session and redirect to another route of your app
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  // Check if the user is already logged-in (this checks the key user in the session)
  let user = await authenticator.isAuthenticated(request);
  // If the user is logged-in, redirect to the dashboard directly
  if (user) return redirect("/dashboard");
  // If we don't have a user return an empty JSON response (or something else)
  return json({});
};

export default function Login() {
  // In the view, we will render our login form and do a POST againt /login to
  // trigger our action and authenticate the user, you may also want to change
  // it to use the Form component from Remix in case you provide a custom loading
  // state to your form
  return (
    <form action="/login" method="post">
      <input type="text" name="username" required />
      <input type="password" name="password" required />
      <button>Log In</button>
    </form>
  );
}
```

And that's it, you have now setup your first strategy and you can now use it in your routes.
