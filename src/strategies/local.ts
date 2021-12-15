import { json, redirect, SessionStorage } from "@remix-run/server-runtime";
import { Strategy, StrategyOptions } from "../authenticator";

export interface LocalStrategyOptions {
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
  private errorKey: string;
  private usernameField: string;
  private passwordField: string;
  private verify: LocalStrategyVerifyCallback<User>;

  constructor(
    options: LocalStrategyOptions,
    verify: LocalStrategyVerifyCallback<User>
  ) {
    this.loginURL = options.loginURL;
    this.errorKey = options.sessionErrorKey ?? "auth:local:error";
    this.usernameField = options.usernameField ?? "username";
    this.passwordField = options.passwordField ?? "password";
    this.verify = verify;
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions
  ): Promise<User> {
    if (new URL(request.url).pathname !== this.loginURL) {
      throw json(
        {
          message:
            "The authenticate method with LocalStrategy can only be used on the login URL.",
        },
        { status: 400 }
      );
    }
    if (request.method.toLowerCase() !== "post") {
      throw json(
        {
          message:
            "The authenticate method with LocalStrategy can only be used on action functions.",
        },
        { status: 405 }
      );
    }

    let body = new URLSearchParams(await request.text());
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    let username = body.get(this.usernameField);
    let password = body.get(this.passwordField);

    // First we need to validate the body of the request. The username and
    // password must be present at the same time.
    if (!username || !password) {
      if (!username) {
        session.flash(`${this.errorKey}:user`, {
          message: "Missing username.",
        });
      }
      if (!password) {
        session.flash(`${this.errorKey}:pass`, {
          message: "Missing password.",
        });
      }
      let cookie = await sessionStorage.commitSession(session);
      throw redirect(this.loginURL, { headers: { "Set-Cookie": cookie } });
    }

    let user: User;

    try {
      user = await this.verify(username, password);
    } catch (error) {
      let message = (error as Error).message;

      // if a failureRedirect is not set, we throw a 401 Response
      if (!options.failureRedirect) throw json({ message }, { status: 401 });
      // if we do have a failureRedirect, we redirect to it and set the error
      // in the session errorKey
      session.flash(this.errorKey, { message });
      throw redirect(options.failureRedirect, {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      });
    }

    // if a successRedirect is not set, we return the user
    if (!options.successRedirect) return user;

    // if the successRedirect is set, we redirect to it and set the user in the
    // session sessionKey
    session.set(options.sessionKey, user);
    let cookie = await sessionStorage.commitSession(session);
    throw redirect(options.successRedirect, {
      headers: { "Set-Cookie": cookie },
    });
  }
}
