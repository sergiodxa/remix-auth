import { SessionStorage } from "remix";
import { Strategy, StrategyOptions } from "../authenticator";

export interface CustomStrategyVerifyCallback<User> {
  (
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions
  ): Promise<User>;
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
export class CustomStrategy<User> implements Strategy<User> {
  name = "custom";

  private verify: CustomStrategyVerifyCallback<User>;

  constructor(verify: CustomStrategyVerifyCallback<User>) {
    this.verify = verify;
  }

  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions
  ): Promise<User> {
    return this.verify(request, sessionStorage, options);
  }
}
