# MockStrategy

This strategy is intended to be used for testing purposes only.

This strategy receives a Response object and it will resolve all authentication requests using a clone of that Response.

## Create a new instance of MockStrategy

```ts
import { MockStrategy } from "remix-auth";
import { Response } from "remix";

let strategy = new MockStrategy(new Response("")));
```

## Use the strategy

```ts
authenticator.use(strategy);
```

## Example in a Test

If you want to test a loader or action that uses an authenticator, you can replace it with the MockStrategy.

```ts
import { redirect } from "remix";
import { authenticator } from "./auth.server";
import { MockStrategy } from "remix-auth";
import { loader } from "./routes/dashboard";

describe("Dashboard", () => {
  describe("Loader", () => {
    test("should redirect to ", async () => {
      authenticator
        .unuse("auth0") // remove the strategy you are using
        .use(new MockStrategy(redirect("/")));
      // test your loader here which will redirect to /
    });
  });
});
```
