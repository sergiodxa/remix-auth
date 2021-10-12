import { AuthorizationError } from "remix-auth";

export interface User {
  email: string;
}

export async function login(email: string, password: string): Promise<User> {
  if (password === "abc123") return { email };
  throw new AuthorizationError();
}
