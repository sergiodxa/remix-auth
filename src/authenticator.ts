import { Request, Response, SessionStorage } from "@remix-run/node";

export interface AuthenticateCallback<User> {
  (user: User): Promise<Response>;
}

export interface Strategy<User> {
  name: string;

  authenticate(
    request: Request,
    sessionStorage: SessionStorage
  ): Promise<User | null>;
  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback: AuthenticateCallback<User>
  ): Promise<Response>;
  authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    callback?: AuthenticateCallback<User>
  ): Promise<Response | User | null>;
}

export class Authenticator<User = unknown> {
  private strategies = new Map<string, Strategy<User>>();

  constructor(private sessionStorage: SessionStorage) {}

  use(strategy: Strategy<User>, name?: string): Authenticator {
    this.strategies.set(name ?? strategy.name, strategy);
    return this;
  }

  unuse(name: string): Authenticator {
    this.strategies.delete(name);
    return this;
  }

  authenticate(strategy: string, request: Request): Promise<User | null>;
  authenticate(
    strategy: string,
    request: Request,
    callback: AuthenticateCallback<User>
  ): Promise<Response>;
  authenticate(
    strategy: string,
    request: Request,
    callback?: AuthenticateCallback<User>
  ): Promise<Response | User | null> {
    const strategyObj = this.strategies.get(strategy);
    if (!strategyObj) throw new Error(`Strategy ${strategy} not found`);
    if (!callback) {
      return strategyObj.authenticate(request.clone(), this.sessionStorage);
    }
    return strategyObj.authenticate(
      request.clone(),
      this.sessionStorage,
      callback
    );
  }

  async isAuthenticated(request: Request): Promise<User | null> {
    let session = await this.sessionStorage.getSession(
      request.clone().headers.get("Cookie")
    );

    let user: User | null = session.get("user");

    if (user) return user;
    return null;
  }
}
