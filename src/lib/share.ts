import type { Deck } from "./srs";

export type RawPair = { front: string; back: string };

const DELIMITERS = ["\t", ";", "|", ","] as const;

/** Tolkar inklistrad text: en rad per glosa, tabb/semikolon/|/komma som avgränsare. */
export const parsePairs = (text: string): RawPair[] => {
  const rows: RawPair[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const delim = DELIMITERS.find((d) => trimmed.includes(d));
    let front = "";
    let back = "";
    if (delim) {
      const idx = trimmed.indexOf(delim);
      front = trimmed.slice(0, idx);
      back = trimmed.slice(idx + 1);
    } else {
      // "word - translation" eller "word = translation"
      const m = trimmed.match(/^(.+?)\s*(?:[-–=:])\s+(.+)$/);
      if (!m) continue;
      front = m[1];
      back = m[2];
    }
    front = front.replace(/^["']|["']$/g, "").trim();
    back = back.replace(/^["']|["']$/g, "").trim();
    if (front && back) rows.push({ front, back });
  }
  return rows;
};

export const toCSV = (deck: Deck): string =>
  ["front;back", ...deck.cards.map((c) => `"${c.front.replace(/"/g, '""')}";"${c.back.replace(/"/g, '""')}"`)].join("\n");

const b64url = (s: string): string =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string): string =>
  decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

type SharePayload = { n: string; s?: string; c: [string, string][] };

export const shareLink = (deck: Deck): string => {
  const payload: SharePayload = {
    n: deck.name,
    s: deck.subject,
    c: deck.cards.map((c) => [c.front, c.back] as [string, string]),
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${location.origin}${location.pathname}#lista=${encoded}`;
};

export const readShareHash = (): { name: string; subject: string; pairs: RawPair[] } | null => {
  const hash = location.hash.replace(/^#/, "");
  const m = hash.match(/(?:^|&)lista=([^&]+)/);
  if (!m) return null;
  try {
    const payload = JSON.parse(fromB64url(m[1])) as SharePayload;
    if (!payload || !Array.isArray(payload.c)) return null;
    return {
      name: payload.n || "Delad lista",
      subject: payload.s || "",
      pairs: payload.c
        .filter((p) => Array.isArray(p) && p.length === 2)
        .map((p) => ({ front: String(p[0]), back: String(p[1]) })),
    };
  } catch {
    return null;
  }
};

export const clearShareHash = (): void => {
  history.replaceState(null, "", location.pathname);
};