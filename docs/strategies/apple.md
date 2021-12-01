# AppleStrategy

## Setup your secrets

To be able to use "Sign In with Apple" you need to setup some credentials with Apple. Heres a [Blog Post from Okta](https://developer.okta.com/blog/2019/06/04/what-the-heck-is-sign-in-with-apple#how-sign-in-with-apple-works-hint-it-uses-oauth-and-oidc) which explains in detail how to get the secrets.

### Generating a Client Secret

By default, Apple only provides you with a private key from which you can generate a Client Secret. You can then provide that generated secret to the strategy.

Heres a simple JavaScript example on how you can create the secret:

```js
const jwt = require("jsonwebtoken");
const fs = require("fs");

const serviceId = "SERVICE_ID"; // the Service ID you created
const teamId = "TEAM_ID"; // your Apple Developer Team ID, look in the top right corner of the Developer Portal
const keyId = "KEY_ID"; // the KEY ID of your generated private key
const privateKey = fs.readFileSync("./key.p8");
const secret = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
    aud: "https://appleid.apple.com",
    sub: serviceId,
  },
  privateKey,
  { algorithm: "ES256", keyid: keyId }
);
console.log(secret);
```

## Caveats with the current Stragegy

There is one main caveats with this Strategy currently. Since Apple only provides scope information (username and email) with the `form_post` respond parameter which is incompatible with the OAuth 2.0 strategy we currently don't support any of the scopes ("email" of "name").

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

## Create an instance of the AppleStrategy and pass it the authenticator

```ts
import { AppleStrategy } from "remix-auth";
import { decode } from "jsonwebtoken";

let appleStrategy = new AppleStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "/auth/apple/callback",
  },
  async (accessToken, refreshToken, extraParams) => {
    let profileData = decode(extraParams.id_token);
    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ sub: profileData.sub });
  }
);

authenticator.use(appleStrategy);
```

### Setup your routes

```tsx
// app/routes/auth.apple.tsx
import { LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  await authenticator.authenticate("apple", request);
};
```

```tsx
// app/routes/auth.apple.callback.tsx
import type { LoaderFunction } from "remix";
import { authenticator } from "~/utils/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
  return authenticator.authenticate("apple", request, {
    failureRedirect: "/error",
    successRedirect: "/dashboard",
  });
};
```

```tsx
// app/routes/dashboard.tsx
import { LoaderFunction, redirect } from "remix";
import { json } from "remix-utils";
import { authenticator } from ".~/auth.server";
import { User } from ".~/models/user";

type LoaderData = { user: User };

export let loader: LoaderFunction = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request, {
    redirectTo: "/login",
  });
  return json<LoaderData>({ user });
};

// Empty React component required by Remix
export default function Dashboard() {
  let { user } = useRouteData<LoaderData>();
  // use the user to render the UI of your private route
}
```
