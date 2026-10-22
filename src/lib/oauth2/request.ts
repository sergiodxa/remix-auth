/**
 * OAuth 2.0 token endpoint request helpers.
 *
 * Adapted from Arctic by pilcrowOnPaper (MIT).
 */

import { encodeBase64 } from "./encoding.js";
import { OAuth2Tokens } from "./tokens.js";

export function createOAuth2Request(
	endpoint: string,
	body: URLSearchParams,
): Request {
	let bodyBytes = new TextEncoder().encode(body.toString());
	let request = new Request(endpoint, {
		method: "POST",
		body: bodyBytes,
	});
	request.headers.set("Content-Type", "application/x-www-form-urlencoded");
	request.headers.set("Accept", "application/json");
	// Required by GitHub, and probably by others as well
	request.headers.set("User-Agent", "remix-auth");
	// Required by Reddit
	request.headers.set("Content-Length", bodyBytes.byteLength.toString());
	return request;
}

/**
 * Encode client credentials for HTTP Basic authentication.
 *
 * Per RFC 6749 §2.3.1, the client ID and secret are each
 * `application/x-www-form-urlencoded` encoded before they are joined with `:`
 * and Base64-encoded. Without that step, reserved characters like `:` or `+`
 * in either value are misparsed by conforming authorization servers.
 */
export function encodeBasicCredentials(
	username: string,
	password: string,
): string {
	let encoded = `${formUrlEncode(username)}:${formUrlEncode(password)}`;
	let bytes = new TextEncoder().encode(encoded);
	return encodeBase64(bytes);
}

function formUrlEncode(value: string): string {
	return encodeURIComponent(value).replaceAll("%20", "+");
}

export async function sendTokenRequest(
	request: Request,
): Promise<OAuth2Tokens> {
	let response: Response;
	try {
		response = await fetch(request);
	} catch (e) {
		throw new OAuth2FetchError(e);
	}

	if (response.status === 400 || response.status === 401) {
		let data: unknown;
		try {
			data = await response.json();
		} catch {
			throw new UnexpectedResponseError(response.status);
		}
		if (typeof data !== "object" || data === null) {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		let error: OAuth2RequestError;
		try {
			error = createOAuth2RequestError(data);
		} catch {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		throw error;
	}

	if (response.status === 200) {
		let data: unknown;
		try {
			data = await response.json();
		} catch {
			throw new UnexpectedResponseError(response.status);
		}
		if (typeof data !== "object" || data === null) {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		return new OAuth2Tokens(data);
	}

	if (response.body !== null) {
		await response.body.cancel();
	}
	throw new UnexpectedResponseError(response.status);
}

export async function sendTokenRevocationRequest(
	request: Request,
): Promise<void> {
	let response: Response;
	try {
		response = await fetch(request);
	} catch (e) {
		throw new OAuth2FetchError(e);
	}

	if (response.status === 400 || response.status === 401) {
		let data: unknown;
		try {
			data = await response.json();
		} catch {
			throw new UnexpectedErrorResponseBodyError(response.status, null);
		}
		if (typeof data !== "object" || data === null) {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		let error: OAuth2RequestError;
		try {
			error = createOAuth2RequestError(data);
		} catch {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		throw error;
	}

	if (response.status === 200) {
		if (response.body !== null) {
			await response.body.cancel();
		}
		return;
	}

	if (response.body !== null) {
		await response.body.cancel();
	}
	throw new UnexpectedResponseError(response.status);
}

export function createOAuth2RequestError(result: object): OAuth2RequestError {
	let code: string;
	if ("error" in result && typeof result.error === "string") {
		code = result.error;
	} else {
		throw new Error("Invalid error response");
	}

	let description: string | null = null;
	let uri: string | null = null;
	let state: string | null = null;

	if ("error_description" in result) {
		if (typeof result.error_description !== "string") {
			throw new Error("Invalid data");
		}
		description = result.error_description;
	}
	if ("error_uri" in result) {
		if (typeof result.error_uri !== "string") {
			throw new Error("Invalid data");
		}
		uri = result.error_uri;
	}
	if ("state" in result) {
		if (typeof result.state !== "string") {
			throw new Error("Invalid data");
		}
		state = result.state;
	}

	return new OAuth2RequestError(code, description, uri, state);
}

export class OAuth2FetchError extends Error {
	constructor(cause: unknown) {
		super("Failed to send request", { cause });
	}
}

export class OAuth2RequestError extends Error {
	code: string;
	description: string | null;
	uri: string | null;
	state: string | null;

	constructor(
		code: string,
		description: string | null,
		uri: string | null,
		state: string | null,
	) {
		super(`OAuth request error: ${code}`);
		this.code = code;
		this.description = description;
		this.uri = uri;
		this.state = state;
	}
}

export class UnexpectedResponseError extends Error {
	status: number;

	constructor(responseStatus: number) {
		super("Unexpected error response");
		this.status = responseStatus;
	}
}

export class UnexpectedErrorResponseBodyError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, data: unknown) {
		super("Unexpected error response body");
		this.status = status;
		this.data = data;
	}
}
