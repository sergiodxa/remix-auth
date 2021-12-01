// We need to import the OAuth2Strategy, the verify callback and the profile interfaces
import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

// These are the custom options we need from the developer to use the strategy
export interface AppleStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

// These interface declare what extra params we will get from Apple on the
// verify callback
export interface AppleExtraParams extends Record<string, string | number> {
  id_token: string;
  expires_in: 3600;
  token_type: "Bearer";
}

// The AppleProfile extends the OAuth2Profile with the extra params and mark
// some of them as required
export type AppleProfile = OAuth2Profile;

// And we create our strategy extending the OAuth2Strategy, we also need to
// pass the User as we did on the FormStrategy, we pass the Auth0Profile and the
// extra params
export class AppleStrategy<User> extends OAuth2Strategy<
  User,
  AppleProfile,
  AppleExtraParams
> {
  // The OAuth2Strategy already has a name but we can override it
  name = "apple";

  // We receive our custom options and our verify callback
  constructor(
    options: AppleStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, AppleProfile, AppleExtraParams>
  ) {
    // And we pass the options to the super constructor using our own options
    // to generate them, this was we can ask less configuration to the developer
    // using our strategy

    super(
      {
        authorizationURL: `https://appleid.apple.com/auth/authorize`,
        tokenURL: `https://appleid.apple.com/auth/token`,
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.callbackURL,
      },
      verify
    );
  }

  protected async userProfile(): Promise<AppleProfile> {
    return { provider: "apple" };
  }

  // We override the protected authorizationParams method to return a new
  // URLSearchParams with custom params we want to send to the authorizationURL.
  // Here we add the scope so Auth0 can use it, you can pass any extra param
  // you need to send to the authorizationURL here base on your provider.
  protected authorizationParams() {
    return new URLSearchParams({
      response_mode: "query",
    });
  }
}
