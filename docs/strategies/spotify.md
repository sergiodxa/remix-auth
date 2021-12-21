# SpotifyStrategy

The Spotify strategy is used to authenticate users against an Spotify account. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

Follow the steps on [the Spotify documentation](https://developer.spotify.com/documentation/general/guides/authorization/app-settings/) to create a new application and get a _Client ID_ and a _Client Secret_.

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

### Create an instance of the Authenticator

```ts
// app/auth.server.ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/session.server";
import { User } from "~/models/user";
// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export let authenticator = new Authenticator<User>(sessionStorage);
```

### Create the strategy instance

```ts
import { SpotifyStrategy } from "remix-auth";
import { User } from "~/models/user";
let spotifyStrategy = new SpotifyStrategy<User>(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/spotify/callback",
    // An optional space-separated list of scopes.
    // https://developer.spotify.com/documentation/general/guides/authorization/scopes/
    scope: "user-read-private user-read-email",
  },
  async (accessToken, refreshToken, extraParams, profile) => {
    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.email });
  }
);
authenticator.use(spotifyStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/spotify" method="post">
      <button>Login with Spotify</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/okta.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";
export let loader: LoaderFunction = () => redirect("/login");
export let action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("spotify", request);
};
```

```tsx
// app/routes/auth/okta/callback.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";
export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("spotify", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```
