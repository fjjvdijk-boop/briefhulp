"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import {
  ALL_LANGUAGE_CODES,
  BUILT_IN,
  BUILT_IN_ORDER,
  EXTRA_LANGUAGE_CODES,
  englishName,
  getDict,
  isBuiltIn,
  isRtl,
  nativeName,
} from "../lib/i18n";

interface Props {
  current: string | null;
  aiAvailable: boolean;
  onChoose: (code: string) => void;
}

/** Eerste scherm: kies uw taal. Titel staat in de taal van de telefoon én in het Nederlands en Engels. */
export function LanguageScreen({ current, aiAvailable, onChoose }: Props) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const others = useMemo(() => {
    const codes = [...ALL_LANGUAGE_CODES, ...EXTRA_LANGUAGE_CODES].filter((c) => !isBuiltIn(c));
    return codes
      .map((code) => ({ code, native: nativeName(code), english: englishName(code) }))
      .filter((l) => l.native && l.native !== l.code)
      .sort((a, b) => a.english.localeCompare(b.english));
  }, []);

  const query = q.trim().toLowerCase();
  const match = (code: string, a: string, b: string) =>
    !query || a.toLowerCase().includes(query) || b.toLowerCase().includes(query) || code === query;
  const builtIn = BUILT_IN_ORDER.filter((c) => match(c, BUILT_IN[c].name, englishName(c)));
  const more = others.filter((l) => match(l.code, l.native, l.english));
  const titleDict = current ? getDict(current) : null;

  if (picked) {
    const t = getDict(picked);
    return (
      <section className="screen lang-screen">
        <h1 className="title" lang={picked}>
          {nativeName(picked)}
        </h1>
        <p className="notice" lang="en">
          <Icon name="info" size={22} />
          <span>{aiAvailable ? t.onboarding.moreNoteAI : t.onboarding.moreNoteFree}</span>
        </p>
        <button className="btn btn-primary btn-huge" onClick={() => onChoose(picked)}>
          <Icon name="check" size={32} />
          <span>OK</span>
        </button>
        <button className="btn btn-ghost" onClick={() => setPicked(null)}>
          <Icon name="back" />
          <span>{t.app.back}</span>
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
          placeholder="Zoek / Search…"
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
                onClick={() => onChoose(c)}
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

      {more.length > 0 && (
        <details className="more-langs" open={query.length > 0}>
          <summary>
            <span>Meer talen · More languages</span>
            <span className="count">{others.length}</span>
          </summary>
          <ul className="lang-list" role="list">
            {more.map((l) => (
              <li key={l.code}>
                <button className={`lang-row ${current === l.code ? "on" : ""}`} onClick={() => setPicked(l.code)} lang={l.code}>
                  <span dir={isRtl(l.code) ? "rtl" : "ltr"}>{l.native}</span>
                  <span className="lang-en" lang="en">
                    {l.english}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {builtIn.length === 0 && more.length === 0 && <p className="hint">—</p>}
    </section>
  );
}
