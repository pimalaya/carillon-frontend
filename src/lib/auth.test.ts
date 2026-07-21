import { beforeEach, describe, expect, it } from "vitest";

import {
  addAccount,
  clearAll,
  getActiveLink,
  getState,
  removeAccount,
  setActiveAccount,
} from "./auth";

describe("auth store", () => {
  beforeEach(() => {
    clearAll();
  });

  it("adds an account and makes it active", () => {
    const acct = addAccount({ label: "a@x.com", link: "link-a" });
    expect(getActiveLink()).toBe("link-a");
    expect(getState().activeId).toBe(acct.id);
  });

  it("dedupes by capability link and refreshes the label", () => {
    addAccount({ label: "old", link: "link-a" });
    addAccount({ label: "new", link: "link-a" });
    const accounts = getState().accounts.filter((a) => a.link === "link-a");
    expect(accounts).toHaveLength(1);
    expect(accounts[0].label).toBe("new");
  });

  it("switches the active account", () => {
    addAccount({ label: "a", link: "link-a" });
    const b = addAccount({ label: "b", link: "link-b" });
    expect(getActiveLink()).toBe("link-b");
    setActiveAccount(b.id);
    expect(getActiveLink()).toBe("link-b");
  });

  it("picks a remaining account when the active one is removed", () => {
    const a = addAccount({ label: "a", link: "link-a" });
    addAccount({ label: "b", link: "link-b" }); // active
    removeAccount(getState().activeId!);
    expect(getActiveLink()).toBe("link-a");
    removeAccount(a.id);
    expect(getActiveLink()).toBeNull();
  });
});
