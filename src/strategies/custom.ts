import { SessionStorage } from "@remix-run/server-runtime";
import { AuthenticateOptions, Strategy } from "../strategy";

export interface CustomStrategyVerifyCallbackParams {
  request: Request;
  sessionStorage: SessionStorage;
  options: AuthenticateOptions;
}

/**
 * The custom authentication strategy authenticates requests based on a
 * function callback.
 * Applications must supply a `verify` callback which executes custom
 * authentication logic, and then returns a `user`, if the user can't be
 * provided or an exception occurred an error must be thorwn.
 *
 * @example
 * authenticator.use(new CustomStrategy(
 *   (request, sessionStorage) => {
 *     return User.findOne({ username: req.body.username });
 *   }
 * ));
 */
export class CustomStrategy<User> extends Strategy<
  User,
  CustomStrategyVerifyCallbackParams
> {
  name = "custom";

  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User> {
    return this.verify({ request, sessionStorage, options });
  }
}
