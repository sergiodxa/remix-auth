/**
 * Creates a Response that redirects the client to a specified URL.
 *
 * @param url The target URL to where the client will be redirected
 * @param init A ResponseInit or a status code to set in the client (default is 302)
 * @returns A Response object with a 302 status and a Location header set to the specified URL
 */
export function redirect(url: string, init: ResponseInit | number = 302) {
	let responseInit = init;

	if (typeof responseInit === "number") {
		responseInit = { status: responseInit };
	} else if (typeof responseInit.status === "undefined") {
		responseInit.status = 302;
	}

	let headers = new Headers(responseInit.headers);
	headers.set("Location", url);

	return new Response(null, { ...responseInit, headers });
}
