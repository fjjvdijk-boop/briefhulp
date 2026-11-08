"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { BUILT_IN, BUILT_IN_ORDER, englishName, getDict, isBuiltIn, isRtl, type LangInfo } from "../lib/i18n";
import { canAutoTranslate } from "../lib/i18n/autotranslate";

interface Props {
  current: string | null;
  aiAvailable: boolean;
  onChoose: (code: string, info: LangInfo | null, autoTranslate: boolean) => void;
}

function dutchName(c: string) {
  try {
    return new Intl.DisplayNames(["nl"], { type: "language" }).of(c);
  } catch {
    return undefined;
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Eerste scherm: kies uw taal. Alle 639 talen van de Unicode-taaldatabase zijn te kiezen. */
export function LanguageScreen({ current, aiAvailable, onChoose }: Props) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<LangInfo[]>([]);
  const [picked, setPicked] = useState<LangInfo | null>(null);
  const [auto, setAuto] = useState<"checking" | "yes" | "no">("checking");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    import("../lib/i18n/languages.json").then((m) => setAll((m.default as LangInfo[]).filter((l) => !isBuiltIn(l.c))));
  }, []);

  useEffect(() => {
    if (!picked) return;
    setAuto("checking");
    canAutoTranslate(picked.c).then((ok) => setAuto(ok ? "yes" : "no"));
  }, [picked]);

  const query = norm(q.trim());
  const match = (...names: (string | undefined)[]) => !query || names.some((n) => n && norm(n).includes(query));
  const builtIn = BUILT_IN_ORDER.filter((c) => match(BUILT_IN[c].name, englishName(c), c, dutchName(c)));
  const more = useMemo(() => all.filter((l) => match(l.n, l.en, l.nl, l.c)), [all, query]); // eslint-disable-line react-hooks/exhaustive-deps
  const titleDict = current ? getDict(current) : null;

  if (picked) {
    const name = picked.n ?? picked.en;
    const rtl = !!picked.rtl || isRtl(picked.c);
    return (
      <section className="screen lang-screen">
        <h1 className="title" lang={picked.c} dir={rtl ? "rtl" : "ltr"}>
          {name}
        </h1>
        <p className="lead">
          {picked.en}
          {picked.nl && picked.nl !== picked.en ? ` · ${picked.nl}` : ""}
        </p>

        {auto === "checking" && <p className="hint">…</p>}

        {auto === "yes" && (
          <>
            <div className="card auto-card">
              <h2 className="card-title">
                <Icon name="globe" /> Translate Briefhulp into {name}
              </h2>
              <p>Your phone can translate the whole app into this language itself. This is free and private: nothing is sent to a server. It takes a minute, only once.</p>
              <p className="hint" lang="nl">
                Uw telefoon kan de hele app zelf naar deze taal vertalen. Gratis en privé, één keer.
              </p>
            </div>
            <button className="btn btn-primary btn-huge" onClick={() => onChoose(picked.c, picked, true)}>
              <Icon name="check" size={32} />
              <span>OK</span>
            </button>
          </>
        )}

        {auto === "no" && (
          <>
            <p className="notice" lang="en">
              <Icon name="info" size={22} />
              <span>{aiAvailable ? getDict("en").onboarding.moreNoteAI : getDict("en").onboarding.moreNoteFree}</span>
            </p>
            <button className="btn btn-primary btn-huge" onClick={() => onChoose(picked.c, picked, false)}>
              <Icon name="check" size={32} />
              <span>OK</span>
            </button>
          </>
        )}

        <button className="btn btn-ghost" onClick={() => setPicked(null)}>
          <Icon name="back" />
          <span>Back · Terug</span>
        </button>
      </section>
    );
  }

  return (
    <section className="screen lang-screen">
      <div className="lang-hero">
        <h1 className="title">
          {titleDict && titleDict.code !== "nl" ? (
            <>
              {titleDict.onboarding.chooseLanguage}
              <span className="lang-sub">Kies uw taal</span>
            </>
          ) : (
            <>
              Kies uw taal
              <span className="lang-sub" lang="en">
                Choose your language
              </span>
            </>
          )}
        </h1>
      </div>

      <label className="search">
        <Icon name="globe" size={24} />
        <span className="sr-only">Zoek een taal / Search for a language</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek / Search / بحث / Ara…"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {builtIn.length > 0 && (
        <ul className="lang-grid" role="list">
          {builtIn.map((c) => (
            <li key={c}>
              <button
                className={`lang-btn ${current === c ? "on" : ""}`}
                onClick={() => onChoose(c, null, false)}
                lang={c}
                dir={isRtl(c) ? "rtl" : "ltr"}
                aria-pressed={current === c}
              >
                <span className="lang-native">{BUILT_IN[c].name}</span>
                {c !== "en" && (
                  <span className="lang-en" lang="en" dir="ltr">
                    {englishName(c)}
                  </span>
                )}
                {current === c && <Icon name="check" size={22} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="more-langs" open={query.length > 0 || moreOpen} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}>
        <summary>
          <span>Alle talen · All languages</span>
          <span className="count">{all.length || "…"}</span>
        </summary>
        {/* De lange lijst pas opbouwen als hij open is: sneller starten op oude telefoons */}
        {(query.length > 0 || moreOpen) && (
        <ul className="lang-list" role="list">
          {more.slice(0, query ? 200 : 1000).map((l) => (
            <li key={l.c}>
              <button className={`lang-row ${current === l.c ? "on" : ""}`} onClick={() => setPicked(l)} lang={l.c}>
                <span dir={l.rtl ? "rtl" : "ltr"}>{l.n ?? l.en}</span>
                <span className="lang-en" lang="en">
                  {l.n ? l.en : l.nl && l.nl !== l.en ? l.nl : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
        )}
      </details>
      {builtIn.length === 0 && more.length === 0 && all.length > 0 && <p className="hint">—</p>}
    </section>
  );
}
