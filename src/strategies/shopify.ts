import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface ShopifyStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  shop: string;
  scope: string;
  accessMode: "value" | "per-user";
}

export class ShopifyStrategy<User> extends OAuth2Strategy<User, OAuth2Profile> {
  name = "shopify";

  private scope: string;
  private accessMode: "value" | "per-user";

  constructor(
    {
      clientID,
      clientSecret,
      callbackURL,
      shop,
      scope,
      accessMode,
    }: ShopifyStrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, OAuth2Profile>
  ) {
    super(
      {
        clientID,
        clientSecret,
        callbackURL,
        authorizationURL: `https://${shop}/admin/oauth/authorize`,
        tokenURL: `https://${shop}/admin/oauth/access_token`,
      },
      verify
    );
    this.scope = scope;
    this.accessMode = accessMode;
  }

  protected authorizationParams() {
    return new URLSearchParams({
      scope: this.scope,
      "grant_mode[]": this.accessMode,
    });
  }
}
