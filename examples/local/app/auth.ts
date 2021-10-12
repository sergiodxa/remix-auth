import { Authenticator, LocalStrategy } from "remix-auth";
import { sessionStorage } from "~/session";
import { login, User } from "./models/user";

export let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new LocalStrategy({ loginURL: "/login", usernameField: "email" }, login)
);
