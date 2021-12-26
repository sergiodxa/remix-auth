export interface User {
  email: string;
}

export async function login(email: string): Promise<User> {
  return { email };
}
