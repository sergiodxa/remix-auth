# Create a Strategy

All strategies implement the `Strategy` interface exported from this package.

```ts
import { Strategy } from "remix-auth";
```

Using that interface, you will need to define at least two things, the `name` which is a unique identifier for the strategy, and the `authenticate` method which will be called when a user attempts to authenticate with the strategy.

## Creating a custom strategy for forms

Let's see how we can create a custom strategy to authenticate a user with a form containing an email and password.

```ts
// This is the function that will be called when a user attempts to authenticate with the strategy
// This function will receive the email and password and must return the user object
export interface FormStrategyVerifyCallback<User> {
  (email: string, password: string): Promise<User>;
}

// You need to tell Strategy how a user object looks like, however you'll most
// likely want to use the same object for all your strategies, if you make your
// FormStrategy receive a `User` generic it will inherit it from the
// Authenticator instance when you use it.
class FormStrategy<User> implements Strategy<User> {
  // The name of our strategy, we will use it to tell Remix Auth to use this strategy
  name = "form";

  // When we create an instance of the strategy, we need to pass in the verify callback
  constructor(private verify: FormStrategyVerifyCallback<User>) {}

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions
  ): Promise<User> {
    // First we will get the session instance, we will use it later
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // We need to get the email and password from the request
    let body = await request.text();
    let params = new URLSearchParams(body);

    let email = params.get("email") as string | null;
    let password = params.get("password") as string | null;

    // Now let's verify the email and password are defined and not empty
    if (!email || !password) {
      // we can return a redirect to our login page here with a flash message
      // that the email and password are required
      if (!email) {
        session.flash(`auth:email`, "Missing email address.");
      }
      if (!password) {
        session.flash(`auth:pass`, "Missing password.");
      }

      let cookie = await sessionStorage.commitSession(session);
      throw redirect(this.loginURL, { headers: { "Set-Cookie": cookie } });
    }

    try {
      user = await this.verify(username, password);
    } catch (error) {
      let message = (error as Error).message;

      // if a failureRedirect is not set, we throw a 401 Response
      if (!options.failureRedirect) throw json({ message }, { status: 401 });
      // if we do have a failureRedirect, we redirect to it and set the error
      // in the session errorKey
      session.flash(this.errorKey, { message });
      throw redirect(options.failureRedirect, {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      });
    }

    // if a successRedirect is not set, we return the user
    if (!options.successRedirect) return user;

    // if the successRedirect is set, we redirect to it and set the user in the
    // session sessionKey
    session.set(options.sessionKey, user);
    let cookie = await sessionStorage.commitSession(session);
    throw redirect(options.successRedirect, {
      headers: { "Set-Cookie": cookie },
    });
  }
}
```

With this you have created your own strategy for authentication, but you still need to register it with the `Authenticator` instance.

```ts
import { Authenticator } from "remix-auth";
import FormStrategy from "~/form-strategy.server";
import { sessionStorage } from "~/session.server";

export let authenticator = new Authenticator(sessionStorage);
authenticator.use(
  new FormStrategy({ loginURL: "/login" }, async (email, password) => {
    // This is where you would query your database to find the user and return
    // the user object
  })
);
```

And that's it, now you can use it in your routes as you would any other strategy.

> Note: The FormStrategy above is a slightly modified version of the LocalStrategy shipped with Remix Auth.

## Using on OAuth2

If you want to work with OAuth2 you can use the `OAuth2Strategy` from this package as your base class. This way you won't need to implement the whole OAuth2 flow yourself. The `OAuth2Strategy` will handle the whole flow for you and let you replace parts of it if you want.

Let's see how the `Auth0Strategy` is implemented using the `OAuth2Strategy` as a base.

```ts
// We need to import the OAuth2Strategy, the verify callback and the profile interfaces
import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "remix-auth-oauth2";

// These are the custom options we need from the developer to use the strategy
export interface Auth0StrategyOptions {
  domain: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

// This interface declares what extra params we will get from Auth0 in the
// verify callback
export interface Auth0ExtraParams extends Record<string, string | number> {
  id_token: string;
  scope: string;
  expires_in: 86_400;
  token_type: "Bearer";
}

// The Auth0Profile extends the OAuth2Profile with the extra params and mark
// some of them as required
export interface Auth0Profile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
    middleName: string;
  };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    middle_name: string;
    nickname: string;
    preferred_username: string;
    profile: string;
    picture: string;
    website: string;
    email: string;
    email_verified: boolean;
    gender: string;
    birthdate: string;
    zoneinfo: string;
    locale: string;
    phone_number: string;
    phone_number_verified: boolean;
    address: {
      country: string;
    };
    updated_at: string;
  };
}

// And we create our strategy extending the OAuth2Strategy, we also need to
// pass the User as we did on the FormStrategy, we pass the Auth0Profile and the
// extra params
export class Auth0Strategy<User> extends OAuth2Strategy<
  User,
  Auth0Profile,
  Auth0ExtraParams
> {
  // The OAuth2Strategy already has a name but we can override it
  name = "auth0";

  private userInfoURL: string;

  // We receive our custom options and our verify callback
  constructor(
    options: Auth0StrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, Auth0Profile, Auth0ExtraParams>
  ) {
    // And we pass the options to the super constructor using our own options
    // to generate them, this was we can ask less configuration to the developer
    // using our strategy
    super(
      {
        authorizationURL: `https://${options.domain}/authorize`,
        tokenURL: `https://${options.domain}/oauth/token`,
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.callbackURL,
      },
      verify
    );

    this.userInfoURL = `https://${options.domain}/userinfo`;
  }

  // We override the protected authorizationParams method to return a new
  // URLSearchParams with custom params we want to send to the authorizationURL.
  // Here we add the scope so Auth0 can use it, you can pass any extra param
  // you need to send to the authorizationURL here base on your provider.
  protected authorizationParams() {
    return new URLSearchParams({
      scope: "openid profile email",
    });
  }

  // We also override how to use the accessToken to get the profile of the user.
  // Here we fetch a Auth0 specific URL, get the profile data, and build the
  // object based on the Auth0Profile interface.
  protected async userProfile(accessToken: string): Promise<Auth0Profile> {
    let response = await fetch(this.userInfoURL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let data: Auth0Profile["_json"] = await response.json();

    let profile: Auth0Profile = {
      provider: "auth0",
      displayName: data.name,
      id: data.sub,
      name: {
        familyName: data.family_name,
        givenName: data.given_name,
        middleName: data.middle_name,
      },
      emails: [{ value: data.email }],
      photos: [{ value: data.picture }],
      _json: data,
    };

    return profile;
  }
}
```

And that's it, thanks to the `OAuth2Strategy` we don't need to implement the whole OAuth2 flow ourselves and can focus on the unique parts of our strategy which in this case are the user profile and extra params our provider may require us to send.
