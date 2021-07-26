import { redirect, Request, Response, SessionStorage } from "@remix-run/node";
import { parseBody } from "remix-utils";
import {
  AuthenticateCallback,
  AuthorizationError,
  Strategy,
  StrategyRedirects,
} from "../authenticator";

export interface LocalStrategyOptions extends StrategyRedirects {
  loginURL: string;
  sessionErrorKey?: string;
  usernameField?: string;
  passwordField?: string;
}

export interface LocalStrategyVerifyCallback<User> {
  (username: string, password: string): Promise<User>;
}

export class LocalStrategy<User> implements Strategy<User> {
  name = "local";

  private loginURL: string;
  private sessionErrorKey: string;
  private usernameField: string;
  private passwordField: string;
  private verify: LocalStrategyVerifyCallback<User>;
  private successRedirect: string;
  private failureRedirect: string;

  constructor(
    options: LocalStrategyOptions,
    verify: LocalStrategyVerifyCallback<User>
  ) {
    this.loginURL = options.loginURL;
    this.sessionErrorKey = options.sessionErrorKey ?? "auth:local:error";
    this.usernameField = options.usernameField ?? "username";
    this.passwordField = options.passwordField ?? "password";
    this.successRedirect = options.successRedirect ?? "/";
    this.failureRedirect = options.failureRedirect ?? options.loginURL;
    this.verify = verify;
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback?: AuthenticateCallback<User>
  ): Promise<Response> {
    if (new URL(request.url).pathname !== this.loginURL) {
      throw new AuthorizationError(
        "The authenticate method with LocalStrategy can only be used on the login URL."
      );
    }

    if (request.method.toLowerCase() !== "post") {
      throw new AuthorizationError(
        "The authenticate method with LocalStrategy can only be used on action functions."
      );
    }

    let body = await parseBody(request);
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    let username = body.get(this.usernameField);
    let password = body.get(this.passwordField);

    // First we need to validate the body of the request. The username and
    // password must be present at the same time.
    if (!username || !password) {
      if (!username) {
        session.flash(`${this.sessionErrorKey}:user`, "Missing username.");
      }
      if (!password) {
        session.flash(`${this.sessionErrorKey}:pass`, "Missing password.");
      }
      let cookie = await sessionStorage.commitSession(session);
      return this.redirect(cookie, false);
    }

    try {
      let user = await this.verify(username, password);

      // A callback was provided, now it's the developer responsibility to
      // save the user data on the session and commit it.
      if (callback) return callback(user);

      // Because a callback was not provided, we are going to store the user
      // data on the session and commit it as a cookie.
      session.set("user", user);
      let cookie = await sessionStorage.commitSession(session);
      return this.redirect(cookie, true);
    } catch (error: unknown) {
      session.flash(this.sessionErrorKey, (error as Error).message);
      let cookie = await sessionStorage.commitSession(session);
      return this.redirect(cookie, false);
    }
  }

  private redirect(cookie: string, status: boolean): Response {
    let url = status ? this.successRedirect : this.failureRedirect;
    return redirect(url, {
      headers: { "Set-Cookie": cookie },
    });
  }
}
