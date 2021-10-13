import { Strategy } from "../authenticator";

export interface BasicStrategyVerifyCallback<User> {
  (): Promise<User>;
}

export class MockStrategy<User> implements Strategy<User> {
  name = "mock";

  constructor(private verify: BasicStrategyVerifyCallback<User>) {}

  authenticate() {
    return this.verify();
  }
}
