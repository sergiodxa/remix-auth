import { SessionStorage } from "@remix-run/server-runtime";
import {
  AuthenticateOptions,
  Strategy,
  StrategyVerifyCallback,
} from "../strategy";

export interface LocalStrategyOptions {
  usernameField?: string;
  passwordField?: string;
}

export interface LocalStrategyVerifyParams {
  username: string;
  password: string;
}

export interface LocalStrategyVerifyCallback<User> {
  (username: string, password: string): Promise<User>;
}

export class LocalStrategy<User> extends Strategy<
  User,
  LocalStrategyVerifyParams
> {
  name = "local";

  private usernameField: string;
  private passwordField: string;

  constructor(
    options: LocalStrategyOptions,
    verify: StrategyVerifyCallback<User, LocalStrategyVerifyParams>
  ) {
    super(verify);
    this.usernameField = options.usernameField ?? "username";
    this.passwordField = options.passwordField ?? "password";
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User> {
    let body = await request.formData();

    let username = body.get(this.usernameField);
    let password = body.get(this.passwordField);

    // First we need to validate the body of the request. The username and
    // password must be present at the same time.
    if (!this.isString(username) && !this.isString(password)) {
      return await this.failure(
        "Username and password are required.",
        request,
        sessionStorage,
        options
      );
    }

    if (!this.isString(username)) {
      return await this.failure(
        "Username is required.",
        request,
        sessionStorage,
        options
      );
    }

    if (!this.isString(password)) {
      return await this.failure(
        "Password is required.",
        request,
        sessionStorage,
        options
      );
    }

    if (this.isEmpty(username)) {
      return await this.failure(
        "Username is empty.",
        request,
        sessionStorage,
        options
      );
    }

    if (this.isEmpty(password)) {
      return await this.failure(
        "Password is empty.",
        request,
        sessionStorage,
        options
      );
    }

    let user: User;

    try {
      user = await this.verify({ username, password });
    } catch (error) {
      let message = (error as Error).message;
      return await this.failure(message, request, sessionStorage, options);
    }

    return await this.success(user, request, sessionStorage, options);
  }

  private isString(value: unknown): value is string {
    return typeof value === "string";
  }

  private isEmpty(value: string): boolean {
    return value.length === 0;
  }
}
