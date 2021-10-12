import { Authenticator, AuthorizationError, LocalStrategy } from "remix-auth";
import { sessionStorage } from "./session";

type User = {
  email: string;
};

export let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new LocalStrategy(
    { loginURL: "/login", usernameField: "email" },
    async (email, password) => {
      if (password === "abc123") return { email };
      throw new AuthorizationError();
    }
  )
);
