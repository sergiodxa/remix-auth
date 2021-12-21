import { AuthorizationError } from "../error";
import { StrategyVerifyCallback } from "../strategy";
import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyParams,
} from "./oauth2";

export interface SpotifyStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string;
}

export interface SpotifyImage {
  url: string;
}

export interface SpotifyProfile extends OAuth2Profile {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
}

export interface SpotifyExtraParams extends Record<string, string | number> {
  tokenType: string;
  expiresIn: number;
}

export class SpotifyStrategy<User> extends OAuth2Strategy<
  User,
  SpotifyProfile,
  SpotifyExtraParams
> {
  name = "spotify";

  private scope: string;
  private userInfoURL = "https://api.spotify.com/v1/me";

  constructor(
    { clientID, clientSecret, callbackURL, scope }: SpotifyStrategyOptions,
    verify: StrategyVerifyCallback<
      User,
      OAuth2StrategyVerifyParams<SpotifyProfile, SpotifyExtraParams>
    >
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: "https://accounts.spotify.com/authorize",
        tokenURL: "https://accounts.spotify.com/api/token",
      },
      verify
    );
    this.scope = scope ?? "user-read-private user-read-email";
  }

  protected authorizationParams() {
    return new URLSearchParams({
      scope: this.scope,
    });
  }

  protected async userProfile(accessToken: string): Promise<SpotifyProfile> {
    const response = await fetch(this.userInfoURL, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data: SpotifyProfile = await response.json();

    const profile: SpotifyProfile = {
      provider: "spotify",
      id: data.id,
      display_name: data.display_name,
      email: data.email,
      images: data.images,
    };

    return profile;
  }

  protected async getAccessToken(response: Response): Promise<{
    accessToken: string;
    refreshToken: string;
    extraParams: SpotifyExtraParams;
  }> {
    const data = await response.json();

    const accessToken = new URLSearchParams(data).get("access_token");
    if (!accessToken) throw new AuthorizationError("Missing access token.");

    const refreshToken = new URLSearchParams(data).get("refresh_token");
    if (!refreshToken) throw new AuthorizationError("Missing refresh token.");

    const tokenType = new URLSearchParams(data).get("token_type");
    if (!tokenType) throw new AuthorizationError("Missing token type.");

    const expiresIn = new URLSearchParams(data).get("expires_in");
    if (!expiresIn) throw new AuthorizationError("Missing expires in.");

    return {
      accessToken,
      refreshToken,
      extraParams: { tokenType, expiresIn: Number(expiresIn) },
    } as const;
  }
}
