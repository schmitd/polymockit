import { Context, Effect, Layer } from "effect";

const TOKEN_KEY = "polymockit.session.token";
const USERNAME_KEY = "polymockit.session.username";

export interface SessionStoreApi {
  getToken: Effect.Effect<string | null>;
  setToken: (token: string) => Effect.Effect<void>;
  clearToken: Effect.Effect<void>;
  getLastUsername: Effect.Effect<string | null>;
  setLastUsername: (username: string) => Effect.Effect<void>;
}

export class SessionStore extends Context.Tag("SessionStore")<SessionStore, SessionStoreApi>() {}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export const makeBrowserSessionStoreLayer = (storage: StorageLike) =>
  Layer.succeed(SessionStore, {
    getToken: Effect.sync(() => storage.getItem(TOKEN_KEY)),
    setToken: (token: string) => Effect.sync(() => storage.setItem(TOKEN_KEY, token)),
    clearToken: Effect.sync(() => storage.removeItem(TOKEN_KEY)),
    getLastUsername: Effect.sync(() => storage.getItem(USERNAME_KEY)),
    setLastUsername: (username: string) => Effect.sync(() => storage.setItem(USERNAME_KEY, username)),
  });
