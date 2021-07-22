import { redirect, Request, Response, SessionStorage } from "@remix-run/node";
import { parseBody } from "remix-utils";
import { AuthenticateCallback, Strategy } from "../authenticator";

export interface LocalStrategyOptions {
  loginURL: string;
  errorKey?: string;
  usernameField?: string;
  passwordField?: string;
}

export interface LocalStrategyVerifyCallback<Result> {
  (username: string, password: string): Promise<Result>;
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
    this.errorKey = options.errorKey ?? "auth:local:error";
    this.usernameField = options.usernameField ?? "username";
    this.passwordField = options.passwordField ?? "password";
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
  ): Promise<Response | User | Error | null> {
    if (
      new URL(request.url).pathname === this.loginURL &&
      request.method.toLowerCase() === "post"
    ) {
      let body = await parseBody(request);

      let username = body.get(this.usernameField);
      let password = body.get(this.passwordField);

      if (!username) throw new Error("Missing username");
      if (!password) throw new Error("Missing password");

      try {
        let user = await this.verify(username, password);
        if (callback) return callback(user);
        return user;
      } catch (error: unknown) {
        // In case the callback is defined we want to return a new response
        // with the redirect to the login URL, that way you don't need to
        // handle the error yourself. If the callback was not defined we throw
        // it so you need to handle it and redirect
        if (!callback) throw error as Error;

        let session = await sessionStorage.getSession(
          request.headers.get("Cookie")
        );
        session.set(this.errorKey, (error as Error).message);

        return redirect(this.loginURL, {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        });
      }
    }

    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    let user: User | null = session.get("user");

    if (!user && callback) return redirect(this.loginURL);
    if (user && callback) return callback(user);
    return user;
  }
}
