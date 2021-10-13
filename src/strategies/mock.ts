import { Strategy } from "../authenticator";

export interface MockStrategyVerifyCallback<User> {
  (): Promise<User>;
}

export class MockStrategy<User> implements Strategy<User> {
  name = "mock";

  constructor(private verify: MockStrategyVerifyCallback<User>) {}

  authenticate() {
    return this.verify();
  }
}
