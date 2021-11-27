# AzureStrategy

The Azure strategy is used to authenticate users against a [Microsoft Identity](https://docs.microsoft.com/en-us/azure/active-directory/develop/) account. This can be a work/school account or a personal Microsoft account, like Skype, Xbox and Outlook.com. It extends the OAuth2Strategy.

## Usage

### Create an OAuth application

Follow the steps on [the Microsoft documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) to create a new App Registration. You should select **Web** as the platform, configure a **Redirect URI** and add a client secret.

    If you want to support login with both personal Microsoft accounts and school/work accounts, you might need to configure the supported account types by editing the manifest file. Set `signInAudience` value to `AzureADandPersonalMicrosoftAccount` to allow login also with personal accounts.

Be sure to copy the client secret, Redirect URI and the Application (client) ID (under Overview) because you will need them later.

### Create the strategy instance

```ts
import { AzureStrategy } from "remix-auth";

let azureStrategy = new AzureStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/azure/callback",
  },
  async (accessToken, _, extraParams, profile) => {
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(azureStrategy);
```

### Setup your routes

```tsx
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/azure" method="post">
      <button>Login with Microsoft</button>
    </Form>
  );
}
```

```tsx
// app/routes/auth/azure.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = () => redirect("/login");

export let action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("azure", request);
};
```

```tsx
// app/routes/auth/azure/callback.tsx
import { ActionFunction, LoaderFunction } from "remix";
import { authenticator } from "~/auth.server";

export let loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate("azure", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```

### Allow login only with accounts from a single organization (tenant)

If you want to allow login only for users from a single organization, you should add the `tenant` attribute to the configuration passed to `AzureStrategy`. The value of `tenant` should be the **Directory (tenant) ID** found under **Overview** in your App Registration page.

You must also select **Accounts in this organizational directory** as Supported account types in your App Registration.

```ts
let azureStrategy = new AzureStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: "https://example.com/auth/azure/callback",
    tenant: "YOUR_TENANT_ID",
  },
  async (accessToken, _, extraParams, profile) => {
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);
```
