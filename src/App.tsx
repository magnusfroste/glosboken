import { useEffect, useMemo, useRef, useState } from "react";
import { report } from "./lib/skolappar";
import {
  accuracy,
  answerMatches,
  dueCards,
  gradeCorrect,
  gradeWrong,
  loadStore,
  masteredCount,
  newCard,
  newDeck,
  saveStore,
  type Card,
  type Deck,
  type Store,
} from "./lib/srs";
import { clearShareHash, parsePairs, readShareHash, shareLink, toCSV, type RawPair } from "./lib/share";

type Route =
  | { v: "home" }
  | { v: "deck"; id: string }
  | { v: "study"; id: string }
  | { v: "test"; id: string }
  | { v: "edit"; id: string }
  | { v: "import" }
  | { v: "shared"; name: string; subject: string; pairs: RawPair[] };

const EXAMPLE: RawPair[] = [
  { front: "the house", back: "huset" },
  { front: "to run", back: "att springa" },
  { front: "quickly", back: "snabbt" },
  { front: "although", back: "fastän" },
  { front: "a friend", back: "en vän" },
];

export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [route, setRoute] = useState<Route>({ v: "home" });

  useEffect(() => saveStore(store), [store]);

  useEffect(() => {
    const openShared = () => {
      const shared = readShareHash();
      if (shared) {
        setRoute({ v: "shared", ...shared });
        clearShareHash();
      }
    };
    openShared();
    window.addEventListener("hashchange", openShared);
    return () => window.removeEventListener("hashchange", openShared);
  }, []);

  const patchDeck = (id: string, fn: (deck: Deck) => Deck) =>
    setStore((s) => ({ ...s, decks: s.decks.map((d) => (d.id === id ? fn(d) : d)) }));

  const addDeck = (deck: Deck) => {
    setStore((s) => ({ ...s, decks: [deck, ...s.decks] }));
    return deck.id;
  };

  const removeDeck = (id: string) => {
    setStore((s) => ({ ...s, decks: s.decks.filter((d) => d.id !== id) }));
    setRoute({ v: "home" });
  };

  const deck = route.v !== "home" && route.v !== "import" && route.v !== "shared"
    ? store.decks.find((d) => d.id === route.id)
    : undefined;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5 safe-bottom">
      <Header
        onHome={() => setRoute({ v: "home" })}
        showHome={route.v !== "home"}
        subtitle={deck?.name}
      />

      {route.v === "home" && (
        <Home
          decks={store.decks}
          onOpen={(id) => setRoute({ v: "deck", id })}
          onImport={() => setRoute({ v: "import" })}
          onNew={() => {
            const d = newDeck("Ny lista");
            setRoute({ v: "edit", id: addDeck(d) });
          }}
        />
      )}

      {route.v === "deck" && deck && (
        <DeckOverview
          deck={deck}
          onStudy={() => setRoute({ v: "study", id: deck.id })}
          onTest={() => setRoute({ v: "test", id: deck.id })}
          onEdit={() => setRoute({ v: "edit", id: deck.id })}
          onDelete={() => removeDeck(deck.id)}
          onRename={(name) => patchDeck(deck.id, (d) => ({ ...d, name }))}
        />
      )}

      {route.v === "study" && deck && (
        <Study
          deck={deck}
          grade={(card, ok) =>
            patchDeck(deck.id, (d) => ({
              ...d,
              cards: d.cards.map((c) => (c.id === card.id ? (ok ? gradeCorrect(c) : gradeWrong(c)) : c)),
            }))
          }
          onDone={() => setRoute({ v: "deck", id: deck.id })}
        />
      )}

      {route.v === "test" && deck && <Test deck={deck} onDone={() => setRoute({ v: "deck", id: deck.id })} />}

      {route.v === "edit" && deck && (
        <Edit
          deck={deck}
          addCards={(pairs) =>
            patchDeck(deck.id, (d) => ({ ...d, cards: [...d.cards, ...pairs.map((p) => newCard(p.front, p.back))] }))
          }
          updateCard={(id, front, back) =>
            patchDeck(deck.id, (d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, front, back } : c)) }))
          }
          removeCard={(id) => patchDeck(deck.id, (d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }))}
          done={() => setRoute({ v: "deck", id: deck.id })}
        />
      )}

      {route.v === "import" && (
        <Import
          onBack={() => setRoute({ v: "home" })}
          onCreate={(name, subject, pairs) => {
            const d = newDeck(name, subject);
            d.cards = pairs.map((p) => newCard(p.front, p.back));
            addDeck(d);
            setRoute({ v: "deck", id: d.id });
          }}
        />
      )}

      {route.v === "shared" && (
        <SharedPreview
          name={route.name}
          subject={route.subject}
          pairs={route.pairs}
          onSave={() => {
            const d = newDeck(route.name, route.subject);
            d.cards = route.pairs.map((p) => newCard(p.front, p.back));
            const id = addDeck(d);
            setRoute({ v: "deck", id });
          }}
          onBack={() => setRoute({ v: "home" })}
        />
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-slate-400">
        Glosboken · öppen källkod · inga konton, ingen spårning · allt sparas bara på den här enheten
      </footer>
    </div>
  );
}

function Header({ onHome, showHome, subtitle }: { onHome: () => void; showHome: boolean; subtitle?: string }) {
  return (
    <header className="flex items-center gap-3">
      {showHome ? (
        <button className="btn-ghost px-4" onClick={onHome} aria-label="Till startsidan">
          ←
        </button>
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-2xl">📖</div>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight">{subtitle || "Glosboken"}</h1>
        {!subtitle && <p className="text-sm text-slate-500">Träna glosor och begrepp – utan inloggning</p>}
      </div>
    </header>
  );
}

function Home({
  decks,
  onOpen,
  onImport,
  onNew,
}: {
  decks: Deck[];
  onOpen: (id: string) => void;
  onImport: () => void;
  onNew: () => void;
}) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button className="btn-primary" onClick={onImport}>
          Klistra in ordlista
        </button>
        <button className="btn-ghost" onClick={onNew}>
          Ny tom lista
        </button>
      </div>

      {decks.length === 0 && (
        <div className="card text-slate-600">
          <p className="font-semibold text-ink">Inga listor än.</p>
          <p className="mt-1 text-sm">
            Klistra in glosor (en per rad, t.ex. <code>the house&nbsp;–&nbsp;huset</code>) eller börja med ett
            exempel.
          </p>
          <button className="btn-ghost mt-3" onClick={() => setPreview((p) => !p)}>
            {preview ? "Dölj exempel" : "Visa exempel"}
          </button>
          {preview && (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {EXAMPLE.map((p) => (
                <li key={p.front} className="flex justify-between py-2">
                  <span>{p.front}</span>
                  <span className="text-slate-500">{p.back}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {decks.map((d) => {
          const due = dueCards(d).length;
          return (
            <li key={d.id}>
              <button
                className="card w-full text-left transition hover:ring-brand/40"
                onClick={() => onOpen(d.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{d.name}</p>
                    <p className="text-sm text-slate-500">
                      {d.cards.length} kort · {masteredCount(d)} säkra · {accuracy(d)}% rätt
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-dark">
                    {due} kvar
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeckOverview({
  deck,
  onStudy,
  onTest,
  onEdit,
  onDelete,
  onRename,
}: {
  deck: Deck;
  onStudy: () => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);

  const copyShare = async () => {
    const link = shareLink(deck);
    try {
      await navigator.clipboard.writeText(link);
      setStatus("Delningslänk kopierad – skicka den till klassen.");
    } catch {
      setStatus(link);
    }
  };

  const downloadCSV = () => {
    const blob = new Blob([toCSV(deck)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.name.replace(/[^\wåäöÅÄÖ -]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Kort" value={deck.cards.length} />
        <Stat label="Säkra" value={masteredCount(deck)} />
        <Stat label="Rätt" value={`${accuracy(deck)}%`} />
      </div>

      <button className="btn-primary w-full text-lg" onClick={onStudy} disabled={deck.cards.length === 0}>
        Träna {dueCards(deck).length} kort
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onTest} disabled={deck.cards.length < 2}>
          Skrivtest
        </button>
        <button className="btn-ghost" onClick={onEdit}>
          Redigera kort
        </button>
      </div>

      <div className="card flex flex-col gap-3">
        <button className="btn-ghost" onClick={copyShare} disabled={deck.cards.length === 0}>
          Dela listan
        </button>
        <button className="btn-ghost" onClick={downloadCSV} disabled={deck.cards.length === 0}>
          Ladda ner som CSV
        </button>
        {status && <p className="break-all text-xs text-slate-500">{status}</p>}
      </div>

      <div className="card flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="deck-name">
          Listans namn
        </label>
        <input
          id="deck-name"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-base"
          value={deck.name}
          onChange={(e) => onRename(e.target.value)}
        />
        {confirming ? (
          <div className="flex gap-2">
            <button className="btn bg-red-600 text-white" onClick={onDelete}>
              Ja, radera
            </button>
            <button className="btn-ghost" onClick={() => setConfirming(false)}>
              Avbryt
            </button>
          </div>
        ) : (
          <button className="btn-ghost text-red-600" onClick={() => setConfirming(true)}>
            Radera listan
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Study({ deck, grade, onDone }: { deck: Deck; grade: (card: Card, ok: boolean) => void; onDone: () => void }) {
  // Kön låses när passet startar – annars krymper den när korten får nytt datum.
  const [queue] = useState<Card[]>(() =>
    [...dueCards(deck)].sort((a, b) => a.box - b.box || a.due - b.due)
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });

  const card = queue[index];

  const next = (ok: boolean) => {
    if (!card) return;
    grade(card, ok);
    setTally((t) => ({ right: t.right + (ok ? 1 : 0), wrong: t.wrong + (ok ? 0 : 1) }));
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && (e.key === "1" || e.key === "ArrowLeft")) next(false);
      else if (revealed && (e.key === "2" || e.key === "ArrowRight")) next(true);
      else if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finished = !(queue.length > 0) || index >= queue.length;

  useEffect(() => {
    if (queue.length > 0) report("round_start");
  }, []);

  useEffect(() => {
    if (finished && queue.length > 0) report("round_done", Math.round((tally.right / queue.length) * 100));
  }, [finished]);

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 card">
        <p className="text-2xl font-extrabold">
          {index === 0 ? "Inga kort att träna" : `Klart för nu, ${deck.name}!`}
        </p>
        <p className="text-slate-600">
          Rätt: {tally.right} · Fel: {tally.wrong}
        </p>
        <button className="btn-primary mt-2 w-full" onClick={onDone}>
          Tillbaka till listan
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Kort {Math.min(index + 1, queue.length)} av {queue.length}
        </span>
        <span>
          ✓ {tally.right} · ✗ {tally.wrong}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <button
        className="card flex min-h-[45vh] w-full flex-col items-center justify-center gap-4 text-center"
        onClick={() => setRevealed(true)}
        aria-label="Visa svaret"
      >
        <span className="text-3xl font-extrabold sm:text-4xl">{card.front}</span>
        {revealed ? (
          <>
            <span className="h-px w-24 bg-slate-200" />
            <span className="text-2xl font-semibold text-brand-dark sm:text-3xl">{card.back}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400">Tryck för att se svaret</span>
        )}
      </button>

      {revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn bg-red-50 text-red-700 ring-1 ring-red-200" onClick={() => next(false)}>
            Kunde inte
          </button>
          <button className="btn bg-emerald-600 text-white" onClick={() => next(true)}>
            Kunde
          </button>
        </div>
      ) : (
        <button className="btn-primary" onClick={() => setRevealed(true)}>
          Visa svar
        </button>
      )}
    </div>
  );
}

function Test({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const [cards] = useState<Card[]>(() => [...deck.cards].sort(() => Math.random() - 0.5).slice(0, 20));
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [results, setResults] = useState<{ card: Card; ok: boolean; given: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = cards[index];
  const done = index >= cards.length;

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [index, done]);

  useEffect(() => {
    if (cards.length > 0) report("round_start");
  }, []);

  useEffect(() => {
    if (done && cards.length > 0) report("round_done", Math.round((results.filter((r) => r.ok).length / cards.length) * 100));
  }, [done]);

  const submit = () => {
    if (!card) return;
    const ok = answerMatches(value, card.back);
    setResults((r) => [...r, { card, ok, given: value }]);
    setValue("");
    setIndex((i) => i + 1);
  };

  if (done) {
    const right = results.filter((r) => r.ok).length;
    return (
      <div className="flex flex-col gap-4">
        <div className="card text-center">
          <p className="text-3xl font-extrabold">
            {right} / {cards.length} rätt
          </p>
          <p className="text-slate-500">{right === cards.length ? "Allt rätt – snyggt!" : "Repetera de du missade."}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {results.map((r, i) => (
            <li
              key={`${r.card.id}-${i}`}
              className={`rounded-2xl p-3 text-sm ring-1 ${
                r.ok ? "bg-emerald-50 text-emerald-900 ring-emerald-100" : "bg-red-50 text-red-900 ring-red-100"
              }`}
            >
              <p className="font-semibold">{r.card.front}</p>
              <p>
                Rätt svar: <strong>{r.card.back}</strong>
              </p>
              {!r.ok && <p className="opacity-70">Du svarade: {r.given || "–"}</p>}
            </li>
          ))}
        </ul>
        <button className="btn-primary" onClick={onDone}>
          Klar
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-sm text-slate-500">
        Fråga {index + 1} av {cards.length}
      </p>
      <div className="card flex min-h-[30vh] flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold">{card.front}</span>
      </div>
      <label className="text-sm font-semibold" htmlFor="answer">
        Skriv svaret
      </label>
      <input
        id="answer"
        ref={inputRef}
        className="rounded-2xl border border-slate-200 px-4 py-4 text-lg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
      />
      <button className="btn-primary" type="submit">
        Svara
      </button>
    </form>
  );
}

function Edit({
  deck,
  addCards,
  updateCard,
  removeCard,
  done,
}: {
  deck: Deck;
  addCards: (pairs: RawPair[]) => void;
  updateCard: (id: string, front: string, back: string) => void;
  removeCard: (id: string) => void;
  done: () => void;
}) {
  const [paste, setPaste] = useState("");
  const [added, setAdded] = useState(0);

  const add = () => {
    const pairs = parsePairs(paste);
    if (pairs.length === 0) return;
    addCards(pairs);
    setAdded(pairs.length);
    setPaste("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="bulk">
          Lägg till flera kort
        </label>
        <textarea
          id="bulk"
          className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm"
          placeholder={"the house\t huset\nto run\t att springa"}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button className="btn-primary" onClick={add} disabled={!paste.trim()}>
          Lägg till
        </button>
        {added > 0 && <p className="text-sm text-emerald-700">{added} kort tillagda.</p>}
      </div>

      <ul className="flex flex-col gap-2">
        {deck.cards.map((c) => (
          <li key={c.id} className="card grid grid-cols-[1fr_1fr_auto] items-center gap-2 p-3">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={c.front}
              onChange={(e) => updateCard(c.id, e.target.value, c.back)}
              aria-label="Framsida"
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={c.back}
              onChange={(e) => updateCard(c.id, c.front, e.target.value)}
              aria-label="Baksida"
            />
            <button
              className="rounded-xl px-3 py-2 text-red-600 hover:bg-red-50"
              onClick={() => removeCard(c.id)}
              aria-label={`Ta bort ${c.front}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <button className="btn-primary" onClick={done}>
        Klar
      </button>
    </div>
  );
}

function Import({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (name: string, subject: string, pairs: RawPair[]) => void;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const pairs = useMemo(() => parsePairs(text), [text]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="listname">
          Namn på listan
        </label>
        <input
          id="listname"
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="Engelska vecka 12"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="Ämne (valfritt)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="card flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="paste">
          Klistra in glosorna
        </label>
        <textarea
          id="paste"
          className="min-h-[180px] rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm"
          placeholder={"the house\t huset\nto run\t att springa\nquickly – snabbt"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/plain,text/csv"
          className="text-sm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <p className="text-sm text-slate-500">
          {pairs.length > 0 ? `${pairs.length} kort hittade` : "Tabb, semikolon, | eller – mellan glosa och svar."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onBack}>
          Avbryt
        </button>
        <button
          className="btn-primary"
          disabled={pairs.length === 0}
          onClick={() => onCreate(name || "Namnlös lista", subject, pairs)}
        >
          Skapa listan
        </button>
      </div>
    </div>
  );
}

function SharedPreview({
  name,
  subject,
  pairs,
  onSave,
  onBack,
}: {
  name: string;
  subject: string;
  pairs: RawPair[];
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <p className="text-sm text-slate-500">Delad lista</p>
        <p className="text-2xl font-extrabold">{name}</p>
        {subject && <p className="text-sm text-slate-500">{subject}</p>}
        <p className="mt-2 text-sm text-slate-600">{pairs.length} kort</p>
      </div>
      <ul className="card divide-y divide-slate-100 p-0 text-sm">
        {pairs.slice(0, 12).map((p, i) => (
          <li key={`${p.front}-${i}`} className="flex justify-between gap-3 px-4 py-2">
            <span className="truncate">{p.front}</span>
            <span className="truncate text-slate-500">{p.back}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onBack}>
          Avbryt
        </button>
        <button className="btn-primary" onClick={onSave}>
          Spara listan
        </button>
      </div>
    </div>
  );
}