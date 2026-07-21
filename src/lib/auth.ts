import { useSyncExternalStore } from "react";

import { shortId } from "./utils";

// ── Login-less accounts (D§5) ────────────────────────────────────────────────
//
// There is no login screen. Access to an account is a *capability link* — an
// unguessable bearer token minted by the server on first mailbox auth. The
// client holds a list of these links (one per account it knows) in
// localStorage; the "active" one drives every API call and every query key.
//
// The server is the real gate: every protected call carries the Bearer link and
// the server validates it. This store only decides what the UI renders and
// which link to send.

export interface StoredAccount {
  /** Client-side id (not the server account id; purely for local bookkeeping). */
  id: string;
  /** User-facing label — the mailbox email, or a nickname. */
  label: string;
  /** The capability link (bearer token). Never put this in a URL. */
  link: string;
  /** When this link was first stored, ISO-8601. */
  addedAt: string;
}

interface AuthState {
  accounts: StoredAccount[];
  activeId: string | null;
}

const ACCOUNTS_KEY = "carillon.accounts";
const ACTIVE_KEY = "carillon.activeAccountId";

function load(): AuthState {
  try {
    const accounts: StoredAccount[] = JSON.parse(
      localStorage.getItem(ACCOUNTS_KEY) ?? "[]",
    );
    const storedActive = localStorage.getItem(ACTIVE_KEY);
    const activeId =
      storedActive && accounts.some((a) => a.id === storedActive)
        ? storedActive
        : (accounts[0]?.id ?? null);
    return { accounts, activeId };
  } catch {
    return { accounts: [], activeId: null };
  }
}

let state: AuthState = load();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
  if (state.activeId) localStorage.setItem(ACTIVE_KEY, state.activeId);
  else localStorage.removeItem(ACTIVE_KEY);
}

function set(next: AuthState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

// Keep tabs in sync: another tab adding/switching an account updates this one.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === ACCOUNTS_KEY || e.key === ACTIVE_KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

// ── Imperative API (safe to call outside React, e.g. from api.ts) ─────────────

export function getState(): AuthState {
  return state;
}

export function getActiveAccount(): StoredAccount | null {
  return state.accounts.find((a) => a.id === state.activeId) ?? null;
}

export function getActiveLink(): string | null {
  return getActiveAccount()?.link ?? null;
}

/** Add (or refresh, by matching link) an account and make it active. */
export function addAccount(input: {
  label: string;
  link: string;
}): StoredAccount {
  const existing = state.accounts.find((a) => a.link === input.link);
  if (existing) {
    const updated = { ...existing, label: input.label || existing.label };
    set({
      accounts: state.accounts.map((a) => (a.id === existing.id ? updated : a)),
      activeId: existing.id,
    });
    return updated;
  }
  const account: StoredAccount = {
    id: shortId("acct"),
    label: input.label,
    link: input.link,
    addedAt: new Date().toISOString(),
  };
  set({ accounts: [...state.accounts, account], activeId: account.id });
  return account;
}

export function setActiveAccount(id: string) {
  if (!state.accounts.some((a) => a.id === id)) return;
  set({ ...state, activeId: id });
}

export function renameAccount(id: string, label: string) {
  set({
    ...state,
    accounts: state.accounts.map((a) => (a.id === id ? { ...a, label } : a)),
  });
}

/** Rotate the stored link for an account in place (server-side rotation, D§5). */
export function updateLink(id: string, link: string) {
  set({
    ...state,
    accounts: state.accounts.map((a) => (a.id === id ? { ...a, link } : a)),
  });
}

/** Sign out of one account (drop its link locally). */
export function removeAccount(id: string) {
  const accounts = state.accounts.filter((a) => a.id !== id);
  const activeId =
    state.activeId === id ? (accounts[0]?.id ?? null) : state.activeId;
  set({ accounts, activeId });
}

/** Sign out of everything. */
export function clearAll() {
  set({ accounts: [], activeId: null });
}

// ── React binding ─────────────────────────────────────────────────────────────

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);
  const active =
    snapshot.accounts.find((a) => a.id === snapshot.activeId) ?? null;
  return {
    accounts: snapshot.accounts,
    active,
    activeLink: active?.link ?? null,
    hasAccount: snapshot.accounts.length > 0,
    setActiveAccount,
    addAccount,
    renameAccount,
    removeAccount,
    clearAll,
  };
}
