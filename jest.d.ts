declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOk(): R;
      toRedirect(path?: string): R;
      toHaveStatus(status: number): R;
      toHaveHeader(header: string, value?: string): R;
      toSetACookie(): R;
    }
  }
}

export {};
