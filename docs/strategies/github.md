# GitHubStrategy

The GitHub strategy is used to authenticate users against a GitHub account. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

Follow the steps on [the GitHub documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app) to create a new application and get a client ID and secret.

### Create the strategy instance

```ts
import { GitHubStrategy } from "remix-auth";

let gitHubStrategy = new GitHubStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/github/callback";
  },
  async (accessToken, _, extraParams, profile) => {
    // Note that GitHub doesn't have a refreshToken so the second param is always
    // an empty string, you can skip it using `_` as param name

    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(gitHubStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/github" method="post">
      <button>Login with GitHub</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/github.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = () => redirect("/login");

export let action: ActionFunction = ({ request }) => {
  authenticator.authenticate("github", request);
};
```

```tsx
// app/routes/auth/github/callback.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  authenticator.authenticate("github", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```
