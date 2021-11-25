import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface FacebookStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  /**
   * @default "openid profile email"
   */
  scope?: string;
  accessType?: "online" | "offline";
  includeGrantedScopes?: boolean;
  prompt?: "none" | "consent" | "select_account";
}

export interface FacebookProfile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
    middleName?: string;
  };
  emails: [{ value: string }];
  photos: [{ value: string }];
  _json: {
    id: string;
    name: string;
    email: string;
    last_name: string;
    first_name: string;
    name_format: string;
    picture: string;
  };
}

export interface FacebookExtraParams extends Record<string, string | number> {
  expires_in: 3920;
  token_type: "Bearer";
  access_token: string;
  code: string;
}

export class FacebookStrategy<User> extends OAuth2Strategy<
  User,
  FacebookProfile,
  FacebookExtraParams
> {
  name = "facebook";

  private scope: string;
  private accessType: string;
  private prompt?: "none" | "consent" | "select_account";
  private userInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo";

  constructor(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope,
      accessType,
      prompt,
    }: FacebookStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<
      User,
      FacebookProfile,
      FacebookExtraParams
    >
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: "https://www.facebook.com/v12.0/dialog/oauth",
        tokenURL: "https://graph.facebook.com/v12.0/oauth/access_token",
      },
      verify
    );
    this.scope = scope ?? "email,public_profile";
    this.accessType = accessType ?? "online";
    this.prompt = prompt;
  }

  protected authorizationParams() {
    let params = new URLSearchParams({
      scope: this.scope,
      access_type: this.accessType,
    });
    if (this.prompt) params.set("prompt", this.prompt);
    return params;
  }

  protected async userProfile(accessToken: string): Promise<FacebookProfile> {
    let response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let raw: FacebookProfile["_json"] = await response.json();
    let profile: FacebookProfile = {
      provider: "facebook",
      id: raw.id,
      displayName: raw.name,
      name: {
        familyName: raw.last_name,
        givenName: raw.first_name,
      },
      emails: [{ value: raw.email }],
      photos: [{ value: raw.picture }],
      _json: raw,
    };
    return profile;
  }
}
