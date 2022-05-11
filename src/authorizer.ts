import { LoaderFunction, redirect, json } from "@remix-run/server-runtime";
import { Authenticator } from "./authenticator";

type LoaderArgs = Parameters<LoaderFunction>[0];

type AuthorizeArgs<User, Data> = Omit<RuleContext<User, Data>, "user">;

export interface RuleContext<User, Data = unknown> extends LoaderArgs {
  /**
   * The authenticated user returned by the Authenticator
   */
  user: User;
  /**
   * Extra data passed to the Authorizer from the loader or action
   */
  data?: Data;
}

/**
 * A Rule is a function that receives the same arguments of a Loader or Action
 * and the authenticated user (as configured in the Authenticator), and maybe
 * an extra data value.
 *
 * Inside a Rule function you can do any validation to verify a user to continue
 * and return a promise resolving to a boolean value.
 */
export interface RuleFunction<User, Data = unknown> {
  (context: RuleContext<User, Data>): Promise<boolean>;
}

export class Authorizer<User = unknown, Data = unknown> {
  constructor(
    private authenticator: Authenticator<User>,
    private rules: RuleFunction<User, Data>[] = []
  ) {}

  async authorize(
    args: AuthorizeArgs<User, Data>,
    options?: {
      failureRedirect?: never;
      raise?: "error";
      rules?: RuleFunction<User, Data>[];
    }
  ): Promise<User>;
  async authorize(
    args: AuthorizeArgs<User, Data>,
    options?: {
      failureRedirect?: never;
      raise?: "response";
      rules?: RuleFunction<User, Data>[];
    }
  ): Promise<User>;
  async authorize(
    args: AuthorizeArgs<User, Data>,
    options: {
      failureRedirect: string;
      raise: "redirect";
      rules?: RuleFunction<User, Data>[];
    }
  ): Promise<User>;
  async authorize(
    args: AuthorizeArgs<User, Data>,
    {
      failureRedirect,
      raise = "response",
      rules = [],
    }: {
      failureRedirect?: string;
      raise?: "error" | "response" | "redirect";
      rules?: RuleFunction<User, Data>[];
    } = {}
  ): Promise<User> {
    let user = await this.authenticator.isAuthenticated(args.request);

    if (!user) {
      if (raise === "response") {
        throw json({ message: "Not authenticated." }, { status: 401 });
      }
      if (raise === "redirect") {
        // @ts-expect-error failureRedirect is a string if raise is redirect
        throw redirect(failureRedirect);
      }
      throw new Error("Not authenticated.");
    }

    for (let rule of [...this.rules, ...rules]) {
      if (await rule({ user, ...args })) continue;
      // @ts-expect-error failureRedirect is a string if raise is redirect
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
