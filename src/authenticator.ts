import { Request, Response, SessionStorage } from "@remix-run/node";

export interface AuthenticateCallback<User> {
  (user: User): Promise<Response>;
}

/**
 * Extra options for the authenticator.
 */
export interface AuthenticatorOptions {
  sessionKey?: string;
}

/**
 * Extra information from the Authenticator to the strategy
 */
export interface StrategyOptions {
  sessionKey: string;
}

export interface Strategy<User> {
  /**
   * The name of the strategy.
   * This will be used by the Authenticator to identify and retrieve the
   * strategy.
   */
  name: string;

  /**
   * The authentication flow of the strategy.
   *
   * This method receives the Request to authenticator and the session storage
   * to use from the Authenticator. It may receive a custom callback.
   *
   * At the end of the flow, it will return a Response be use used by the
   * application. This response could be a redirect or a custom one returned by
   * the optional callback.
   */
  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions,
    callback?: AuthenticateCallback<User>
  ): Promise<Response>;
}

export class AuthorizationError extends Error {}

export class Authenticator<User = unknown> {
  /**
   * A map of the configured strategies, the key is the name of the strategy
   * @private
   */
  private strategies = new Map<string, Strategy<User>>();

  public readonly sessionKey: string;

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
   * - `sessionKey`: The key used to store and red the user in the session storage.
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
  use(strategy: Strategy<User>, name?: string): Authenticator {
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
   * The optional callback allows you to do something with the user object
   * before returning a new Response. In case it's not provided the strategy
   * will return a new Response and set the user to the session.
   * @example
   * let action: ActionFunction = ({ request }) => {
   *   return authenticator.authenticate("some", request);
   * };
   * @example
   * let action: ActionFunction = ({ request }) => {
   *   return authenticator.authenticate("some", request, async user => {
   *     let session = await getSession(request.headers.get("Cookie"));
   *     session.set(authenticator.key, user);
   *     return redirect("/private", {
   *       "Set-Cookie": await commitSession(session),
   *     });
   *   });
   * };
   */
  authenticate(
    strategy: string,
    request: Request,
    callback?: AuthenticateCallback<User>
  ): Promise<Response> {
    const strategyObj = this.strategies.get(strategy);
    if (!strategyObj) throw new Error(`Strategy ${strategy} not found.`);
    let options: StrategyOptions = {
      sessionKey: this.sessionKey,
    };
    if (!callback) {
      return strategyObj.authenticate(
        request.clone(),
        this.sessionStorage,
        options
      );
    }
    return strategyObj.authenticate(
      request.clone(),
      this.sessionStorage,
      options,
      callback
    );
  }

  /**
   * Call this to check if the user is authenticated. It will return a Promise
   * with the user object or null, you can use this to check if the user is
   * logged-in or not withour triggering the whole authentication flow.
   * @example
   * let loader: LoaderFunction = async ({ request }) => {
   *   let user = await authenticator.isAuthenticated(request);
   *   if (!user) return redirect("/login");
   *   // do something with the user
   *   return json(data);
   * }
   */
  async isAuthenticated(request: Request): Promise<User | null> {
    let session = await this.sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    let user: User | null = session.get(this.sessionKey);

    if (user) return user;
    return null;
  }
}
