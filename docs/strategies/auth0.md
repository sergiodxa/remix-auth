# Auth0Strategy

## Create your session storage

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

## Create an instance of the Authenticator

```ts
// app/auth.server.ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/session.server";
import { User } from "~/models/user";

// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export let authenticator = new Authenticator<User>(sessionStorage);
```

## Create an instance of the Auth0Strategy and pass it the authenticator

```ts
import { Auth0Strategy } from "remix-auth";

let auth0Strategy = new Auth0Strategy(
  {
    domain: "YOUR_AUTH0_DOMAIN",
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "/auth/auth0/callback",
  },
  async (accessToken, refreshToken, profile) => {
    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(auth0Strategy);
```

### Setup your routes

```tsx
// app/routes/auth.auth0.tsx
import { LoaderFunction } from "remix";
import { authenticator } from ".~/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  return authenticator.authenticate("auth0", request);
};

// Empty React component required by Remix
export default function Auth0Login() {
  return null;
}
```

```tsx
// app/routes/auth.auth0.callback.tsx
import { LoaderFunction } from "remix";
import { authenticator } from ".~/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  return authenticator.authenticate("auth0", request);
};

// Empty React component required by Remix
export default function Auth0Callback() {
  return null;
}
```

```tsx
// app/routes/dashboard.tsx
import { LoaderFunction, redirect } from "remix";
import { json } from "remix-utils";
import { authenticator } from ".~/auth.server";
import { User } from ".~/models/user";

type RouteData = { user: User };

export let loader: LoaderFunction = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request);
  if (!user) return redirect("/login");
  return json<RouteData>({ user });
};

// Empty React component required by Remix
export default function Dashboard() {
  let { user } = useRouteData<RouteData>();
  // use the user to render the UI of your private route
}
```
