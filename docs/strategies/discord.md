# DiscordStrategy

The Discord strategy is used to authenticate users against aDiscord account. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

First go to [the Discord Developer Portal](https://discord.com/developers/applications) to create a new application and get a client ID and secret. The client ID and secret are located in the OAuth2 Tab of your Application. Once you are there you can already add your first redirect url, f.e. `http://localhost:3000/auth/discord/callback`.

You can find the detailed Discord OAuth Documentation [here](https://discord.com/developers/docs/topics/oauth2#oauth2).

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

### Create the strategy instance

```ts
// app/auth.server.ts
import { Authenticator, DiscordStrategy } from "remix-auth";

import { sessionStorage } from "~/session.server";
import type { User } from "~/models/user.model";
import { getUserByEmail } from "~/models/user.model";

let auth = new Authenticator<User>(sessionStorage);

let discordStrategy = new DiscordStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/discord/callback",
  },
  async (accessToken, refreshToken, extraParams, profile) => {
    // Get the user data from your DB or API using the tokens and profile
    return getUserByEmail(profile.emails[0].value);
  }
);

auth.use(discordStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
import { Form } from "remix";

export default function Login() {
  return (
    <Form action="/auth/discord" method="post">
      <button>Login with Discord</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/discord.tsx
import type { ActionFunction, LoaderFunction } from "remix";
import { redirect } from "remix";

import { auth } from "~/auth.server";

export let loader: LoaderFunction = () => redirect("/login");

export let action: ActionFunction = ({ request }) => {
  return auth.authenticate("discord", request);
};
```

```tsx
// app/routes/auth/discord.callback.tsx
import type { LoaderFunction } from "remix";
import { auth } from "~/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  return auth.authenticate("discord", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```

```tsx
// app/routes/dashboard.tsx
import { LoaderFunction } from "remix";
import { auth } from "~/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  return await auth.isAuthenticated(request, {
    failureRedirect: "/login",
  });
};

export default function DashboardPage() {
  return <div>Dashboard</div>;
}
```

That's it, try going to `/login` and press the Login button to start the authentication flow. Make sure to store all your Secrets properly and setup the correct redirect_url once you go to production.
