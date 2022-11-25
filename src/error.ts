export class AuthorizationError extends Error {
  constructor(message?: string, public cause?: Error) {
    super(message);
  }
}
