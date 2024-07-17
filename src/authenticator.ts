import { isSession, Session, SessionStorage } from "@remix-run/server-runtime";
import { AuthenticateOptions, Strategy } from "./strategy";

export interface AuthenticateCallback<User> {
  (user: User): Promise<Response>;
}

/**
 * Extra options for the authenticator.
 */
export interface PublicAuthenticatorOptions<TUser, TFlash, TContext> {
  sessionStorage: SessionStorage<TUser, TFlash>;
  sessionKey?: AuthenticateOptions<TContext>["sessionKey"];
  sessionErrorKey?: AuthenticateOptions<TContext>["sessionErrorKey"];
  sessionStrategyKey?: AuthenticateOptions<TContext>["sessionStrategyKey"];
  throwOnError?: AuthenticateOptions<TContext>["throwOnError"];
}

export interface AuthenticatorImplOptions {
  redirect: (
    url: string,
    options?: { headers?: HeadersInit }
  ) => Response | Promise<Response>;
  json: <T>(data: T, status?: number) => Response;
}

export type AuthenticatorOptions<TUser, TFlash, TContext> =
  PublicAuthenticatorOptions<TUser, TFlash, TContext> &
    AuthenticatorImplOptions;

export type AuthenticatorOptionsRequired<TUser, TFlash, TContext> = Required<
  AuthenticatorOptions<TUser, TFlash, TContext> & AuthenticatorImplOptions
>;

export class Authenticator<
  TUser = unknown,
  TFlash = TUser,
  TContext = unknown
> {
  /**
   * A map of the configured strategies, the key is the name of the strategy
   * @private
   */
  private strategies = new Map<string, Strategy<TUser, never, TContext>>();

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
  constructor(options: AuthenticatorOptions<TUser, TFlash, TContext>) {
    this.options = {
      ...options,
      sessionKey: options.sessionKey || "user",
      sessionErrorKey: options.sessionErrorKey || "auth:error",
      sessionStrategyKey: options.sessionStrategyKey || "strategy",
      throwOnError: options.throwOnError ?? false,
    };
  }

  options: AuthenticatorOptionsRequired<TUser, TFlash, TContext>;

  /**
   * Call this method with the Strategy, the optional name allows you to setup
   * the same strategy multiple times with different names.
   * It returns the Authenticator instance for concatenation.
   * @example
   * authenticator
   *  .use(new SomeStrategy({}, (user) => Promise.resolve(user)))
   *  .use(new SomeStrategy({}, (user) => Promise.resolve(user)), "another");
   */
  use(strategy: Strategy<TUser, never, TContext>, name?: string) {
    this.strategies.set(name ?? strategy.name, strategy);
    return this;
  }

  /**
   * Call this method with the name of the strategy you want to remove.
   * It returns the Authenticator instance for concatenation.
   * @example
   * authenticator.unuse("another").unuse("some");
   */
  unuse(name: string) {
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
      AuthenticateOptions<TContext>,
      "failureRedirect" | "throwOnError" | "context"
    > & {
      successRedirect: AuthenticateOptions<TContext>["successRedirect"];
    }
  ): Promise<never>;
  authenticate(
    strategy: string,
    request: Request,
    options: Pick<
      AuthenticateOptions<TContext>,
      "successRedirect" | "throwOnError" | "context"
    > & {
      failureRedirect: AuthenticateOptions<TContext>["failureRedirect"];
    }
  ): Promise<TUser>;
  authenticate(
    strategy: string,
    request: Request,
    options?: Pick<
      AuthenticateOptions<TContext>,
      "successRedirect" | "failureRedirect" | "throwOnError" | "context"
    >
  ): Promise<TUser>;
  authenticate(
    strategy: string,
    request: Request,
    options: Pick<
      AuthenticateOptions<TContext>,
      "successRedirect" | "failureRedirect" | "throwOnError" | "context"
    > = {}
  ): Promise<TUser> {
    const strategyObj = this.strategies.get(strategy);
    if (!strategyObj) throw new Error(`Strategy ${strategy} not found.`);
    return strategyObj.authenticate(
      new Request(request.url, request),
      this.options.sessionStorage,
      {
        throwOnError: this.options.throwOnError,
        ...options,
        name: strategy,
        sessionKey: this.options.sessionKey,
        sessionErrorKey: this.options.sessionErrorKey,
        sessionStrategyKey: this.options.sessionStrategyKey,
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
  ): Promise<TUser | null>;
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
  ): Promise<TUser>;
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
  ): Promise<TUser | null> {
    let session = isSession(request)
      ? request
      : await this.options.sessionStorage.getSession(
          request.headers.get("Cookie")
        );

    let user: TUser | null = session.get(this.options.sessionKey) ?? null;

    if (user) {
      if (options.successRedirect) {
        throw this.options.redirect(options.successRedirect, {
          headers: options.headers,
        });
      } else return user;
    }

    if (options.failureRedirect) {
      throw this.options.redirect(options.failureRedirect, {
        headers: options.headers,
      });
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
    request: Request | Session<TUser, TFlash>,
    options: { redirectTo: string; headers?: HeadersInit }
  ): Promise<never> {
    let session = isSession(request)
      ? request
      : await this.options.sessionStorage.getSession(
          request.headers.get("Cookie")
        );

    let headers = new Headers(options.headers);

    headers.append(
      "Set-Cookie",
      await this.options.sessionStorage.destroySession(session)
    );

    throw this.options.redirect(options.redirectTo, { headers });
  }
}
