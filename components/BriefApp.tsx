"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { Result } from "./Result";
import { FileProblem, preparePage, type PreparedPage } from "../lib/client/image";
import { localToday } from "../lib/client/calendar";
import { makeSample } from "../lib/sample";
import { readLetter, type ReadProgress } from "../lib/client/ocr";
import { explainLocally } from "../lib/client/rules";
import { LANGUAGES, type Analysis, type ExplainLanguage } from "../lib/types";

type Screen = "home" | "pages" | "loading" | "result" | "error";
export type ResultMode = "lokaal" | "ai" | "demo" | "voorbeeld";

const MAX_PAGES = 6;
const PREF_KEY = "briefhulp:prefs";

interface Prefs {
  privacySeen: boolean;
  largeText: boolean;
  language: ExplainLanguage;
}

function loadPrefs(): Prefs {
  const fallback: Prefs = { privacySeen: false, largeText: false, language: "nl" };
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* privémodus: geen probleem */
  }
}

export default function BriefApp() {
  const [prefs, setPrefs] = useState<Prefs>({ privacySeen: true, largeText: false, language: "nl" });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [busyFile, setBusyFile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mode, setMode] = useState<ResultMode>("lokaal");
  const [letterText, setLetterText] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const [lastRun, setLastRun] = useState<"lokaal" | "ai">("lokaal");
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setAiAvailable(Boolean(j.ai)))
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", prefs.largeText);
  }, [prefs.largeText]);

  const updatePrefs = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  };

  // Telefoon-terugknop: ga een scherm terug in plaats van de app te verlaten.
  useEffect(() => {
    const onPop = () => {
      abortRef.current?.abort();
      setScreen((s) => (s === "result" || s === "error" || s === "loading" ? (pages.length ? "pages" : "home") : "home"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pages.length]);

  const go = (s: Screen) => {
    if (s !== "home") window.history.pushState({ s }, "");
    setScreen(s);
    window.scrollTo({ top: 0 });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNotice(null);
    setBusyFile(true);
    const added: PreparedPage[] = [];
    try {
      for (const f of Array.from(files)) {
        if (pages.length + added.length >= MAX_PAGES) {
          setNotice(`U kunt maximaal ${MAX_PAGES} bladzijden toevoegen.`);
          break;
        }
        added.push(await preparePage(f));
      }
    } catch (e) {
      setNotice(e instanceof FileProblem ? e.message : "Deze foto kan niet worden geopend. Probeer het opnieuw.");
    } finally {
      setBusyFile(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
    if (added.length) {
      setPages((p) => [...p, ...added]);
      if (screen !== "pages") go("pages");
    }
  };

  // GRATIS: lezen en uitleggen op de telefoon zelf. De brief verlaat het toestel niet.
  const readFree = useCallback(async () => {
    if (pages.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setLastRun("lokaal");
    setProgress({ stage: "laden", page: 1, pages: pages.length, progress: 0 });
    go("loading");
    try {
      const { text, confidence } = await readLetter(pages, (p) => {
        if (!ctrl.signal.aborted) setProgress(p);
      });
      if (ctrl.signal.aborted) return;
      const { analysis: a, text: clean } = explainLocally(text, confidence, localToday());
      setAnalysis(a);
      setLetterText(clean);
      setMode("lokaal");
      setScreen("result");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.error(e);
      setError(
        navigator.onLine === false
          ? "Het leesprogramma moet de eerste keer één keer worden gedownload. Zorg voor internet en probeer het opnieuw."
          : "Het lezen van de brief lukte niet. Probeer het opnieuw, of maak een nieuwe foto.",
      );
      setScreen("error");
    } finally {
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // BETAALD (optioneel): volledige uitleg met AI, alleen als de beheerder een API-sleutel heeft ingesteld.
  const analyse = useCallback(async () => {
    if (pages.length === 0) return;
    setLastRun("ai");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    go("loading");
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages.map(({ mediaType, data }) => ({ mediaType, data })),
          language: prefs.language,
          today: localToday(),
        }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.analysis) {
        throw new Error(json.error || "Er ging iets mis. Probeer het opnieuw.");
      }
      setAnalysis(json.analysis);
      setMode(json.demo ? "demo" : "ai");
      setLetterText(null);
      setScreen("result");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(
        navigator.onLine === false
          ? "U heeft geen internet. Controleer uw verbinding en probeer het opnieuw."
          : (e as Error).message || "Er ging iets mis.",
      );
      setScreen("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, prefs.language]);

  const showExample = () => {
    setAnalysis(makeSample());
    setMode("voorbeeld");
    setLetterText(null);
    go("result");
  };

  const startOver = () => {
    abortRef.current?.abort();
    setPages([]); // foto's direct uit het geheugen
    setAnalysis(null);
    setNotice(null);
    setError(null);
    setScreen("home");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      {/* Verborgen bestand-kiezers. capture="environment" opent direct de achtercamera. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />

      <header className="topbar">
        {screen === "home" ? (
          <div className="brand" aria-label="Briefhulp">
            <img src="/icon.svg" alt="" width={36} height={36} />
            <span>Briefhulp</span>
          </div>
        ) : (
          <button className="topbar-btn" onClick={() => (screen === "result" ? startOver() : window.history.back())}>
            <Icon name="back" size={24} />
            <span>{screen === "result" ? "Nieuwe brief" : "Terug"}</span>
          </button>
        )}
        <button
          className={`topbar-btn text-toggle ${prefs.largeText ? "on" : ""}`}
          onClick={() => updatePrefs({ largeText: !prefs.largeText })}
          aria-pressed={prefs.largeText}
          aria-label={prefs.largeText ? "Letters kleiner maken" : "Letters groter maken"}
        >
          <Icon name="text" size={26} />
          <span>{prefs.largeText ? "Kleiner" : "Groter"}</span>
        </button>
      </header>

      <main id="main">
        {ready && !prefs.privacySeen && <PrivacyIntro onOk={() => updatePrefs({ privacySeen: true })} />}

        {screen === "home" && (
          <section className="screen home">
            <h1 className="hero-title">
              Brief gekregen?
              <br />
              <span>Wij leggen het uit.</span>
            </h1>
            <p className="hero-sub">Maak een foto van de brief. U ziet dan in gewone taal wat er staat en wat u moet doen.</p>

            <button className="btn btn-primary btn-huge" onClick={() => cameraRef.current?.click()} disabled={busyFile}>
              <Icon name="camera" size={40} />
              <span>{busyFile ? "Even geduld…" : "Maak een foto"}</span>
            </button>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busyFile}>
              <Icon name="image" />
              <span>Kies een foto of PDF</span>
            </button>

            {notice && <p className="notice" role="alert">{notice}</p>}

            {aiAvailable && (
              <LanguagePicker value={prefs.language} onChange={(language) => updatePrefs({ language })} />
            )}

            <ul className="promise">
              <li>
                <Icon name="check" size={22} /> Wat staat er in de brief?
              </li>
              <li>
                <Icon name="check" size={22} /> Wat moet ik doen?
              </li>
              <li>
                <Icon name="check" size={22} /> Voor wanneer? Met herinnering in uw agenda
              </li>
            </ul>

            <div className="privacy-mini">
              <Icon name="lock" size={22} />
              <p>
                Gratis en zonder account. Uw brief wordt op uw eigen telefoon gelezen en gaat nergens heen.{" "}
                <Link href="/privacy">Lees hoe wij met uw gegevens omgaan</Link>.
              </p>
            </div>

            <button className="link-btn" onClick={showExample}>
              Eerst een voorbeeld bekijken?
            </button>
          </section>
        )}

        {screen === "pages" && (
          <section className="screen">
            <h1 className="title">
              {pages.length === 1 ? "Uw foto" : `Uw ${pages.length} bladzijden`}
            </h1>
            <p className="lead">Is de brief goed te lezen? Heeft de brief meer bladzijden? Voeg die dan ook toe.</p>

            <ol className="thumbs">
              {pages.map((p, i) => (
                <li key={p.id} className="thumb">
                  {p.preview ? (
                    <img src={p.preview} alt={`Bladzijde ${i + 1}`} />
                  ) : (
                    <div className="thumb-pdf">PDF<small>{p.name}</small></div>
                  )}
                  <span className="thumb-num">{i + 1}</span>
                  <button
                    className="thumb-remove"
                    onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))}
                    aria-label={`Bladzijde ${i + 1} weghalen`}
                  >
                    <Icon name="trash" size={22} />
                  </button>
                </li>
              ))}
            </ol>

            {notice && <p className="notice" role="alert">{notice}</p>}

            {pages.length === 0 ? (
              <button className="btn btn-primary btn-huge" onClick={() => cameraRef.current?.click()}>
                <Icon name="camera" size={40} />
                <span>Maak een foto</span>
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-huge" onClick={readFree}>
                  <Icon name="check" size={36} />
                  <span>Leg mijn brief uit</span>
                </button>
                {pages.length < MAX_PAGES && (
                  <button className="btn btn-secondary" onClick={() => cameraRef.current?.click()} disabled={busyFile}>
                    <Icon name="plus" />
                    <span>{busyFile ? "Even geduld…" : "Nog een bladzijde"}</span>
                  </button>
                )}
              </>
            )}
            <p className="hint">
              <Icon name="lock" size={18} /> Gratis. Uw brief wordt op uw telefoon gelezen.
            </p>
            <PhotoTips />
          </section>
        )}

        {screen === "loading" &&
          (progress ? (
            <LocalLoading progress={progress} onCancel={() => window.history.back()} />
          ) : (
            <Loading pages={pages.length} onCancel={() => window.history.back()} />
          ))}

        {screen === "error" && (
          <section className="screen center">
            <div className="error-icon">
              <Icon name="alert" size={56} />
            </div>
            <h1 className="title">Dat lukte niet</h1>
            <p className="lead">{error}</p>
            <button className="btn btn-primary btn-huge" onClick={lastRun === "ai" ? analyse : readFree}>
              <span>Probeer opnieuw</span>
            </button>
            <button className="btn btn-secondary" onClick={startOver}>
              <span>Begin opnieuw</span>
            </button>
          </section>
        )}

        {screen === "result" && analysis && (
          <Result
            analysis={analysis}
            language={prefs.language}
            mode={mode}
            letterText={letterText}
            onUpgrade={aiAvailable && mode === "lokaal" && pages.length > 0 ? analyse : undefined}
            onNew={startOver}
            onRetakePhoto={() => {
              setPages([]);
              setAnalysis(null);
              setScreen("home");
              setTimeout(() => cameraRef.current?.click(), 50);
            }}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          <strong>Let op:</strong> Briefhulp geeft uitleg. Het is geen juridisch of financieel advies. Twijfelt u? Vraag hulp
          aan de afzender of aan Het Juridisch Loket (0800 - 8020, gratis).
        </p>
        <p className="footer-links">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <button className="link-btn small" onClick={() => updatePrefs({ privacySeen: false })}>
            Hoe werkt het?
          </button>
        </p>
      </footer>
    </div>
  );
}

function LanguagePicker({ value, onChange }: { value: ExplainLanguage; onChange: (l: ExplainLanguage) => void }) {
  return (
    <label className="lang-picker">
      <Icon name="globe" size={24} />
      <span className="lang-label">Uitleg in</span>
      <select value={value} onChange={(e) => onChange(e.target.value as ExplainLanguage)}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PhotoTips() {
  return (
    <details className="tips">
      <summary>Tips voor een goede foto</summary>
      <ul>
        <li>Leg de brief plat op tafel.</li>
        <li>Zorg voor veel licht. Daglicht is het best.</li>
        <li>Houd de telefoon recht boven de brief.</li>
        <li>Zorg dat de hele bladzijde op de foto staat.</li>
        <li>Heeft de brief een achterkant met tekst? Maak daar ook een foto van.</li>
      </ul>
    </details>
  );
}

const STEPS = ["De brief wordt gelezen", "We zoeken wat belangrijk is", "We schrijven het in gewone taal", "Bijna klaar"];

function Loading({ pages, onCancel }: { pages: number; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const per = 6 + pages * 2;
    setStep(Math.min(STEPS.length - 1, Math.floor(seconds / per)));
  }, [seconds, pages]);
  const expected = 20 + pages * 8;
  const left = Math.max(5, expected - seconds);
  return (
    <section className="screen center loading" aria-live="polite" aria-busy="true">
      <div className="scan" aria-hidden="true">
        <div className="scan-paper">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="scan-line" />
      </div>
      <h1 className="title">Even geduld…</h1>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
            <span className="dot">{i < step ? <Icon name="check" size={18} /> : null}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="hint">
        {seconds < expected ? `Nog ongeveer ${left} seconden.` : "Het duurt iets langer dan normaal. Nog even…"}
      </p>
      <button className="btn btn-ghost" onClick={onCancel}>
        Stoppen
      </button>
    </section>
  );
}

function LocalLoading({ progress, onCancel }: { progress: ReadProgress; onCancel: () => void }) {
  const pct = Math.round(((progress.page - 1 + progress.progress) / progress.pages) * 100);
  const loadingProgram = progress.stage === "laden";
  return (
    <section className="screen center loading" aria-live="polite" aria-busy="true">
      <div className="scan" aria-hidden="true">
        <div className="scan-paper">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="scan-line" />
      </div>
      <h1 className="title">{loadingProgram ? "Leesprogramma klaarzetten…" : "Uw brief wordt gelezen…"}</h1>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadingProgram ? undefined : pct}>
        <div className="progress-bar" style={{ width: loadingProgram ? "100%" : `${Math.max(4, pct)}%` }} data-indeterminate={loadingProgram} />
      </div>
      <p className="hint">
        {loadingProgram
          ? "De eerste keer duurt dit iets langer (± 7 MB, één keer downloaden). Daarna gaat het sneller."
          : progress.pages > 1
            ? `Bladzijde ${progress.page} van ${progress.pages}`
            : "Dit duurt meestal 5 tot 20 seconden."}
      </p>
      <p className="hint">
        <Icon name="lock" size={18} /> Dit gebeurt op uw eigen telefoon.
      </p>
      <button className="btn btn-ghost" onClick={onCancel}>
        Stoppen
      </button>
    </section>
  );
}

function PrivacyIntro({ onOk }: { onOk: () => void }) {
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="sheet">
        <h2 id="privacy-title">Zo werkt Briefhulp</h2>
        <ol className="how">
          <li>
            <span className="how-num">1</span>
            <span>U maakt een foto van uw brief.</span>
          </li>
          <li>
            <span className="how-num">2</span>
            <span>Uw telefoon leest de brief en zoekt wat belangrijk is.</span>
          </li>
          <li>
            <span className="how-num">3</span>
            <span>U ziet wat u moet doen en voor wanneer.</span>
          </li>
        </ol>
        <div className="sheet-box">
          <h3>
            <Icon name="lock" size={22} /> Uw gegevens
          </h3>
          <ul>
            <li>Briefhulp is gratis. U heeft geen account nodig.</li>
            <li>Uw brief wordt op uw eigen telefoon gelezen. De foto wordt nergens naartoe gestuurd.</li>
            <li>Wij bewaren niets. Als u de app sluit, is alles weg.</li>
          </ul>
        </div>
        <p className="sheet-warn">
          Briefhulp geeft uitleg, <strong>geen juridisch of financieel advies</strong>. Controleer belangrijke dingen altijd op
          de brief zelf.
        </p>
        <button className="btn btn-primary btn-huge" onClick={onOk}>
          <span>Ik begrijp het</span>
        </button>
        <Link href="/privacy" className="sheet-more">
          Meer over privacy
        </Link>
      </div>
    </div>
  );
}
