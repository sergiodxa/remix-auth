import {
  Authenticator,
  Auth0Strategy,
  Auth0ExtraParams,
  Auth0Profile,
} from "remix-auth";
import { login, User } from "~/models/user";
import { sessionStorage } from "~/services/session.server";

// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export const authenticator = new Authenticator<User>(sessionStorage);

if (!process.env.AUTH0_CALLBACK_URL) {
  throw new Error("Missing AUTH0_CALLBACK_URL env");
}

if (!process.env.AUTH0_CLIENT_ID) {
  throw new Error("Missing AUTH0_CLIENT_ID env");
}

if (!process.env.AUTH0_CLIENT_SECRET) {
  throw new Error("Missing AUTH0_CLIENT_SECRET env");
}

if (!process.env.AUTH0_DOMAIN) {
  throw new Error("Missing AUTH0_DOMAIN env");
}

if (!process.env.AUTH0_LOGOUT_URL) {
  throw new Error("Missing AUTH0_LOGOUT_URL env");
}

authenticator.use(
  new Auth0Strategy(
    {
      callbackURL: process.env.AUTH0_CALLBACK_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      domain: process.env.AUTH0_DOMAIN,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      _extraParams: Auth0ExtraParams,
      _profile: Auth0Profile
    ) => login(_profile.emails[0].value)
  ),
  "auth0"
);
