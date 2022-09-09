import type { DataFunctionArgs } from "@remix-run/server-runtime";
import { json, redirect } from "@remix-run/server-runtime";
import { Authenticator } from "./authenticator";

/**
 * Extra data passed to the Authorizer from the loader or action
 */
type AuthorizeArgs<Data> = { data?: Data } & Omit<
  DataFunctionArgs,
  "context"
> & {
    context?: DataFunctionArgs["context"];
  };

export type RuleContext<User, Data = null> = {
  /**
   * The authenticated user returned by the Authenticator
   */
  user: User;
} & AuthorizeArgs<Data> & { context: DataFunctionArgs["context"] };

/**
 * A Rule is a function that receives the same arguments of a Loader or Action
 * and the authenticated user (as configured in the Authenticator), and maybe
 * an extra data value.
 *
 * Inside a Rule function you can do any validation to verify a user to continue
 * and return a promise resolving to a boolean value.
 */
export interface RuleFunction<User, Data = null> {
  (context: RuleContext<User, Data>): Promise<boolean>;
}

type AuthorizeOptionsError = {
  failureRedirect?: never;
  raise: "error";
};
type AuthorizeOptionsResponse = {
  failureRedirect?: never;
  raise: "response";
};
type AuthorizeOptionsRedirect = {
  failureRedirect: string;
  raise: "redirect";
};
type AuthorizeOptionsEmpty = {
  failureRedirect?: never;
  raise?: never;
};
type AuthorizeOptions<U, D> = (
  | AuthorizeOptionsError
  | AuthorizeOptionsRedirect
  | AuthorizeOptionsResponse
  | AuthorizeOptionsEmpty
) & { rules?: RuleFunction<U, D>[] };

export class Authorizer<User = unknown, Data = unknown> {
  constructor(
    private authenticator: Authenticator<User>,
    private rules: RuleFunction<User, Data>[] = []
  ) {}

  async authorize<D extends Data>(
    args: AuthorizeArgs<D>,
    { failureRedirect, raise, rules = [] }: AuthorizeOptions<User, D> = {
      raise: "response",
      rules: [],
    }
  ): Promise<User> {
    if (!raise) raise = "response";
    let user = await this.authenticator.isAuthenticated(args.request);

    if (!user) {
      if (raise === "response") {
        throw json({ message: "Not authenticated." }, { status: 401 });
      }
      if (raise === "redirect") {
        throw redirect(failureRedirect);
      }
      throw new Error("Not authenticated.");
    }

    for (let rule of [...this.rules, ...rules]) {
      if (await rule({ user, ...args, context: args.context ?? {} })) continue;
      if (raise === "redirect") throw redirect(failureRedirect);
      if (raise === "response") {
        if (!rule.name) throw json({ message: "Forbidden" }, { status: 403 });
        throw json(
          { message: `Forbidden by policy ${rule.name}` },
          { status: 403 }
        );
      }
      if (!rule.name) throw new Error("Forbidden.");
      throw new Error(`Forbidden by policy ${rule.name}`);
    }

    return user;
  }
}
