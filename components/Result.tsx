"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { ReplyCard } from "./ReplyLetter";
import { DisagreePlan, PayHelp, RightsList } from "./LegalParts";
import { disagreeReplies, paymentReplies } from "../lib/client/reply";
import { relevantTopics } from "../lib/legal/route";
import { daysUntil, downloadIcs, formatDateLong, googleCalendarUrl } from "../lib/client/calendar";
import type { SavedDeadline } from "../lib/client/deadlines";
import { useI18n } from "../lib/i18n/context";
import { isRtl } from "../lib/i18n";
import type { Dict } from "../lib/i18n/nl";
import type { Analysis, Urgency } from "../lib/types";
import { isSpeaking, letterToSpeech, loadVoices, onSpeechChange, speak, stopSpeech } from "../lib/client/speech";

const URGENCY_ICON: Record<Urgency, string> = { rood: "alert", oranje: "clock", groen: "check" };
type Tab = "overview" | "pay" | "disagree" | "help";
const TAB_ICON: Record<Tab, string> = { overview: "check", pay: "euro", disagree: "help", help: "phone" };

interface Props {
  analysis: Analysis;
  mode: "lokaal" | "ai" | "demo" | "voorbeeld";
  typeKey: string;
  letterText: string | null;
  qrCodes?: string[];
  onUpgrade?: () => void;
  onNew: () => void;
  onRetakePhoto: () => void;
  onSaveDeadline: (d: Omit<SavedDeadline, "id" | "savedAt">) => void;
  savedDeadlines: SavedDeadline[];
}

export function Result({ analysis: a, mode, typeKey, letterText, qrCodes = [], onUpgrade, onNew, onRetakePhoto, onSaveDeadline, savedDeadlines }: Props) {
  const { t, lang, locale } = useI18n();
  const isExample = mode === "voorbeeld";
  const isDemo = mode === "demo";
  const isLocal = mode === "lokaal" || mode === "voorbeeld";
  // AI-uitleg kan in elke taal zijn; de gratis uitleg is in de taal van de app.
  const contentRtl = isLocal ? t.dir === "rtl" : isRtl(lang);
  const [done, setDone] = useState<boolean[]>(() => a.actions.map(() => false));
  useEffect(() => setDone(a.actions.map(() => false)), [a]);
  const level: Urgency = a.urgency.level in URGENCY_ICON ? a.urgency.level : "oranje";
  const days = a.deadline.date ? daysUntil(a.deadline.date) : null;
  const gcal = googleCalendarUrl(a, t);
  const [calAdded, setCalAdded] = useState(false);
  const telHref = a.contact.phone ? `tel:${a.contact.phone.replace(/[^\d+]/g, "")}` : null;
  const site = a.contact.website ? (a.contact.website.startsWith("http") ? a.contact.website : `https://${a.contact.website}`) : null;
  const shareText = useMemo(() => buildShareText(a, t, locale), [a, t, locale]);
  const isSaved = savedDeadlines.some((d) => d.date === a.deadline.date && d.sender === a.sender.name);
  const tabs: Tab[] = ["overview", ...(a.payment.needed ? (["pay"] as Tab[]) : []), "disagree", "help"];
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => setTab("overview"), [a]);

  return (
    <article className="screen result">
      <div className="result-notes">
        {(isExample || isDemo) && <span className="note-pill note-yellow">{isExample ? t.result.exampleBanner : t.result.demoBanner}</span>}
        {isLocal && (
          <details className="note-pill note-green">
            <summary>
              <Icon name="lock" size={16} /> {t.result.localBanner}
            </summary>
            <span>{t.result.localBannerText}</span>
          </details>
        )}
      </div>

      {!a.is_letter || !a.readable ? (
        <div className="card card-warn" role="alert">
          <h2 className="card-title">
            <Icon name="camera" /> {a.is_letter ? t.result.unreadable : t.result.notLetter}
          </h2>
          <p>{a.photo_tip || t.result.unreadableTip}</p>
          <button className="btn btn-primary" onClick={onRetakePhoto}>
            <Icon name="camera" />
            <span>{t.result.retake}</span>
          </button>
        </div>
      ) : null}

      <section className={`summary-card u-${level}`} aria-labelledby="headline">
        <div className="summary-strip" role="status">
          <span className="strip-icon">
            <Icon name={URGENCY_ICON[level]} size={22} />
          </span>
          <div dir={contentRtl ? "rtl" : undefined}>
            <strong>{t.result.urgency[level]}</strong>
            <span>{a.urgency.reason}</span>
          </div>
        </div>
        <div className="summary-body" dir={contentRtl ? "rtl" : undefined}>
          <div className="sender-row">
            <span className="avatar" aria-hidden="true">
              {initials(a.sender.name)}
            </span>
            <div>
              <span className="sender-label">{t.result.from}</span>
              <strong dir="auto">{a.sender.name.replace(/\s*\(namens .*\)$/, "")}</strong>
              {/\(namens (.*)\)$/.test(a.sender.name) && (
                <span className="sender-label" dir="auto">
                  {a.sender.name.match(/\((namens .*)\)$/)![1]}
                </span>
              )}
            </div>
          </div>
          <h1 className="headline" id="headline">
            {a.headline}
          </h1>
          <p className="letter-type">{a.letter_type}</p>
          {(a.payment.needed && a.payment.amount) || (a.deadline.date && days !== null) ? (
            <div className="facts">
              {a.payment.needed && a.payment.amount && (
                <div className="fact">
                  <span className="fact-label">
                    <Icon name="euro" size={16} /> {t.result.pay}
                  </span>
                  <strong className="fact-value">{a.payment.amount}</strong>
                </div>
              )}
              {a.deadline.date && days !== null && (
                <div className={`fact ${days <= 14 ? "fact-urgent" : ""}`}>
                  <span className="fact-label">
                    <Icon name="calendar" size={16} /> {t.result.deadline}
                  </span>
                  <strong className="fact-value">{shortDate(a.deadline.date, locale)}</strong>
                  <span className="fact-sub">
                    {days < 0 ? t.result.daysAgo(-days).split(".")[0] : days === 0 ? t.result.today : days === 1 ? t.result.tomorrow : t.result.daysLeft(days)}
                  </span>
                </div>
              )}
            </div>
          ) : null}
          <ReadAloud
            label={t.result.readAloud}
            stopLabel={t.result.stopReading}
            lang={isLocal ? t.code : lang}
            parts={[
              a.headline,
              a.summary,
              t.result.whatToDo,
              ...a.actions.map((s, i) => `${i + 1}. ${s.step.replace(/[.!?]?$/, ".")} ${s.detail ?? ""}`),
              a.deadline.date ? `${t.result.deadline}: ${formatDateLong(a.deadline.date, locale)}.` : "",
            ]}
          />
        </div>
      </section>

      {a.scam_check.suspicious && (
        <div className="card card-scam" role="alert">
          <h2 className="card-title">
            <Icon name="alert" /> {t.result.scamTitle}
          </h2>
          <ul className="bullets" dir={contentRtl ? "rtl" : undefined}>
            {a.scam_check.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>
            {t.result.scamAdvice} <a href="tel:0887867372">088 - 786 73 72</a>.
          </p>
        </div>
      )}

      {a.photo_tip && a.readable && a.is_letter && (
        <p className="notice">
          <Icon name="info" size={22} /> {a.photo_tip}
        </p>
      )}

      <nav className="tabs" role="tablist" aria-label={t.result.inShort}>
        {tabs.map((k) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls="tabpanel"
            className={`tab ${tab === k ? "on" : ""}`}
            onClick={() => {
              setTab(k);
              document.getElementById("tabpanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Icon name={TAB_ICON[k]} size={20} />
            <span>{t.tabs[k]}</span>
          </button>
        ))}
      </nav>
      <div id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="tabpanel">

      {tab === "overview" && (
      <section className="card" dir={contentRtl ? "rtl" : undefined}>
        <h2 className="card-title">{t.result.inShort}</h2>
        <p className="summary">{a.summary}</p>
      </section>
      )}

      {tab === "overview" && (
      <section className="card card-actions">
        <h2 className="card-title">{t.result.whatToDo}</h2>
        <ol className="checklist" dir={contentRtl ? "rtl" : undefined}>
          {a.actions.map((s, i) => (
            <li key={i} className={done[i] ? "is-done" : ""}>
              <button
                className="check"
                role="checkbox"
                aria-checked={!!done[i]}
                aria-label={t.result.stepLabel(i + 1, !!done[i])}
                onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              >
                {done[i] ? <Icon name="check" size={26} /> : <span>{i + 1}</span>}
              </button>
              <div>
                <p className="step">{s.step}</p>
                {s.detail && <p className="step-detail">{s.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
        {done.length > 0 && done.every(Boolean) && <p className="all-done">{t.result.allDone}</p>}
      </section>
      )}

      {tab === "overview" && a.deadline.date && days !== null && (
        <section className={`card card-deadline ${days < 0 ? "overdue" : days <= 14 ? "soon" : ""}`}>
          <h2 className="card-title">
            <Icon name="calendar" /> {t.result.deadline}
          </h2>
          <p className="deadline-date">{formatDateLong(a.deadline.date, locale)}</p>
          <p className="deadline-days">
            {days < 0 ? t.result.daysAgo(-days) : days === 0 ? t.result.today : days === 1 ? t.result.tomorrow : t.result.daysLeft(days)}
          </p>
          {a.deadline.what && <p className="deadline-what">{a.deadline.what}</p>}
          {a.deadline.is_estimate && <p className="hint">{t.result.estimated}</p>}
          {days >= 0 && (
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={() => {
                  downloadIcs(a, t);
                  setCalAdded(true);
                }}
              >
                <Icon name="calendar" />
                <span>{calAdded ? t.result.addAgain : t.result.addCalendar}</span>
              </button>
              {gcal && (
                <a className="btn btn-secondary" href={gcal} target="_blank" rel="noopener noreferrer">
                  <span>{t.result.googleCalendar}</span>
                </a>
              )}
            </div>
          )}
          {calAdded && <p className="hint">{t.result.calendarHint}</p>}
          {days >= 0 && !isExample && (
            <div className="save-deadline">
              <button
                className={`btn btn-ghost ${isSaved ? "saved" : ""}`}
                disabled={isSaved}
                onClick={() =>
                  onSaveDeadline({
                    sender: a.sender.name,
                    what: a.deadline.what || t.result.actionNeeded,
                    date: a.deadline.date!,
                    amount: a.payment.needed ? a.payment.amount : null,
                  })
                }
              >
                <Icon name={isSaved ? "check" : "plus"} />
                <span>{isSaved ? t.result.savedDeadline : t.result.saveDeadline}</span>
              </button>
              <p className="hint">
                <Icon name="lock" size={16} /> {t.result.saveNote}
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "pay" && a.payment.needed && (
        <section className="card card-pay">
          <h2 className="card-title">
            <Icon name="euro" /> {t.result.pay}
          </h2>
          {a.payment.amount && <p className="pay-amount">{a.payment.amount}</p>}
          <dl className="pay-grid">
            {a.payment.iban && <CopyRow label={t.result.iban} value={a.payment.iban} iban verified={a.checks?.ibanValid ? t.result.ibanChecked : undefined} />}
            {a.payment.to && <CopyRow label={t.result.to} value={a.payment.to} />}
            {a.payment.reference && <CopyRow label={t.result.reference} value={a.payment.reference} important />}
          </dl>
          <p className="hint">{t.result.payHint}</p>
        </section>
      )}

      {tab === "pay" && a.amounts.length > 0 && (
        <section className="card">
          <h2 className="card-title">{t.result.amounts}</h2>
          {a.checks?.sumOk && (
            <p className="verified">
              <Icon name="check" size={18} /> {t.result.sumChecked}
            </p>
          )}
          <ul className="amounts">
            {a.amounts.map((x, i) => (
              <li key={i}>
                <span dir="auto">{x.description}</span>
                <strong>{x.amount}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "overview" && a.if_you_do_nothing && (
        <section className="card" dir={contentRtl ? "rtl" : undefined}>
          <h2 className="card-title">{t.result.ifNothing}</h2>
          <p>{a.if_you_do_nothing}</p>
        </section>
      )}

      {tab === "disagree" && a.objection.possible && (
        <section className="card" dir={contentRtl ? "rtl" : undefined}>
          <h2 className="card-title">{t.result.objection}</h2>
          {a.objection.how && <p>{a.objection.how}</p>}
          {a.objection.deadline && (
            <p>
              <strong>{t.result.term}</strong> {a.objection.deadline}
            </p>
          )}
        </section>
      )}

      {tab === "help" && (telHref || site || a.contact.email) && (
        <section className="card">
          <h2 className="card-title">{t.result.contact(a.sender.name)}</h2>
          <div className="btn-col">
            {telHref && (
              <a className="btn btn-secondary" href={telHref}>
                <Icon name="phone" />
                <span dir="ltr">{t.result.call(a.contact.phone!)}</span>
              </a>
            )}
            {site && (
              <a className="btn btn-secondary" href={site} target="_blank" rel="noopener noreferrer">
                <Icon name="globe" />
                <span dir="ltr">{a.contact.website}</span>
              </a>
            )}
            {a.contact.email && (
              <a className="btn btn-secondary" href={`mailto:${a.contact.email}`}>
                <span dir="ltr">{a.contact.email}</span>
              </a>
            )}
          </div>
          <p className="hint">{t.result.contactHint}</p>
        </section>
      )}

      {tab === "help" && a.references.length > 0 && (
        <details className="card fold">
          <summary className="card-title">{t.result.refs}</summary>
          <dl className="pay-grid">
            {a.references.map((r, i) => (
              <CopyRow key={i} label={r.label} value={r.value} />
            ))}
          </dl>
        </details>
      )}

      {tab === "overview" && a.difficult_words.length > 0 && (
        <details className="card fold">
          <summary className="card-title">{t.result.words}</summary>
          <dl className="words" dir={contentRtl ? "rtl" : undefined}>
            {a.difficult_words.map((w) => (
              <div key={w.word}>
                <dt lang="nl" dir="ltr">
                  {w.word}
                </dt>
                <dd>{w.meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {tab === "pay" && a.readable && <PayHelp analysis={a} letterText={letterText} qrCodes={qrCodes} />}
      {tab === "pay" && a.readable && (
        <ReplyCard analysis={a} kinds={paymentReplies(a, typeKey)} title={t.legal.cantPayTitle} intro={t.legal.cantPayText} />
      )}
      {tab === "disagree" && <DisagreePlan analysis={a} typeKey={typeKey} />}
      {tab === "disagree" && a.readable && <ReplyCard analysis={a} kinds={disagreeReplies(a, typeKey)} title={t.legal.lettersTitle} />}
      {tab === "help" && <RightsList ids={relevantTopics(a, typeKey)} />}

      {tab === "overview" && onUpgrade && (
        <section className="card card-upgrade">
          <h2 className="card-title">{t.result.upgradeTitle}</h2>
          <p>{t.result.upgradeText}</p>
          <p className="hint">{t.result.upgradePrivacy}</p>
          <button className="btn btn-primary" onClick={onUpgrade}>
            <span>{t.result.upgradeButton}</span>
          </button>
        </section>
      )}

      {tab === "help" && letterText && (
        <details className="card fold">
          <summary className="card-title">{t.result.letterText}</summary>
          <p className="hint">{t.result.letterTextHint}</p>
          <ReadAloud label={t.result.readLetter} stopLabel={t.result.stopReading} lang="nl" parts={[letterText]} letter small />
          <pre className="letter-text" lang="nl" dir="ltr">
            {letterText}
          </pre>
        </details>
      )}

      {tab === "help" && (mode === "ai" || mode === "demo") && <AskQuestion analysis={a} />}

      {tab === "help" && (
      <section className="card card-help">
        <h2 className="card-title">
          <Icon name="help" /> {t.result.help}
        </h2>
        <ul className="help-list" dir={contentRtl ? "rtl" : undefined}>
          {a.help.map((h) => (
            <li key={h.name}>
              <strong>{h.name}</strong>
              <span>{h.why}</span>
              {h.contact && <HelpContact text={h.contact} />}
            </li>
          ))}
          {!a.help.some((h) => /juridisch loket/i.test(h.name)) && (
            <li>
              <strong>{t.result.jlName}</strong>
              <span>{t.result.jlWhy}</span>
              <HelpContact text="0800 - 8020" />
            </li>
          )}
          <li>
            <strong>{t.result.trustedName}</strong>
            <span>{t.result.trustedWhy}</span>
          </li>
        </ul>
      </section>
      )}

      </div>

      {!isExample && <Feedback mode={mode} senderType={a.sender.type} typeKey={typeKey} urgency={level} />}

      <div className="btn-col">
        <ShareButton text={shareText} />
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Icon name="print" />
          <span>{t.result.print}</span>
        </button>
        <button className="btn btn-primary" onClick={onNew}>
          <Icon name="camera" />
          <span>{t.result.another}</span>
        </button>
      </div>

      <p className="disclaimer">
        {isLocal ? t.result.disclaimerLocal : t.result.disclaimerAI} {t.result.disclaimerEnd}
      </p>
    </article>
  );
}

function initials(name: string) {
  const generic = /^(incassobureau|incasso|gemeente|waterschap|dienst|stichting|gerechtsdeurwaarder|deurwaarderskantoor|zorgverzekeraar|b\.?v\.?|n\.?v\.?|de|het|van|der|en|&)$/i;
  const words = name
    .replace(/\(.*\)/, "")
    .split(/[\s,/-]+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w) && !generic.test(w));
  const pick = words.length ? words : name.split(/\s+/);
  return ((pick[0]?.[0] ?? "?") + (pick[1]?.[0] ?? "")).toUpperCase();
}

function shortDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "long" });
}

function HelpContact({ text }: { text: string }) {
  const phone = /^[\d\s\-+()]{8,}$/.test(text.trim());
  const web = /^[\w.-]+\.(nl|com|org|eu)(\/\S*)?$/i.test(text.trim());
  if (phone)
    return (
      <a className="help-link" href={`tel:${text.replace(/[^\d+]/g, "")}`} dir="ltr">
        <Icon name="phone" size={20} /> {text}
      </a>
    );
  if (web)
    return (
      <a className="help-link" href={`https://${text.trim()}`} target="_blank" rel="noopener noreferrer" dir="ltr">
        <Icon name="globe" size={20} /> {text}
      </a>
    );
  return <span className="help-contact">{text}</span>;
}

function CopyRow({ label, value, important, iban, verified }: { label: string; value: string; important?: boolean; iban?: boolean; verified?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(iban ? value.replace(/\s+/g, "") : value.replace(/\s+/g, " ").trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* kopiëren niet toegestaan */
    }
  };
  return (
    <div className={`copy-row ${important ? "important" : ""}`}>
      <dt>
        {label}
        {verified && (
          <span className="verified inline">
            <Icon name="check" size={16} /> {verified}
          </span>
        )}
      </dt>
      <dd>
        <span className="mono" dir="ltr">
          {value}
        </span>
        <button className="copy-btn" onClick={copy} aria-label={t.result.copyLabel(label)}>
          <Icon name={copied ? "check" : "copy"} size={22} />
          <span>{copied ? t.result.copied : t.result.copy}</span>
        </button>
      </dd>
    </div>
  );
}

function ReadAloud({ label, stopLabel, lang, parts, small, letter }: { label: string; stopLabel: string; lang: string; parts: string[]; small?: boolean; letter?: boolean }) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const idRef = useRef<number | null>(null);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
    loadVoices(); // alvast laden, dan start het voorlezen direct
    const off = onSpeechChange((cur) => setActive(cur !== null && cur === idRef.current));
    return () => {
      off();
      if (isSpeaking(idRef.current)) stopSpeech();
    };
  }, []);
  useEffect(() => setNoVoice(false), [lang]);
  if (!supported) return null;

  const toggle = () => {
    if (active) return stopSpeech();
    setNoVoice(false);
    const list = letter ? parts.flatMap((p) => letterToSpeech(p)) : parts;
    idRef.current = speak(list, { lang, onNoVoice: () => setNoVoice(true) });
    setActive(isSpeaking(idRef.current));
  };

  return (
    <>
      <button className={`btn btn-listen ${active ? "on" : ""} ${small ? "btn-small" : ""}`} onClick={toggle} aria-pressed={active}>
        <Icon name={active ? "stop" : "speaker"} />
        <span>{active ? stopLabel : label}</span>
      </button>
      {noVoice && (
        <p className="hint no-voice" role="status">
          {t.result.noVoice}
        </p>
      )}
    </>
  );
}

function Feedback({ mode, senderType, typeKey, urgency }: { mode: string; senderType: string; typeKey: string; urgency: string }) {
  const { t, lang } = useI18n();
  const [sent, setSent] = useState(false);
  const send = (good: boolean) => {
    setSent(true);
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ good, mode, sender: senderType, type: typeKey, urgency, lang }),
    }).catch(() => {
      /* geen internet: niet erg */
    });
  };
  return (
    <section className="feedback" aria-live="polite">
      {sent ? (
        <p>
          <Icon name="check" size={20} /> {t.result.feedbackThanks}
        </p>
      ) : (
        <>
          <p>{t.result.feedbackQ}</p>
          <div className="feedback-btns">
            <button className="chip-btn" onClick={() => send(true)}>
              👍 {t.result.yes}
            </button>
            <button className="chip-btn" onClick={() => send(false)}>
              👎 {t.result.no}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function AskQuestion({ analysis }: { analysis: Analysis }) {
  const { t, lang } = useI18n();
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/vraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, question: text, language: lang, history }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.answer) throw new Error(json.error || t.error.generic);
      setHistory((h) => [...h, { q: text, a: json.answer }]);
      setQ("");
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card card-ask">
      <h2 className="card-title">{t.result.askTitle}</h2>
      {history.length === 0 && (
        <div className="chips">
          {t.result.suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="chat">
        {history.map((h, i) => (
          <div key={i} className="chat-pair">
            <p className="bubble me" dir="auto">
              {h.q}
            </p>
            <p className="bubble bot" dir="auto">
              {h.a}
            </p>
          </div>
        ))}
        {busy && (
          <p className="bubble bot typing" aria-label={t.result.typing}>
            <i />
            <i />
            <i />
          </p>
        )}
        <div ref={endRef} />
      </div>
      {err && (
        <p className="notice" role="alert">
          {err}
        </p>
      )}
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="vraag" className="sr-only">
          {t.result.askLabel}
        </label>
        <input
          id="vraag"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.result.askPlaceholder}
          maxLength={600}
          enterKeyHint="send"
          autoComplete="off"
          dir="auto"
        />
        <button type="submit" className="send" disabled={busy || !q.trim()} aria-label={t.result.askSend}>
          <Icon name="send" size={26} />
        </button>
      </form>
    </section>
  );
}

function ShareButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: t.result.shareTitle, text });
      } else {
        await navigator.clipboard.writeText(text);
        setMsg(t.result.shareCopied);
      }
    } catch {
      /* geannuleerd */
    }
  };
  return (
    <>
      <button className="btn btn-secondary" onClick={share}>
        <Icon name="share" />
        <span>{t.result.share}</span>
      </button>
      {msg && <p className="hint">{msg}</p>}
    </>
  );
}

function buildShareText(a: Analysis, t: Dict, locale: string) {
  const lines = [`📄 ${t.result.shareHeader(a.sender.name)}`, a.headline, "", a.summary, "", t.result.whatToDo, ...a.actions.map((s, i) => `${i + 1}. ${s.step}`)];
  if (a.deadline.date) lines.push("", `⏰ ${t.result.shareDeadline}: ${formatDateLong(a.deadline.date, locale)}`);
  if (a.payment.needed) {
    lines.push("", `💶 ${t.result.pay}: ${a.payment.amount ?? ""}`);
    if (a.payment.iban) lines.push(`IBAN: ${a.payment.iban}`);
    if (a.payment.to) lines.push(`${t.result.to}: ${a.payment.to}`);
    if (a.payment.reference) lines.push(`${t.result.reference}: ${a.payment.reference}`);
  }
  lines.push("", t.result.shareFooter);
  return lines.join("\n");
}
