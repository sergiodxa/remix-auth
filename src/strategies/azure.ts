import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface AzureStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string;
  tenant?: string;
}

export interface AzureProfile extends OAuth2Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  _json: {
    sub: string;
    name: string;
    family_name: string;
    given_name: string;
    email: string;
  };
}

export interface AzureExtraParams extends Record<string, string | number> {
  expires_in: 3599;
  token_type: "Bearer";
  scope: string;
  id_token: string;
}

export class AzureStrategy<User> extends OAuth2Strategy<
  User,
  AzureProfile,
  AzureExtraParams
> {
  name = "azure";

  private scope: string;
  private userInfoURL = "https://graph.microsoft.com/oidc/userinfo";

  constructor(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope,
      tenant = "common",
    }: AzureStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, AzureProfile, AzureExtraParams>
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      },
      verify
    );
    this.scope = scope ?? "openid profile email";
  }

  protected authorizationParams() {
    return new URLSearchParams({
      scope: this.scope,
    });
  }

  protected async userProfile(accessToken: string): Promise<AzureProfile> {
    let response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let data: AzureProfile["_json"] = await response.json();

    let profile: AzureProfile = {
      provider: "azure",
      displayName: data.name,
      id: data.sub,
      name: {
        familyName: data.family_name,
        givenName: data.given_name,
      },
      emails: [{ value: data.email }],
      _json: data,
    };

    return profile;
  }
}
