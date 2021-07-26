import {
  Headers,
  redirect,
  Request,
  Response,
  Session,
  SessionStorage,
} from "@remix-run/node";
import { randomBytes } from "crypto";
import {
  AuthenticateCallback,
  AuthorizationError,
  Strategy,
  StrategyRedirects,
} from "../authenticator";

export interface OAuth2Profile {
  provider: string;
  id?: string;
  displayName?: string;
  name?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
  }>;
  photos?: Array<{ value: string }>;
}

export interface OAuth2StrategyOptions extends Required<StrategyRedirects> {
  authorizationURL: string;
  tokenURL: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  sessionErrorKey?: string;
}

export interface OAuth2StrategyVerifyCallback<
  User,
  Profile extends OAuth2Profile,
  ExtraParams extends Record<string, unknown> = Record<string, never>
> {
  (
    accessToken: string,
    refreshToken: string,
    extraParams: ExtraParams,
    profile: Profile
  ): Promise<User>;
}

/**
 * The OAuth 2.0 authentication strategy authenticates requests using the OAuth
 * 2.0 framework.
 *
 * OAuth 2.0 provides a facility for delegated authentication, whereby users can
 * authenticate using a third-party service such as Facebook.  Delegating in
 * this manner involves a sequence of events, including redirecting the user to
 * the third-party service for authorization.  Once authorization has been
 * granted, the user is redirected back to the application and an authorization
 * code can be used to obtain credentials.
 *
 * Applications must supply a `verify` callback, for which the function
 * signature is:
 *
 *     function(accessToken, refreshToken, profile) { ... }
 *
 * The verify callback is responsible for finding or creating the user, and
 * returning the resulting user object.
 *
 * An AuthorizationError should be raised to indicate an authentication failure.
 *
 * Options:
 * - `authorizationURL`  URL used to obtain an authorization grant
 * - `tokenURL`          URL used to obtain an access token
 * - `clientID`          identifies client to service provider
 * - `clientSecret`      secret used to establish ownership of the client identifer
 * - `callbackURL`       URL to which the service provider will redirect the user after obtaining authorization
 *
 * @example
 * authenticator.use(new OAuth2Strategy(
 *   {
 *     authorizationURL: 'https://www.example.com/oauth2/authorize',
 *     tokenURL: 'https://www.example.com/oauth2/token',
 *     clientID: '123-456-789',
 *     clientSecret: 'shhh-its-a-secret'
 *     callbackURL: 'https://www.example.net/auth/example/callback'
 *   },
 *   (accessToken, refreshToken, profile) => {
 *     return User.findOrCreate(...);
 *   }
 * ));
 */
export class OAuth2Strategy<
  User,
  Profile extends OAuth2Profile,
  ExtraParams extends Record<string, unknown> = Record<string, never>
> implements Strategy<User>
{
  name = "oauth2";

  protected authorizationURL: string;
  protected tokenURL: string;
  protected clientID: string;
  protected clientSecret: string;
  protected callbackURL: string;
  protected successRedirect: string;
  protected failureRedirect: string;
  protected sessionErrorKey: string = "oauth2:error";
  protected verify: OAuth2StrategyVerifyCallback<User, Profile, ExtraParams>;

  private sessionStateKey = "oauth2:state";

  constructor(
    options: OAuth2StrategyOptions,
    verify: OAuth2StrategyVerifyCallback<User, Profile, ExtraParams>
  ) {
    this.authorizationURL = options.authorizationURL;
    this.tokenURL = options.tokenURL;
    this.clientID = options.clientID;
    this.clientSecret = options.clientSecret;
    this.callbackURL = options.callbackURL;
    this.successRedirect = options.successRedirect;
    this.failureRedirect = options.failureRedirect;
    this.sessionErrorKey = options.sessionErrorKey ?? "oauth2:error";
    this.verify = verify;
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback?: AuthenticateCallback<User>
  ): Promise<Response> {
    let url = new URL(request.url);
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    let user: User | null = session.get("user") ?? null;

    // User is already authenticated
    if (user) return callback ? callback(user) : this.redirect("success");

    let callbackURL = this.getCallbackURL(url);
    if (url.pathname !== callbackURL.pathname) {
      return this.authorize(sessionStorage, session);
    }

    let state = url.searchParams.get("state");
    if (!state) return this.authorize(sessionStorage, session);

    if (session.get(this.sessionStateKey) === state) {
      session.unset(this.sessionStateKey);
    } else return this.authorize(sessionStorage, session);

    let code = url.searchParams.get("code");
    if (!code) return this.authorize(sessionStorage, session);

    let params = new URLSearchParams(this.tokenParams());
    params.set("grant_type", "authorization_code");
    params.set("redirect_uri", callbackURL.toString());

    try {
      let result = await this.getAccessToken(code, params);
      let { accessToken, refreshToken, extraParams } = result;

      let profile = await this.userProfile(accessToken, extraParams);
      user = await this.verify(accessToken, refreshToken, extraParams, profile);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return this.authorize(sessionStorage, session);
      }
      session.flash(this.sessionErrorKey, error.message);
      let cookie = await sessionStorage.commitSession(session);
      return this.redirect("failure", cookie);
    }

    // A callback was provided, now it's the developer responsibility to save
    // the user data on the session and commit it.
    if (callback) return callback(user);

    // Because a callback was not provided, we are going to store the user data
    // on the session and commit it as a cookie.
    session.set("user", user);
    let cookie = await sessionStorage.commitSession(session);
    return this.redirect("success", cookie);
  }

  /**
   * Retrieve user profile from service provider.
   *
   * OAuth 2.0-based authentication strategies can overrride this function in
   * order to load the user's profile from the service provider.  This assists
   * applications (and users of those applications) in the initial registration
   * process by automatically submitting required information.
   */
  protected async userProfile(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accessToken: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: ExtraParams
  ): Promise<Profile> {
    return { provider: "oauth2" } as Profile;
  }

  /**
   * Return extra parameters to be included in the authorization request.
   *
   * Some OAuth 2.0 providers allow additional, non-standard parameters to be
   * included when requesting authorization.  Since these parameters are not
   * standardized by the OAuth 2.0 specification, OAuth 2.0-based authentication
   * strategies can overrride this function in order to populate these
   * parameters as required by the provider.
   */
  protected authorizationParams(): URLSearchParams {
    return new URLSearchParams();
  }

  /**
   * Return extra parameters to be included in the token request.
   *
   * Some OAuth 2.0 providers allow additional, non-standard parameters to be
   * included when requesting an access token.  Since these parameters are not
   * standardized by the OAuth 2.0 specification, OAuth 2.0-based authentication
   * strategies can overrride this function in order to populate these
   * parameters as required by the provider.
   */
  protected tokenParams(): URLSearchParams {
    return new URLSearchParams();
  }

  private getCallbackURL(url: URL) {
    if (
      this.callbackURL.startsWith("http:") ||
      this.callbackURL.startsWith("https:")
    ) {
      return new URL(this.callbackURL);
    }
    if (this.callbackURL.startsWith("/")) {
      return new URL(this.callbackURL, url);
    }
    return new URL(`${url.protocol}//${this.callbackURL}`);
  }

  private async authorize(sessionStorage: SessionStorage, session: Session) {
    let state = encodeURIComponent(randomBytes(100).toString("base64"));

    session.set(this.sessionStateKey, state);

    let cookie = await sessionStorage.commitSession(session);

    let params = new URLSearchParams(this.authorizationParams());
    params.set("response_type", "code");
    params.set("client_id", this.clientID);
    params.set("redirect_uri", this.callbackURL);
    params.set("state", state);

    let url = new URL(this.authorizationURL);
    url.search = params.toString();

    return redirect(url.toString(), { headers: { "Set-Cookie": cookie } });
  }

  /**
   * Format the data to be sent in the request body to the token endpoint.
   */
  private async getAccessToken(
    code: string,
    params: URLSearchParams
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    extraParams: ExtraParams;
  }> {
    params.set("client_id", this.clientID);
    params.set("client_secret", this.clientSecret);

    if (params.get("grant_type") === "refresh_token") {
      params.set("refresh_token", code);
    } else {
      params.set("code", code);
    }

    let response = await fetch(this.tokenURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!response.ok) {
      try {
        let body = await response.json();
        if (body?.error) throw new AuthorizationError(body.error);
        throw new AuthorizationError();
      } catch {
        throw new AuthorizationError();
      }
    }

    let { access_token, refresh_token, ...extraParams } = await response.json();

    return {
      accessToken: access_token as string,
      refreshToken: refresh_token as string,
      extraParams,
    } as const;
  }

  private redirect(status: "success" | "failure", cookie?: string): Response {
    let url = "/";
    if (status === "success") url = this.successRedirect;
    if (status === "failure") url = this.failureRedirect;
    if (status !== "success" && status !== "failure")
      throw new Error("Invalid status");

    let headers = new Headers();
    if (cookie) headers.append("Set-Cookie", cookie);

    return redirect(url, { headers });
  }
}
