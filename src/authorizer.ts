import { LoaderFunction, redirect } from "@remix-run/server-runtime";
import { forbidden, unauthorized } from "remix-utils";
import { Authenticator } from "./authenticator";

type LoaderArgs = Parameters<LoaderFunction>[0];

export interface RuleContext<User, Data = unknown> extends LoaderArgs {
  user: User;
  data?: Data;
}

export interface Rule<User, Data = unknown> {
  (context: RuleContext<User, Data>): Promise<boolean>;
}

export class Authorizer<User = unknown, Data = unknown> {
  constructor(
    private authenticator: Authenticator<User>,
    private rules: Rule<User, Data>[] = []
  ) {}

  async authorize(
    args: Omit<RuleContext<User, Data>, "user">,
    options: { failureRedirect?: string; rules?: Rule<User, Data>[] } = {}
  ): Promise<User> {
    let user = await this.authenticator.isAuthenticated(args.request);

    if (!user) {
      if (options.failureRedirect) throw redirect(options.failureRedirect);
      throw unauthorized({ message: "Not authenticated." });
    }

    for (let rule of [...this.rules, ...(options.rules ?? [])]) {
      if (await rule({ user, ...args })) continue;
      if (options.failureRedirect) throw redirect(options.failureRedirect);
      if (!rule.name) throw forbidden({ message: "Forbidden" });
      throw forbidden({ message: `Forbidden by policy ${rule.name}` });
    }

    return user;
  }
}
