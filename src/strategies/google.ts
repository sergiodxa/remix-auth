import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface GoogleStrategyOptions {
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

export interface GoogleProfile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  photos: [{ value: string }];
  _json: {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
    email: string;
    email_verified: boolean;
    hd: string;
  };
}

export interface GoogleExtraParams extends Record<string, string | number> {
  expires_in: 3920;
  token_type: "Bearer";
  scope: string;
  id_token: string;
}

export class GoogleStrategy<User> extends OAuth2Strategy<
  User,
  GoogleProfile,
  GoogleExtraParams
> {
  name = "google";

  private scope: string;
  private accessType: string;
  private prompt?: "none" | "consent" | "select_account";
  private includeGrantedScopes: boolean;
  private userInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo";

  constructor(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope,
      accessType,
      includeGrantedScopes,
      prompt,
    }: GoogleStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, GoogleProfile, GoogleExtraParams>
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenURL: "https://oauth2.googleapis.com/token",
      },
      verify
    );
    this.scope = scope ?? "openid profile email";
    this.accessType = accessType ?? "online";
    this.includeGrantedScopes = includeGrantedScopes ?? false;
    this.prompt = prompt;
  }

  protected authorizationParams() {
    let params = new URLSearchParams({
      scope: this.scope,
      access_type: this.accessType,
      include_granted_scopes: String(this.includeGrantedScopes),
    });
    if (this.prompt) params.set("prompt", this.prompt);
    return params;
  }

  protected async userProfile(accessToken: string): Promise<GoogleProfile> {
    let response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let raw: GoogleProfile["_json"] = await response.json();
    let profile: GoogleProfile = {
      provider: "google",
      id: raw.sub,
      displayName: raw.name,
      name: {
        familyName: raw.family_name,
        givenName: raw.given_name,
      },
      emails: [{ value: raw.email }],
      photos: [{ value: raw.picture }],
      _json: raw,
    };
    return profile;
  }
}
