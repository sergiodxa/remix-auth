import { redirect, json } from "@remix-run/server-runtime";
import { Authenticator, PublicAuthenticatorOptions } from "./authenticator";

export class RemixAuthenticator<TUser, TFlash, TContext> extends Authenticator<
  TUser,
  TFlash,
  TContext
> {
  constructor(options: PublicAuthenticatorOptions<TUser, TFlash, TContext>) {
    super({
      ...options,
      json,
      redirect,
    });
  }
}
