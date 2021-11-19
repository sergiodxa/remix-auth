import { v4 as uuid } from "uuid";

export function randomString(): string {
  return uuid();
}
