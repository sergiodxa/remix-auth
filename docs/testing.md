# Testing

When you're working on a feature, you might want to test it. There are multiple ways of testing in Remix, and while most of the time a Cypress test will be the best way to go, sometimes you might want to test the route in isolation.

If you are using Jest you can import a loader or action from any route file and run it inside your test.

```ts
import { Request } from "remix";
import { loader } from "~/routes/dashboard";

describe("Dashboard", () => {
  test("Loader", () => {
    let request = new Request("/dashboard");
    let response = await loader({ request, context: {}, params: {} });
    expect(response.status).toBe(200);
  });
});
```

If your route is calling `Authenticator#isAuthenticated` you may want to test what happens if the user is logged-in or not.

Since the Authenticator read from a session storage object you created and the session is read from the request cookies you can fake it.

```ts
import { Request } from "remix";
import { sessionStorage } from "~/session.server";
import { authenticator } from "~/authenticator.server";
import { loader } from "~/routes/dashboard";

describe("Dashboard", () => {
  test("Loader - is signed in", () => {
    let session = await sessionStorage.getSession(); // get a new Session object
    session.set(authenticator.sessionKey, fakeUser); // set a fake user in the session
    let request = new Request("/dashboard", {
      // Add a cookie header to the request with the session committed
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });
    // This loader will now believe the user is logged in
    let response = await loader({ request, context: {}, params: {} });
    expect(response.status).toBe(200);
  });

  test("Loader - is not signed in", () => {
    let request = new Request("/dashboard");
    // This loader will now believe the user is not logged in
    let response = await loader({ request, context: {}, params: {} });
    expect(response.status).toBe(200);
  });
});
```

This way you can still use the Remix Auth and test the routes as you would normally.
