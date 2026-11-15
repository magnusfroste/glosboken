export type Card = {
  id: string;
  front: string;
  back: string;
  box: number; // 0–5, Leitner
  due: number; // epoch ms
  seen: number;
  correct: number;
};

export type Deck = {
  id: string;
  name: string;
  subject: string;
  created: number;
  cards: Card[];
};

export type Store = {
  version: 1;
  decks: Deck[];
};

const KEY = "glosboken-v1";

/** Leitner-boxarnas intervall i dagar. Box 0 = direkt igen. */
export const INTERVALS = [0, 1, 3, 7, 16, 35];
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const newDeck = (name: string, subject = ""): Deck => ({
  id: uid(),
  name: name.trim() || "Namnlös lista",
  subject,
  created: Date.now(),
  cards: [],
});

export const newCard = (front: string, back: string): Card => ({
  id: uid(),
  front: front.trim(),
  back: back.trim(),
  box: 0,
  due: Date.now(),
  seen: 0,
  correct: 0,
});

export const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed && Array.isArray(parsed.decks)) return parsed;
    }
  } catch {
    /* trasig data – börja om */
  }
  return { version: 1, decks: [] };
};

export const saveStore = (store: Store): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* fullt eller blockerat – spelet fortsätter i minnet */
  }
};

/** Rättar ett svar: ökad box, nästa repetition längre fram. */
export const gradeCorrect = (card: Card): Card => {
  const box = Math.min(INTERVALS.length - 1, card.box + 1);
  return {
    ...card,
    box,
    due: Date.now() + (INTERVALS[box] || 1) * DAY,
    seen: card.seen + 1,
    correct: card.correct + 1,
  };
};

/** Fel svar: tillbaka till box 0 och igen om tio minuter. */
export const gradeWrong = (card: Card): Card => ({
  ...card,
  box: 0,
  due: Date.now() + 10 * MINUTE,
  seen: card.seen + 1,
});

export const dueCards = (deck: Deck): Card[] => {
  const now = Date.now();
  const due = deck.cards.filter((c) => c.due <= now);
  return due.length > 0 ? due : deck.cards;
};

export const masteredCount = (deck: Deck): number =>
  deck.cards.filter((c) => c.box >= 4).length;

export const accuracy = (deck: Deck): number => {
  const seen = deck.cards.reduce((s, c) => s + c.seen, 0);
  const right = deck.cards.reduce((s, c) => s + c.correct, 0);
  return seen === 0 ? 0 : Math.round((right / seen) * 100);
};

/** Normaliserar ett skrivet svar så "Huset!" och "huset" räknas lika. */
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, (m) => m)
    .replace(/[^a-z0-9åäö ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Ett kort kan ha flera godkända svar separerade med / eller ;. */
export const answerMatches = (given: string, expected: string): boolean => {
  const g = normalize(given);
  if (!g) return false;
  return expected
    .split(/[;/]|\s\|\s/)
    .map((part) => normalize(part))
    .filter(Boolean)
    .some((part) => part === g);
};