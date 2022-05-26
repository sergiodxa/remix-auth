export type AuthorizationErrorErrors = string[];

export class AuthorizationError extends Error {
  constructor(message: string, errors?: AuthorizationErrorErrors) {
    super(message);
    this.errors = errors;
  }

  errors: AuthorizationErrorErrors | undefined;
}
