# GoogleStrategy

The Google strategy is used to authenticate users against a Google account. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

Follow the steps on [the Google documentation](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred) to create a new application and get a client ID and secret.

### Create the strategy instance

```ts
import { GoogleStrategy } from "remix-auth";

let googleStrategy = new GoogleStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/google/callback";
  },
  async (accessToken, _, extraParams, profile) => {
    // Note that GitHub doesn't have a refreshToken so the second param is always
    // an empty string, you can skip it using `_` as param name

    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(googleStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/google" method="post">
      <button>Login with Google</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/google.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = () => redirect("/login");

export let action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("google", request);
};
```

```tsx
// app/routes/auth/google/callback.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("google", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```
