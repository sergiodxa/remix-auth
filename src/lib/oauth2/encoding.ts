/**
 * Base64 helpers for OAuth 2.0 (PKCE, state, Basic auth).
 *
 * Adapted from Arctic by pilcrowOnPaper (MIT) and Antarctic's Web Crypto–friendly
 * encoding approach — no @oslojs dependency.
 */

const BASE64URL_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function encodeBinaryString(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return binary;
}

export function encodeBase64(bytes: Uint8Array): string {
	return btoa(encodeBinaryString(bytes));
}

export function encodeBase64urlNoPadding(bytes: Uint8Array): string {
	let result = "";
	for (let i = 0; i < bytes.length; i += 3) {
		let buffer = 0;
		let bits = 0;
		for (let j = 0; j < 3 && i + j < bytes.length; j++) {
			buffer = (buffer << 8) | bytes[i + j]!;
			bits += 8;
		}
		for (let j = 0; j < 4 && bits > 0; j++) {
			bits -= 6;
			let index =
				bits >= 0 ? (buffer >> bits) & 0x3f : (buffer << -bits) & 0x3f;
			result += BASE64URL_ALPHABET[index]!;
		}
	}
	return result;
}
