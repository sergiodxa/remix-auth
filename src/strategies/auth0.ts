import {
  fetch,
  Headers,
  redirect,
  Request,
  Response,
  SessionStorage,
} from "@remix-run/node";
import { randomBytes } from "crypto";
import { AuthenticateCallback, Strategy } from "../authenticator";

export interface Auth0StrategyOptions {
  domain: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export interface Auth0Body {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: 86_400;
  token_type: "Bearer";
}

export interface Auth0StrategyVerifyCallback<Result> {
  (accessToken: string, extraParams: Auth0Body): Promise<Result>;
}

export class Auth0Strategy<User> implements Strategy<User> {
  name = "auth0";

  private domain: string;
  private clientID: string;
  private clientSecret: string;
  private callbackURL: string;
  private verify: Auth0StrategyVerifyCallback<User>;

  constructor(
    options: Auth0StrategyOptions,
    verify: Auth0StrategyVerifyCallback<User>
  ) {
    this.domain = options.domain;
    this.clientID = options.clientID;
    this.clientSecret = options.clientSecret;
    this.callbackURL = options.callbackURL;
    this.verify = verify;
  }

  authenticate(
    request: Request,
    sessionStorage: SessionStorage
  ): Promise<User | null>;
  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback: AuthenticateCallback<User>
  ): Promise<Response>;
  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback?: AuthenticateCallback<User>
  ): Promise<Response | User | null> {
    if (new URL(request.url).pathname === this.callbackPath()) {
      let extraParams = await this.handleCallback(request, sessionStorage);
      let user = await this.verify(extraParams.access_token, extraParams);
      if (callback) return callback(user);
      return user;
    }

    let userOrResponse = await this.authorize(request, sessionStorage);

    // if a callback is defined, we want to return a possible response or
    // run the callback with the result object of the authorize method
    if (callback) {
      if (userOrResponse instanceof Response) return userOrResponse;
      return callback(userOrResponse);
    }

    // if no callback is defined, we want to return null if the result is a
    // response and the result object if it's not
    if (userOrResponse instanceof Response) return null;
    return userOrResponse;
  }

  callbackPath() {
    if (
      this.callbackURL.startsWith("http://") ||
      this.callbackURL.startsWith("https://")
    ) {
      return new URL(this.callbackURL).pathname;
    }

    return new URL(`http://${this.callbackURL}`).pathname;
  }

  /**
   * Generate the URL to redirect the user to for authentication.
   */
  private redirectUrl(state: string, scope = "openid profile email") {
    let url = new URL(`https://${this.domain}`);
    url.pathname = "/authorize";
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.clientID);
    url.searchParams.set("redirect_uri", this.callbackURL);
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);
    return url.toString();
  }

  /**
   * Authorize a request, if the user is not in the session it will redirect
   * to the authentication URL and store the generated state in the session
   */
  private async authorize(
    request: Request,
    sessionStorage: SessionStorage
  ): Promise<User | Response> {
    let state = encodeURIComponent(randomBytes(100).toString("base64"));
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // User is already authenticated
    let user = session.get("user");
    if (user) return user as User;

    session.set("auth0:state", state);

    let headers = new Headers();
    headers.append("Set-Cookie", await sessionStorage.commitSession(session));

    return redirect(this.redirectUrl(state), { headers });
  }

  private async handleCallback(
    request: Request,
    sessionStorage: SessionStorage
  ) {
    let url = new URL(request.url);
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // check if we have a state in the URL
    let state = url.searchParams.get("state");
    if (!state) throw new Error("Missing state.");

    // check if the state is valid (saved in our Auth0Store and delete it or
    // redirect back to /login
    if (session.get("auth0:state") === state) session.unset("auth0:state");
    else throw new Error("State doesn't match.");

    // check if we have a code in the URL and redirect to /login if we don't
    let code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code.");

    // Get an authorization token using the code we received
    let response = await fetch(
      new URL("/oauth/token", `https://${this.domain}`).toString(),
      {
        method: "POST",
        headers: new Headers([["Content-Type", "application/json"]]),
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_secret: this.clientSecret,
          redirect_uri: this.callbackURL,
          client_id: this.clientID,
          code,
        }),
      }
    );

    let body = await response.json();

    // check if our body is an error and throw
    if ((body as { error: string }).error) throw new Error(body.error);
    return body as Auth0Body;
  }
}
