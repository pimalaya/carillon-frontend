import type { AuthMethod, TestVerdict } from "@/api/schemas";

export interface WizardState {
  // Identify (email/server → discovery → chosen IMAP config)
  login: string;
  imap_host: string;
  imap_port: number;
  mailbox: string;
  /** Chosen choice's transport security (informational — Carillon watches
   *  over implicit TLS today; starttls/plain aren't wired yet). */
  security?: "tls" | "starttls" | "plain";
  /** The auth method the user chose (password / bearer / oauth*). Drives which
   *  credential form the next stage shows; OAuth carries its endpoints. */
  auth?: AuthMethod;
  // Authenticate / test
  password: string;
  verdict?: TestVerdict;
  /** The PIM account (normalised login) a service is being added to. Set by the
   *  "Add service" flow; unused by "Add account". */
  mailbox_key?: string;
  /** Which kind of service the "Add service" flow is creating: an email folder
   *  (IMAP) or an addressbook (CardDAV). Defaults to email. */
  service_type?: "email" | "addressbook";
  /** CardDAV collection URL, when `service_type` is `addressbook`. */
  carddav_url?: string;
  // Configure
  notify_url: string;
  /** Client-generated HMAC secret, sent on create and shown once. */
  hmac_secret?: string;
  // Results of activation
  capabilityLink?: string;
  account_id?: string;
  watchId?: string;
}

export interface StageProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  next: () => void;
  back: () => void;
}

export const initialWizardState: WizardState = {
  login: "",
  imap_host: "",
  imap_port: 993,
  mailbox: "INBOX",
  password: "",
  notify_url: "",
};

/** "Add account" (onboarding) stops once a PIM account is authenticated and its
 *  credential is stored — no service is created here. */
export const STAGES = ["Identify", "Authenticate"] as const;

/** "Add service" runs against an already-authenticated PIM account, reusing its
 *  stored credential. */
export const SERVICE_STAGES = ["Configure", "Verify", "Commit"] as const;

/** Best-effort client-side IMAP host guess from an email domain, used only as
 *  a fallback for manual entry when discovery finds nothing. Always editable. */
export function guessImapHost(login: string): string {
  const domain = login.split("@")[1]?.toLowerCase();
  if (!domain) return "";
  const known: Record<string, string> = {
    "gmail.com": "imap.gmail.com",
    "googlemail.com": "imap.gmail.com",
    "fastmail.com": "imap.fastmail.com",
    "posteo.net": "posteo.de",
    "outlook.com": "outlook.office365.com",
    "hotmail.com": "outlook.office365.com",
    "yahoo.com": "imap.mail.yahoo.com",
    "icloud.com": "imap.mail.me.com",
  };
  return known[domain] ?? `imap.${domain}`;
}

/** Notify URL rule mirrors the server: https, or http on loopback. */
export function isValidNotifyUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return true;
    return (
      u.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}

/** A random 256-bit hex secret the client generates for a new watch. */
export function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A short random watch id (the client supplies it on create). */
export function randomWatchId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `wch_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
