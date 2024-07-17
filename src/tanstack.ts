import { redirect } from "@tanstack/react-router";
import { json } from "@tanstack/start";
import { Authenticator, PublicAuthenticatorOptions } from "./authenticator";

export class TanStackAuthenticator<
  TUser,
  TFlash,
  TContext
> extends Authenticator<TUser, TFlash, TContext> {
  constructor(options: PublicAuthenticatorOptions<TUser, TFlash, TContext>) {
    super({
      ...options,
      json: (data, status) => json(data, { status }),
      redirect: (url, options) =>
        redirect({
          href: url,
          headers: options?.headers,
        }),
    });
  }
}
