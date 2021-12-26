import { Strategy } from "../strategy";

export interface MockStrategyVerifyCallback<User> {
  (): Promise<User>;
}

export class MockStrategy<User> extends Strategy<User, Record<string, never>> {
  name = "mock";

  authenticate() {
    return this.verify({});
  }
}
