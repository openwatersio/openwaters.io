import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  NAME_KEY,
  TOKEN_KEY,
  onTokenChange,
  readToken,
  stationHref,
  stationLabel,
} from "./aiscast-token.ts";

const saved = new Map<string, string>();
const listeners = new Map<string, (event?: { key: string }) => void>();
const original = new Map<string, PropertyDescriptor | undefined>();
const issued = {
  token: "test-token",
  claims: { sub: "ed25519:test/key", exp: 0 },
};

beforeEach(() => {
  saved.clear();
  listeners.clear();
  for (const name of ["localStorage", "addEventListener", "document"])
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => saved.get(key) ?? null },
  });
  Object.defineProperty(globalThis, "addEventListener", {
    configurable: true,
    value: (type: string, listener: (event?: { key: string }) => void) =>
      listeners.set(type, listener),
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { hidden: false },
  });
});
afterEach(() => {
  for (const [name, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test("missing, malformed, expired, and unavailable stored tokens leave commands unfilled", () => {
  for (const value of [
    null,
    "bad JSON",
    "null",
    "{}",
    JSON.stringify({ token: "", claims: issued.claims }),
    JSON.stringify({ token: "test", claims: { sub: 2 } }),
    JSON.stringify({ ...issued, claims: { ...issued.claims, exp: 1 } }),
  ]) {
    if (value === null) saved.delete(TOKEN_KEY);
    else saved.set(TOKEN_KEY, value);
    assert.equal(readToken(), null);
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw Error("storage unavailable");
    },
  });
  assert.equal(readToken(), null);
});

test("a saved token supplies its optional name and station link without changing the station ID", () => {
  saved.set(TOKEN_KEY, JSON.stringify(issued));
  assert.equal(stationLabel(readToken()!), issued.claims.sub);
  saved.set(NAME_KEY, "Harbor receiver");
  const current = readToken()!;
  assert.equal(current.token, issued.token);
  assert.equal(stationLabel(current), "Harbor receiver");
  assert.equal(
    stationHref(current.claims),
    "/ais/stations/station:ed25519:test/key",
  );
});

test("commands refresh when a token changes in another tab or the reader returns", () => {
  const tokens: (string | null)[] = [];
  onTokenChange((value) => tokens.push(value?.token ?? null));
  saved.set(TOKEN_KEY, JSON.stringify(issued));
  listeners.get("storage")!({ key: "unrelated" });
  assert.deepEqual(tokens, [null]);
  listeners.get("storage")!({ key: TOKEN_KEY });
  assert.deepEqual(tokens, [null, issued.token]);
  saved.delete(TOKEN_KEY);
  listeners.get("visibilitychange")!();
  assert.deepEqual(tokens, [null, issued.token, null]);
});
