import {
  isSession,
  redirect,
  Session,
  SessionStorage,
} from "@remix-run/server-runtime";
import { AuthenticateOptions, Strategy } from "./strategy";

export interface AuthenticateCallback<User> {
  (user: User): Promise<Response>;
}

/**
 * Extra options for the authenticator.
 */
export interface AuthenticatorOptions {
  sessionKey?: AuthenticateOptions["sessionKey"];
  sessionErrorKey?: AuthenticateOptions["sessionErrorKey"];
  sessionStrategyKey?: AuthenticateOptions["sessionStrategyKey"];
  throwOnError?: AuthenticateOptions["throwOnError"];
}

export class Authenticator<User = unknown> {
  /**
   * A map of the configured strategies, the key is the name of the strategy
   * @private
   */
  private strategies = new Map<string, Strategy<User, never>>();

  public readonly sessionKey: NonNullable<AuthenticatorOptions["sessionKey"]>;
  public readonly sessionErrorKey: NonNullable<
    AuthenticatorOptions["sessionErrorKey"]
  >;
  public readonly sessionStrategyKey: NonNullable<
    AuthenticateOptions["sessionStrategyKey"]
  >;
  private readonly throwOnError: AuthenticatorOptions["throwOnError"];

  /**
   * Create a new instance of the Authenticator.
   *
   * It receives a instance of the SessionStorage. This session storage could
   * be created using any method exported by Remix, this includes:
   * - `createSessionStorage`
   * - `createFileSystemSessionStorage`
   * - `createCookieSessionStorage`
   * - `createMemorySessionStorage`
   *
   * It optionally receives an object with extra options. The supported options
   * are:
   * - `sessionKey`: The key used to store and read the user in the session storage.
   * @example
   * import { sessionStorage } from "./session.server";
   * let authenticator = new Authenticator(sessionStorage);
   * @example
   * import { sessionStorage } from "./session.server";
   * let authenticator = new Authenticator(sessionStorage, {
   *   sessionKey: "token",
   * });
   */
  constructor(
    private sessionStorage: SessionStorage,
    options: AuthenticatorOptions = {}
  ) {
    this.sessionKey = options.sessionKey || "user";
    this.sessionErrorKey = options.sessionErrorKey || "auth:error";
    this.sessionStrategyKey = options.sessionStrategyKey || "strategy";
    this.throwOnError = options.throwOnError ?? false;
  }

  /**
   * Call this method with the Strategy, the optional name allows you to setup
   * the same strategy multiple times with different names.
   * It returns the Authenticator instance for concatenation.
   * @example
   * authenticator
   *  .use(new SomeStrategy({}, (user) => Promise.resolve(user)))
   *  .use(new SomeStrategy({}, (user) => Promise.resolve(user)), "another");
   */
  use(strategy: Strategy<User, never>, name?: string): Authenticator<User> {
    this.strategies.set(name ?? strategy.name, strategy);
    return this;
  }

  /**
   * Call this method with the name of the strategy you want to remove.
   * It returns the Authenticator instance for concatenation.
   * @example
   * authenticator.unuse("another").unuse("some");
   */
  unuse(name: string): Authenticator {
    this.strategies.delete(name);
    return this;
  }

  /**
   * Call this to authenticate a request using some strategy. You pass the name
   * of the strategy you want to use and the request to authenticate.
   * @example
   * async function action({ request }: ActionFunctionArgs) {
   *   let user = await authenticator.authenticate("some", request);
   * };
   * @example
   * async function action({ request }: ActionFunctionArgs) {
   *   return authenticator.authenticate("some", request, {
   *     successRedirect: "/private",
   *     failureRedirect: "/login",
   *   });
   * };
   */
  authenticate(
    strategy: string,
    request: Request,
    options: Pick<
      AuthenticateOptions,
      "failureRedirect" | "throwOnError" | "context"
    > & {
      successRedirect: AuthenticateOptions["successRedirect"];
    }
  ): Promise<never>;
  authenticate(
    strategy: string,
    request: Request,
    options: Pick<
      AuthenticateOptions,
      "successRedirect" | "throwOnError" | "context"
    > & {
      failureRedirect: AuthenticateOptions["failureRedirect"];
    }
  ): Promise<User>;
  authenticate(
    strategy: string,
    request: Request,
    options?: Pick<
      AuthenticateOptions,
      "successRedirect" | "failureRedirect" | "throwOnError" | "context"
    >
  ): Promise<User>;
  authenticate(
    strategy: string,
    request: Request,
    options: Pick<
      AuthenticateOptions,
      "successRedirect" | "failureRedirect" | "throwOnError" | "context"
    > = {}
  ): Promise<User> {
    const strategyObj = this.strategies.get(strategy);
    if (!strategyObj) throw new Error(`Strategy ${strategy} not found.`);
    return strategyObj.authenticate(
      new Request(request.url, request),
      this.sessionStorage,
      {
        throwOnError: this.throwOnError,
        ...options,
        name: strategy,
        sessionKey: this.sessionKey,
        sessionErrorKey: this.sessionErrorKey,
        sessionStrategyKey: this.sessionStrategyKey,
      }
    );
  }

  /**
   * Call this to check if the user is authenticated. It will return a Promise
   * with the user object or null, you can use this to check if the user is
   * logged-in or not without triggering the whole authentication flow.
   * @example
   * async function loader({ request }: LoaderFunctionArgs) {
   *   // if the user is not authenticated, redirect to login
   *   let user = await authenticator.isAuthenticated(request, {
   *     failureRedirect: "/login",
   *   });
   *   // do something with the user
   *   return json(privateData);
   * }
   * @example
   * async function loader({ request }: LoaderFunctionArgs) {
   *   // if the user is authenticated, redirect to /dashboard
   *   await authenticator.isAuthenticated(request, {
   *     successRedirect: "/dashboard"
   *   });
   *   return json(publicData);
   * }
   * @example
   * async function loader({ request }: LoaderFunctionArgs) {
   *   // manually handle what happens if the user is or not authenticated
   *   let user = await authenticator.isAuthenticated(request);
   *   if (!user) return json(publicData);
   *   return sessionLoader(request);
   * }
   */
  async isAuthenticated(
    request: Request | Session,
    options?: {
      successRedirect?: never;
      failureRedirect?: never;
      headers?: never;
    }
  ): Promise<User | null>;
  async isAuthenticated(
    request: Request | Session,
    options: {
      successRedirect: string;
      failureRedirect?: never;
      headers?: HeadersInit;
    }
  ): Promise<null>;
  async isAuthenticated(
    request: Request | Session,
    options: {
      successRedirect?: never;
      failureRedirect: string;
      headers?: HeadersInit;
    }
  ): Promise<User>;
  async isAuthenticated(
    request: Request | Session,
    options: {
      successRedirect: string;
      failureRedirect: string;
      headers?: HeadersInit;
    }
  ): Promise<null>;
  async isAuthenticated(
    request: Request | Session,
    options:
      | { successRedirect?: never; failureRedirect?: never; headers?: never }
      | {
          successRedirect: string;
          failureRedirect?: never;
          headers?: HeadersInit;
        }
      | {
          successRedirect?: never;
          failureRedirect: string;
          headers?: HeadersInit;
        }
      | {
          successRedirect: string;
          failureRedirect: string;
          headers?: HeadersInit;
        } = {}
  ): Promise<User | null> {
    let session = isSession(request)
      ? request
      : await this.sessionStorage.getSession(request.headers.get("Cookie"));

    let user: User | null = session.get(this.sessionKey) ?? null;

    if (user) {
      if (options.successRedirect) {
        throw redirect(options.successRedirect, { headers: options.headers });
      } else return user;
    }

    if (options.failureRedirect) {
      throw redirect(options.failureRedirect, { headers: options.headers });
    } else return null;
  }

  /**
   * Destroy the user session throw a redirect to another URL.
   * @example
   * async function action({ request }: ActionFunctionArgs) {
   *   await authenticator.logout(request, { redirectTo: "/login" });
   * }
   */
  async logout(
    request: Request | Session,
    options: { redirectTo: string; headers?: HeadersInit }
  ): Promise<never> {
    let session = isSession(request)
      ? request
      : await this.sessionStorage.getSession(request.headers.get("Cookie"));

    let headers = new Headers(options.headers);
    headers.append(
      "Set-Cookie",
      await this.sessionStorage.destroySession(session)
    );

    throw redirect(options.redirectTo, { headers });
  }
}
