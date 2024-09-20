export class AuthorizationError extends Error {
	constructor(
		message?: string,
		public override cause?: Error,
	) {
		super(message);
	}
}
