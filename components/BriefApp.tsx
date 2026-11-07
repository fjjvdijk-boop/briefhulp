"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { Result } from "./Result";
import { LanguageScreen } from "./LanguageScreen";
import { FileProblem, preparePage, type PreparedPage } from "../lib/client/image";
import { daysUntil, formatDateLong, localToday } from "../lib/client/calendar";
import { loadDeadlines, removeDeadline, saveDeadline, type SavedDeadline } from "../lib/client/deadlines";
import { readLetter, type ReadProgress } from "../lib/client/ocr";
import { explainLocally } from "../lib/client/rules";
import { sampleLetterText } from "../lib/sample";
import { getDict, locale as toLocale } from "../lib/i18n";
import { I18nProvider, useI18n } from "../lib/i18n/context";
import type { Analysis } from "../lib/types";

type Screen = "language" | "welcome" | "home" | "pages" | "loading" | "result" | "error";
export type ResultMode = "lokaal" | "ai" | "demo" | "voorbeeld";

const MAX_PAGES = 6;
const PREF_KEY = "briefhulp:prefs:v2";

interface Prefs {
  lang: string | null;
  onboarded: boolean;
  largeText: boolean;
  installDismissed: boolean;
}

function loadPrefs(): Prefs {
  const fallback: Prefs = { lang: null, onboarded: false, largeText: false, installDismissed: false };
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

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function BriefApp() {
  const [prefs, setPrefs] = useState<Prefs>({ lang: null, onboarded: true, largeText: false, installDismissed: true });
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [busyFile, setBusyFile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mode, setMode] = useState<ResultMode>("lokaal");
  const [typeKey, setTypeKey] = useState<string>("");
  const [letterText, setLetterText] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const [lastRun, setLastRun] = useState<"lokaal" | "ai">("lokaal");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<SavedDeadline[]>([]);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lang = prefs.lang ?? "nl";
  const t = getDict(lang);
  const uiLang = t.code === "en" && lang !== "en" ? "en" : lang;
  const loc = toLocale(uiLang);

  // ---------- Opstarten ----------
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    setDeadlines(loadDeadlines());
    if (!p.lang) setScreen("language");
    else if (!p.onboarded) setScreen("welcome");
    setReady(true);

    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setAiAvailable(Boolean(j.ai)))
      .catch(() => setAiAvailable(false));

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* zonder service worker werkt alles ook */
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", prefs.largeText);
  }, [prefs.largeText]);

  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.documentElement.dir = t.dir;
  }, [uiLang, t.dir]);

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
      setScreen((s) => {
        if (s === "language" && !prefs.lang) return s;
        if (s === "result" || s === "error" || s === "loading") return pages.length ? "pages" : "home";
        return "home";
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pages.length, prefs.lang]);

  const go = (s: Screen) => {
    if (s !== "home") window.history.pushState({ s }, "");
    setScreen(s);
    window.scrollTo({ top: 0 });
  };

  // ---------- Foto's ----------
  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNotice(null);
    setBusyFile(true);
    const added: PreparedPage[] = [];
    const replacing = replaceRef.current;
    replaceRef.current = null;
    try {
      for (const f of Array.from(files)) {
        if (!replacing && pages.length + added.length >= MAX_PAGES) {
          setNotice(t.pages.max(MAX_PAGES));
          break;
        }
        added.push(await preparePage(f));
        if (replacing) break;
      }
    } catch (e) {
      setNotice(e instanceof FileProblem ? t.pages[e.code] : t.pages.cannotOpen);
    } finally {
      setBusyFile(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
    if (added.length) {
      setPages((p) => (replacing ? p.map((x) => (x.id === replacing ? added[0] : x)) : [...p, ...added]));
      if (screen !== "pages") go("pages");
    }
  };

  const retakePage = (id: string) => {
    replaceRef.current = id;
    cameraRef.current?.click();
  };

  // ---------- GRATIS: lezen en uitleggen op de telefoon zelf ----------
  const readFree = useCallback(async () => {
    if (pages.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErrorKey(null);
    setLastRun("lokaal");
    setProgress({ stage: "laden", page: 1, pages: pages.length, progress: 0 });
    go("loading");
    try {
      const { text, confidence } = await readLetter(pages, (p) => {
        if (!ctrl.signal.aborted) setProgress(p);
      });
      if (ctrl.signal.aborted) return;
      const r = explainLocally(text, confidence, localToday(), t, loc);
      setAnalysis(r.analysis);
      setTypeKey(r.typeKey);
      setLetterText(r.text);
      setMode("lokaal");
      setScreen("result");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.error(e);
      setErrorKey(navigator.onLine === false ? "firstOffline" : "read");
      setScreen("error");
    } finally {
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, lang]);

  // ---------- BETAALD (optioneel): volledige uitleg met AI ----------
  const analyseAI = useCallback(async () => {
    if (pages.length === 0) return;
    setLastRun("ai");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErrorKey(null);
    go("loading");
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages.map(({ mediaType, data }) => ({ mediaType, data })),
          language: lang,
          today: localToday(),
        }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.analysis) throw new Error(json.error || "");
      setAnalysis(json.analysis);
      setTypeKey(json.analysis?.sender?.type ?? "");
      setMode(json.demo ? "demo" : "ai");
      setScreen("result");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErrorKey(navigator.onLine === false ? "offline" : (e as Error).message || "generic");
      setScreen("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, lang]);

  const showExample = () => {
    const r = explainLocally(sampleLetterText(), 96, localToday(), t, loc);
    setAnalysis(r.analysis);
    setTypeKey(r.typeKey);
    setLetterText(r.text);
    setMode("voorbeeld");
    go("result");
  };

  const startOver = () => {
    abortRef.current?.abort();
    setPages([]); // foto's direct uit het geheugen
    setAnalysis(null);
    setLetterText(null);
    setNotice(null);
    setErrorKey(null);
    setScreen("home");
    window.scrollTo({ top: 0 });
  };

  const chooseLanguage = (code: string) => {
    const wasResult = screen === "language" && analysis;
    updatePrefs({ lang: code });
    if (!prefs.onboarded) setScreen("welcome");
    else if (wasResult && mode !== "ai" && mode !== "demo" && letterText) {
      // De gratis uitleg meteen opnieuw maken in de nieuwe taal.
      const nt = getDict(code);
      const r = explainLocally(letterText, 96, localToday(), nt, toLocale(nt.code === "en" && code !== "en" ? "en" : code));
      setAnalysis(r.analysis);
      setScreen("result");
    } else setScreen(analysis ? "result" : pages.length ? "pages" : "home");
    window.scrollTo({ top: 0 });
  };

  const errorText =
    errorKey && errorKey in t.error ? (t.error as Record<string, string>)[errorKey] : errorKey || t.error.generic;
  const onboardingScreen = screen === "language" || screen === "welcome";

  if (!ready) return <div className="app" aria-busy="true" />;

  return (
    <I18nProvider lang={lang}>
      <div className="app">
        {/* Verborgen bestand-kiezers. capture="environment" opent direct de achtercamera. */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} />

        <header className="topbar">
          {screen === "home" || onboardingScreen ? (
            <div className="brand">
              <img src="/icon.svg" alt="" width={40} height={40} />
              <span>
                Briefhulp
                <small>{t.app.tagline}</small>
              </span>
            </div>
          ) : (
            <button className="topbar-btn" onClick={() => (screen === "result" ? startOver() : window.history.back())}>
              <Icon name="back" size={24} />
              <span>{screen === "result" ? t.app.newLetter : t.app.back}</span>
            </button>
          )}
          <div className="topbar-right">
            {prefs.lang && screen !== "language" && (
              <button className="topbar-btn" onClick={() => go("language")} aria-label={t.app.language}>
                <Icon name="globe" size={22} />
                <span className="lang-code">{lang.toUpperCase()}</span>
              </button>
            )}
            <button
              className={`topbar-btn ${prefs.largeText ? "on" : ""}`}
              onClick={() => updatePrefs({ largeText: !prefs.largeText })}
              aria-pressed={prefs.largeText}
              aria-label={prefs.largeText ? t.app.smallerLabel : t.app.biggerLabel}
            >
              <Icon name="text" size={24} />
            </button>
          </div>
        </header>

        <main id="main">
          {screen === "language" && <LanguageScreen current={prefs.lang} aiAvailable={aiAvailable} onChoose={chooseLanguage} />}

          {screen === "welcome" && (
            <Welcome
              onStart={() => {
                updatePrefs({ onboarded: true });
                setScreen("home");
                window.scrollTo({ top: 0 });
              }}
            />
          )}

          {screen === "home" && (
            <section className="screen home">
              <h1 className="hero-title">
                {t.home.title1}
                <br />
                <span>{t.home.title2}</span>
              </h1>
              <p className="hero-sub">{t.home.sub}</p>

              <button className="btn btn-primary btn-huge" onClick={() => cameraRef.current?.click()} disabled={busyFile}>
                <Icon name="camera" size={40} />
                <span>{busyFile ? t.home.wait : t.home.takePhoto}</span>
              </button>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={busyFile}>
                <Icon name="image" />
                <span>{t.home.choose}</span>
              </button>

              {notice && (
                <p className="notice" role="alert">
                  {notice}
                </p>
              )}

              {deadlines.length > 0 && <MyDeadlines items={deadlines} onDone={(id) => setDeadlines(removeDeadline(id))} />}

              {!prefs.installDismissed && (installEvent || isIos) && (
                <div className="card card-install">
                  <h2 className="card-title">
                    <Icon name="plus" /> {t.home.installTitle}
                  </h2>
                  <p>{isIos && !installEvent ? t.home.installIos : t.home.installText}</p>
                  <div className="btn-row">
                    {installEvent && (
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          await installEvent.prompt();
                          setInstallEvent(null);
                          updatePrefs({ installDismissed: true });
                        }}
                      >
                        <span>{t.home.installButton}</span>
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => updatePrefs({ installDismissed: true })}>
                      <span>{t.home.later}</span>
                    </button>
                  </div>
                </div>
              )}

              <ul className="promise">
                {[t.home.promise1, t.home.promise2, t.home.promise3].map((p) => (
                  <li key={p}>
                    <Icon name="check" size={22} /> {p}
                  </li>
                ))}
              </ul>

              <div className="privacy-mini">
                <Icon name="lock" size={22} />
                <p>
                  {t.home.privacyMini} <Link href="/privacy">{t.home.privacyMore}</Link>.
                </p>
              </div>

              <button className="link-btn" onClick={showExample}>
                {t.home.example}
              </button>
            </section>
          )}

          {screen === "pages" && (
            <section className="screen">
              <h1 className="title">{pages.length === 1 ? t.pages.one : t.pages.many(pages.length)}</h1>
              <p className="lead">{t.pages.lead}</p>

              <ol className="thumbs">
                {pages.map((p, i) => {
                  const q = p.quality;
                  const warn = q && (q.dark ? t.pages.tooDark : q.blurry ? t.pages.blurry : q.small ? t.pages.tooSmall : null);
                  return (
                    <li key={p.id} className={`thumb-wrap ${warn ? "has-warn" : ""}`}>
                      <div className="thumb">
                        {p.preview ? (
                          <img src={p.preview} alt={t.pages.page(i + 1)} />
                        ) : (
                          <div className="thumb-pdf">
                            PDF<small>{p.name}</small>
                          </div>
                        )}
                        <span className="thumb-num">{i + 1}</span>
                        <button
                          className="thumb-remove"
                          onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))}
                          aria-label={t.pages.remove(i + 1)}
                        >
                          <Icon name="trash" size={22} />
                        </button>
                      </div>
                      {warn && (
                        <div className="thumb-warn" role="status">
                          <p>
                            <Icon name="alert" size={18} /> {warn}
                          </p>
                          <button className="small-btn" onClick={() => retakePage(p.id)}>
                            <Icon name="camera" size={18} /> {t.pages.retake}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {pages.some((p) => p.quality && (p.quality.dark || p.quality.blurry || p.quality.small)) && (
                <p className="hint">{t.pages.qualityAdvice}</p>
              )}
              {notice && (
                <p className="notice" role="alert">
                  {notice}
                </p>
              )}

              {pages.length === 0 ? (
                <button className="btn btn-primary btn-huge" onClick={() => cameraRef.current?.click()}>
                  <Icon name="camera" size={40} />
                  <span>{t.home.takePhoto}</span>
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-huge" onClick={readFree}>
                    <Icon name="check" size={36} />
                    <span>{t.pages.explain}</span>
                  </button>
                  {pages.length < MAX_PAGES && (
                    <button className="btn btn-secondary" onClick={() => cameraRef.current?.click()} disabled={busyFile}>
                      <Icon name="plus" />
                      <span>{busyFile ? t.home.wait : t.pages.add}</span>
                    </button>
                  )}
                </>
              )}
              <p className="hint">
                <Icon name="lock" size={18} /> {t.pages.freeHint}
              </p>
              <details className="tips">
                <summary>{t.pages.tipsTitle}</summary>
                <ul>
                  {t.pages.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          {screen === "loading" &&
            (progress ? (
              <LocalLoading progress={progress} onCancel={() => window.history.back()} />
            ) : (
              <AiLoading pages={pages.length} onCancel={() => window.history.back()} />
            ))}

          {screen === "error" && (
            <section className="screen center">
              <div className="error-icon">
                <Icon name="alert" size={56} />
              </div>
              <h1 className="title">{t.error.title}</h1>
              <p className="lead">{errorText}</p>
              <button className="btn btn-primary btn-huge" onClick={lastRun === "ai" ? analyseAI : readFree}>
                <span>{t.error.retry}</span>
              </button>
              <button className="btn btn-secondary" onClick={startOver}>
                <span>{t.error.startOver}</span>
              </button>
            </section>
          )}

          {screen === "result" && analysis && (
            <Result
              analysis={analysis}
              mode={mode}
              typeKey={typeKey}
              letterText={letterText}
              onUpgrade={aiAvailable && mode === "lokaal" && pages.length > 0 ? analyseAI : undefined}
              onNew={startOver}
              onSaveDeadline={(d) => setDeadlines(saveDeadline(d))}
              savedDeadlines={deadlines}
              onRetakePhoto={() => {
                setPages([]);
                setAnalysis(null);
                setScreen("home");
                setTimeout(() => cameraRef.current?.click(), 50);
              }}
            />
          )}
        </main>

        {!onboardingScreen && (
          <footer className="footer">
            <p>
              <strong>{t.app.attention}</strong> {t.app.footer}
            </p>
            <p className="footer-links">
              <Link href="/privacy">{t.app.privacy}</Link>
              <span aria-hidden="true">·</span>
              <Link href="/over">{t.app.about}</Link>
              <span aria-hidden="true">·</span>
              <button className="link-btn small" onClick={() => go("language")}>
                {t.app.language}
              </button>
            </p>
          </footer>
        )}
      </div>
    </I18nProvider>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <section className="screen welcome">
      <div className="welcome-hero">
        <img src="/icon.svg" alt="" width={88} height={88} />
        <h1 className="title">{t.onboarding.welcome}</h1>
        <p className="lead">{t.onboarding.intro}</p>
      </div>
      <ol className="how">
        {[t.onboarding.step1, t.onboarding.step2, t.onboarding.step3].map((s, i) => (
          <li key={s}>
            <span className="how-num">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="pillars">
        {[
          { icon: "euro", title: t.onboarding.freeTitle, text: t.onboarding.freeText },
          { icon: "lock", title: t.onboarding.privateTitle, text: t.onboarding.privateText },
          { icon: "info", title: t.onboarding.adviceTitle, text: t.onboarding.adviceText },
        ].map((p) => (
          <div className="pillar" key={p.title}>
            <Icon name={p.icon} />
            <div>
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-huge" onClick={onStart}>
        <span>{t.onboarding.start}</span>
      </button>
      <Link href="/privacy" className="sheet-more">
        {t.home.privacyMore}
      </Link>
    </section>
  );
}

function MyDeadlines({ items, onDone }: { items: SavedDeadline[]; onDone: (id: string) => void }) {
  const { t, locale } = useI18n();
  return (
    <section className="card card-deadlines">
      <h2 className="card-title">
        <Icon name="calendar" /> {t.home.myDeadlines}
      </h2>
      <ul className="deadline-list">
        {items.map((d) => {
          const days = daysUntil(d.date);
          const when =
            days < 0 ? t.result.daysAgo(-days).split(".")[0] : days === 0 ? t.result.today : days === 1 ? t.result.tomorrow : t.result.daysLeft(days);
          return (
            <li key={d.id} className={days < 0 ? "overdue" : days <= 14 ? "soon" : ""}>
              <div>
                <strong>{d.what}</strong>
                <span>{d.sender}</span>
                <span className="dl-date">
                  {formatDateLong(d.date, locale)} · {when}
                  {d.amount ? ` · ${d.amount}` : ""}
                </span>
              </div>
              <button className="chip-btn" onClick={() => onDone(d.id)} aria-label={t.home.doneLabel(d.what)}>
                <Icon name="check" size={20} /> {t.home.done}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        <Icon name="lock" size={16} /> {t.home.onlyThisPhone}
      </p>
    </section>
  );
}

function LocalLoading({ progress, onCancel }: { progress: ReadProgress; onCancel: () => void }) {
  const { t } = useI18n();
  const pct = Math.round(((progress.page - 1 + progress.progress) / progress.pages) * 100);
  const preparing = progress.stage === "laden";
  return (
    <section className="screen center loading" aria-live="polite" aria-busy="true">
      <ScanArt />
      <h1 className="title">{preparing ? t.loading.preparing : t.loading.reading}</h1>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={preparing ? undefined : pct}>
        <div className="progress-bar" style={{ width: preparing ? "100%" : `${Math.max(4, pct)}%` }} data-indeterminate={preparing} />
      </div>
      <p className="hint">
        {preparing ? t.loading.firstTime : progress.pages > 1 ? t.loading.pageOf(progress.page, progress.pages) : t.loading.usually}
      </p>
      <p className="hint">
        <Icon name="lock" size={18} /> {t.loading.onPhone}
      </p>
      <button className="btn btn-ghost" onClick={onCancel}>
        {t.app.stop}
      </button>
    </section>
  );
}

function AiLoading({ pages, onCancel }: { pages: number; onCancel: () => void }) {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const per = 6 + pages * 2;
  const step = Math.min(t.loading.aiSteps.length - 1, Math.floor(seconds / per));
  const expected = 20 + pages * 8;
  return (
    <section className="screen center loading" aria-live="polite" aria-busy="true">
      <ScanArt />
      <h1 className="title">{t.loading.wait}</h1>
      <ol className="steps">
        {t.loading.aiSteps.map((s, i) => (
          <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
            <span className="dot">{i < step ? <Icon name="check" size={18} /> : null}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="hint">{seconds < expected ? t.loading.aiLeft(Math.max(5, expected - seconds)) : t.loading.aiLonger}</p>
      <button className="btn btn-ghost" onClick={onCancel}>
        {t.app.stop}
      </button>
    </section>
  );
}

function ScanArt() {
  return (
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
  );
}
