import { json } from "remix";
import { Strategy } from "../authenticator";

export interface BasicStrategyOptions {
  realm?: string;
}

export interface BasicStrategyVerifyCallback<User> {
  (userId: string, password: string): Promise<User>;
}

/**
 * The HTTP Basic authentication strategy authenticates requests based on
 * userId and password credentials contained in the `Authorization` header
 * field.
 *
 * Applications must supply a `verify` callback which accepts `userId` and
 * `password` credentials, and then return supplying a `user`, which should
 * raise an error if the credentials are not valid or an exception ocurred.
 *
 * Optionally, `options` can be used to change the authentication realm.
 *
 * Options:
 * - `realm`  authentication realm, defaults to "Users"
 *
 * @example
 * authenticator.use(new BasicStrategy(
 *   { realm: "Users" },
 *   (userId, password) => {
 *     return User.findOne({ username: userId, password: password });
 *   }
 * ));
 *
 * For further details on HTTP Basic authentication, refer to [RFC 2617: HTTP Authentication: Basic and Digest Access Authentication](http://tools.ietf.org/html/rfc2617)
 */
export class BasicStrategy<User> implements Strategy<User> {
  name = "basic";

  private realm = "Users";
  private verify: BasicStrategyVerifyCallback<User>;

  constructor(
    options: BasicStrategyOptions,
    verify: BasicStrategyVerifyCallback<User>
  );
  constructor(verify: BasicStrategyVerifyCallback<User>);
  constructor(
    options: BasicStrategyOptions | BasicStrategyVerifyCallback<User>,
    verify?: BasicStrategyVerifyCallback<User>
  ) {
    if (typeof options === "function") {
      this.verify = options;
    } else if (verify) {
      this.realm = options.realm || this.realm;
      this.verify = verify;
    } else {
      throw new TypeError(
        "The verify callback on BasicStrategy must be a function."
      );
    }
  }

  async authenticate(request: Request): Promise<User> {
    let authorization = request.headers.get("Authorization");
    if (!authorization) {
      throw json(
        { message: "Missing Authorization header." },
        { status: 401, headers: this.headers() }
      );
    }

    if (!authorization.includes(" ")) {
      throw json(
        { message: "Invalid Authorization value." },
        { status: 401, headers: this.headers() }
      );
    }

    let [scheme, credentials] = authorization.split(" ");

    if (!/basic/i.test(scheme)) {
      throw json(
        { message: "Invalid Authorization scheme." },
        { status: 401, headers: this.headers() }
      );
    }

    let [userId, password] = Buffer.from(credentials, "base64")
      .toString()
      .split(":");

    if (!userId || !password) {
      throw json(
        { message: "Missing user ID or password." },
        { status: 401, headers: this.headers() }
      );
    }

    try {
      return await this.verify(userId, password);
    } catch (error) {
      let message = (error as Error).message;
      throw json({ message }, { status: 401, headers: this.headers() });
    }
  }

  private headers() {
    return {
      "WWW-Authenticate": this.challenge(),
    };
  }

  private challenge() {
    return `Basic realm="${this.realm}"`;
  }
}
