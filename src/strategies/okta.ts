import {
  OAuth2Strategy,
  OAuth2Profile,
  OAuth2StrategyVerifyCallback,
  OAuth2StrategyOptions,
} from "./oauth2";

export interface OktaUserInfo {
  sub: string;
  name: string;
  preferred_username: string;
  nickname: string;
  given_name: string;
  middle_name: string;
  family_name: string;
  profile: string;
  zoneinfo: string;
  locale: string;
  updated_at: string;
  email: string;
  email_verified: boolean;
}

export interface OktaStrategyOptions
  extends Omit<OAuth2StrategyOptions, "authorizationURL" | "tokenURL"> {
  scope?: string;
  issuer: string;
}

export class OktaStrategy<User> extends OAuth2Strategy<User, OAuth2Profile> {
  private readonly scope: string;
  private readonly userInfoURL: string;
  name = "okta";

  constructor(
    { issuer, scope = "openid profile email", ...rest }: OktaStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, OAuth2Profile>
  ) {
    super(
      {
        authorizationURL: `${issuer}/v1/authorize`,
        tokenURL: `${issuer}/v1/token`,
        ...rest,
      },
      verify
    );
    this.scope = scope;
    this.userInfoURL = `${issuer}/v1/userinfo`;
  }

  protected authorizationParams(): URLSearchParams {
    return new URLSearchParams({
      scope: this.scope,
    });
  }

  protected async userProfile(accessToken: string): Promise<OAuth2Profile> {
    const response = await fetch(this.userInfoURL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const profile: OktaUserInfo = await response.json();
    return {
      provider: "okta",
      id: profile.sub,
      name: {
        familyName: profile.family_name,
        givenName: profile.given_name,
        middleName: profile.middle_name,
      },
      displayName: profile.name ?? profile.preferred_username,
      emails: [{ value: profile.email }],
    };
  }
}
