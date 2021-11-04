import {
  OAuth2Profile,
  OAuth2Strategy,
  OAuth2StrategyVerifyCallback,
} from "./oauth2";

export interface ShopifyStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  /**
   * The URL to your Shopify store.
   */
  shop: string;
  /**
   * A comma-separated list of scopes. For example, to write orders and read
   * customers, use scope=write_orders,read_customers. Any permission to write
   * a resource includes the permission to read it.
   *
   * If you pass a list of strings the strategy will join them with a comma.
   */
  scopes: string | string[];
  /**
   * Sets the access mode. For online access mode, set to per-user. For offline
   * access mode, set to value. If no access mode is defined, then it defaults
   * to offline access mode.
   * @see https://shopify.dev/apps/auth/access-modes
   */
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
      scopes,
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
    this.scope = Array.isArray(scopes) ? scopes.join(",") : scopes;
    this.accessMode = accessMode;
  }

  protected authorizationParams() {
    return new URLSearchParams({
      scope: this.scope,
      "grant_mode[]": this.accessMode,
    });
  }
}
