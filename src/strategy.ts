import {
  AppLoadContext,
  json,
  redirect,
  SessionStorage,
} from "@remix-run/server-runtime";
import { AuthorizationError } from "./error";

/**
 * Extra information from the Authenticator to the strategy
 */
export interface AuthenticateOptions {
  /**
   * The key of the session used to set the user data.
   */
  sessionKey: string;
  /**
   * In what key of the session the errors will be set.
   * @default "auth:error"
   */
  sessionErrorKey: string;
  /**
   * The key of the session used to set the strategy used to authenticate the
   * user.
   */
  sessionStrategyKey: string;
  /**
   * The name used to register the strategy
   */
  name: string;
  /**
   * To what URL redirect in case of a successful authentication.
   * If not defined, it will return the user data.
   */
  successRedirect?: string;
  /**
   * To what URL redirect in case of a failed authentication.
   * If not defined, it will return null
   */
  failureRedirect?: string;
  /**
   * Set if the strategy should throw an error instead of a Reponse in case of
   * a failed authentication.
   * @default false
   */
  throwOnError?: boolean;
  /**
   * The context object received by the loader or action.
   * This can be used by the strategy if needed.
   */
  context?: AppLoadContext;
}

/**
 * A function which will be called to find the user using the information the
 * strategy got from the request.
 *
 * @param params The params from the strategy.
 * @returns The user data.
 * @throws {AuthorizationError} If the user was not found. Any other error will be ignored and thrown again by the strategy.
 */
export interface StrategyVerifyCallback<User, VerifyParams> {
  (params: VerifyParams): Promise<User>;
}

/**
 * The Strategy class is the base class every strategy should extend.
 *
 * This class receives two generics, a User and a VerifyParams.
 * - User is the type of the user data.
 * - VerifyParams is the type of the params the verify callback will receive from the strategy.
 *
 * This class also defines as protected two methods, `success` and `failure`.
 * - `success` is called when the authentication was successful.
 * - `failure` is called when the authentication failed.
 * These methods helps you return or throw the correct value, response or error
 * from within the strategy `authenticate` method.
 */
export abstract class Strategy<User, VerifyOptions> {
  /**
   * The name of the strategy.
   * This will be used by the Authenticator to identify and retrieve the
   * strategy.
   */
  public abstract name: string;

  public constructor(
    protected verify: StrategyVerifyCallback<User, VerifyOptions>
  ) {}

  /**
   * The authentication flow of the strategy.
   *
   * This method receives the Request to authenticator and the session storage
   * to use from the Authenticator. It may receive a custom callback.
   *
   * At the end of the flow, it will return a Response to be used by the
   * application.
   */
  public abstract authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User>;

  /**
   * Throw an AuthorizationError or a redirect to the failureRedirect.
   * @param message The error message to set in the session.
   * @param request The request to get the cookie out of.
   * @param sessionStorage The session storage to retrieve the session from.
   * @param options The strategy options.
   * @throws {AuthorizationError} If the throwOnError is set to true.
   * @throws {Response} If the failureRedirect is set or throwOnError is false.
   * @returns {Promise<never>}
   */
  protected async failure(
    message: string,
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions,
    cause?: Error
  ): Promise<never> {
    // if a failureRedirect is not set, we throw a 401 Response or an error
    if (!options.failureRedirect) {
      if (options.throwOnError) throw new AuthorizationError(message, cause);
      throw json<{ message: string }>({ message }, 401);
    }

    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // if we do have a failureRedirect, we redirect to it and set the error
    // in the session errorKey
    session.flash(options.sessionErrorKey, { message });
    throw redirect(options.failureRedirect, {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  }

  /**
   * Returns the user data or throw a redirect to the successRedirect.
   * @param user The user data to set in the session.
   * @param request The request to get the cookie out of.
   * @param sessionStorage The session storage to retrieve the session from.
   * @param options The strategy options.
   * @returns {Promise<User>} The user data.
   * @throws {Response} If the successRedirect is set, it will redirect to it.
   */
  protected async success(
    user: User,
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User> {
    // if a successRedirect is not set, we return the user
    if (!options.successRedirect) return user;

    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // if we do have a successRedirect, we redirect to it and set the user
    // in the session sessionKey
    session.set(options.sessionKey, user);
    session.set(options.sessionStrategyKey, options.name ?? this.name);
    throw redirect(options.successRedirect, {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  }
}
