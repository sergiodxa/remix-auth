import { fetch } from "@remix-run/node";
import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface LinearStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  /**
   * Comma separated list of scopes:
   * - `read` - (Default) Read access for the user's account. This scope will
   * always be present.
   * - `write` - Write access for the user's account. If your application only
   * needs to create comments, use a more targeted scope
   * - `issues:create` - Allows creating new issues and their attachments
   * - `comments:create` - Allows creating new issue comments
   * - `admin` - Full access to admin level endpoints. You should never ask for this permission unless it's absolutely needed
   * @default "read"
   */
  scope?: string;
}

export type LinearProfile = OAuth2Profile;

export interface LinearExtraParams extends Record<string, unknown> {
  expires_in: 315_705_599;
  token_type: "Bearer";
  scope: string[];
}

export class LinearStrategy<User> extends OAuth2Strategy<
  User,
  LinearProfile,
  LinearExtraParams
> {
  name = "linear";

  private scope: string;

  constructor(
    { clientID, clientSecret, callbackURL, scope }: LinearStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, LinearProfile, LinearExtraParams>
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: "https://linear.app/oauth/authorize",
        tokenURL: "https://oauth2.googleapis.com/token",
      },
      verify
    );
    this.scope = scope ?? "read";
  }

  public async revoke(accessToken: string): Promise<void> {
    let response = await fetch("https://api.linear.app/oauth/revoke", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.ok) return;
    throw new Error(response.statusText);
  }

  protected authorizationParams() {
    return new URLSearchParams({
      scope: this.scope,
    });
  }

  protected async userProfile(): Promise<LinearProfile> {
    return { provider: "linear" };
  }
}
