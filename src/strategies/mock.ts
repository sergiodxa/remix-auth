import { Response } from "@remix-run/node";
import { Strategy } from "../authenticator";

export class MockStrategy<User> implements Strategy<User> {
  name = "mock";

  constructor(private response: Response) {}

  authenticate() {
    return Promise.resolve(this.response.clone());
  }
}
