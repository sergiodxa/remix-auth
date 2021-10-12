import { Authenticator, LocalStrategy } from "remix-auth";
import { login, User } from "~/models/user";
import { sessionStorage } from "~/session";

export let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new LocalStrategy({ loginURL: "/login", usernameField: "email" }, login)
);
