# OktaStrategy

The Okta strategy is used to authenticate users against an Okta account. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

Follow the steps on [the Okta documentation](https://developer.okta.com/docs/guides/sign-into-web-app/nodeexpress/main/#create-an-okta-app-integration) to create a new application and get a client ID and secret.

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
import { OktaStrategy } from "remix-auth";
import { User } from "~/models/user";

let oktaStrategy = new OktaStrategy<User>(
  {
    // For Okta, this is your authorization server's base URL
    // https://developer.okta.com/docs/concepts/auth-servers/
    issuer: "YOUR_OKTA_ISSUER_URL",
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/okta/callback",
  },
  async (accessToken, refreshToken, extraParams, profile) => {
    // Get the user data from your DB or API using the tokens and profile
    // return User.findOrCreate({ email: profile.emails[0].value });
    
    // Or get it from the profile
    const emails = profile.emails ?? [];
    return {
      id: profile.id ?? "",
      name: profile.displayName ?? "",
      email: emails.length > 0 ? emails[0].value : "",
    };
  }
);

authenticator.use(oktaStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/okta" method="post">
      <button>Login with Okta</button>
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
  return authenticator.authenticate("okta", request);
};
```

```tsx
// app/routes/auth/okta/callback.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("okta", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```
