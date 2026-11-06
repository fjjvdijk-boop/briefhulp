"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { daysUntil, downloadIcs, formatDateLong, googleCalendarUrl } from "../lib/client/calendar";
import { LANGUAGES, type Analysis, type ExplainLanguage, type Urgency } from "../lib/types";

const URGENCY: Record<Urgency, { label: string; icon: string }> = {
  rood: { label: "Snel actie nodig", icon: "alert" },
  oranje: { label: "Actie nodig – u heeft nog tijd", icon: "clock" },
  groen: { label: "Geen haast", icon: "check" },
};

const SPEECH_LANG: Record<ExplainLanguage, string> = {
  nl: "nl-NL",
  en: "en-GB",
  tr: "tr-TR",
  ar: "ar-SA",
  pl: "pl-PL",
  uk: "uk-UA",
  ti: "ti-ER",
  so: "so-SO",
  es: "es-ES",
};

interface Props {
  analysis: Analysis;
  language: ExplainLanguage;
  mode: "lokaal" | "ai" | "demo" | "voorbeeld";
  letterText: string | null;
  onUpgrade?: () => void;
  onNew: () => void;
  onRetakePhoto: () => void;
}

export function Result({ analysis: a, language, mode, letterText, onUpgrade, onNew, onRetakePhoto }: Props) {
  const isExample = mode === "voorbeeld";
  const isDemo = mode === "demo";
  const isLocal = mode === "lokaal";
  const rtl = LANGUAGES.find((l) => l.code === language)?.rtl && (mode === "ai" || mode === "demo");
  const [done, setDone] = useState<boolean[]>(() => a.actions.map(() => false));
  const u = URGENCY[a.urgency.level] ?? URGENCY.oranje;
  const days = a.deadline.date ? daysUntil(a.deadline.date) : null;
  const gcal = googleCalendarUrl(a);
  const [calAdded, setCalAdded] = useState(false);
  const telHref = a.contact.phone ? `tel:${a.contact.phone.replace(/[^\d+]/g, "")}` : null;
  const site = a.contact.website ? (a.contact.website.startsWith("http") ? a.contact.website : `https://${a.contact.website}`) : null;

  const shareText = useMemo(() => buildShareText(a), [a]);

  return (
    <article className="screen result" dir={rtl ? "rtl" : undefined}>
      {(isExample || isDemo) && (
        <p className="demo-banner">
          {isExample ? "Dit is een voorbeeld met een verzonnen brief." : "Demo-modus: dit is een voorbeelduitleg, niet uw eigen brief."}
        </p>
      )}

      {isLocal && (
        <p className="local-banner">
          <Icon name="lock" size={20} />
          <span>
            <strong>Snelle uitleg, gratis.</strong> Gemaakt op uw telefoon met vaste regels. Controleer bedragen en datums altijd op
            de brief zelf.
          </span>
        </p>
      )}

      {!a.is_letter || !a.readable ? (
        <div className="card card-warn" role="alert">
          <h2 className="card-title">
            <Icon name="camera" /> {a.is_letter ? "De foto is niet goed te lezen" : "Dit lijkt geen brief"}
          </h2>
          <p>{a.photo_tip || "Probeer een nieuwe foto te maken. Leg de brief plat neer, bij goed licht."}</p>
          <button className="btn btn-primary" onClick={onRetakePhoto}>
            <Icon name="camera" />
            <span>Nieuwe foto maken</span>
          </button>
        </div>
      ) : null}

      <div className={`urgency urgency-${a.urgency.level}`} role="status">
        <div className="urgency-icon">
          <Icon name={u.icon} size={34} />
        </div>
        <div>
          <p className="urgency-label">{u.label}</p>
          <p className="urgency-reason">{a.urgency.reason}</p>
        </div>
      </div>

      {a.scam_check.suspicious && (
        <div className="card card-scam" role="alert">
          <h2 className="card-title">
            <Icon name="alert" /> Pas op: dit kan een nep-brief zijn
          </h2>
          <ul className="bullets">
            {a.scam_check.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>
            Betaal nog niet. Bel de organisatie zelf, via het nummer op hun officiële website. Twijfelt u? Bel de Fraudehelpdesk:{" "}
            <a href="tel:0887867372">088 - 786 73 72</a>.
          </p>
        </div>
      )}

      {a.photo_tip && a.readable && a.is_letter && (
        <p className="notice">
          <Icon name="info" size={22} /> {a.photo_tip}
        </p>
      )}

      <header className="result-head">
        <p className="sender">
          Van: <strong>{a.sender.name}</strong>
        </p>
        <h1 className="headline">{a.headline}</h1>
        <p className="letter-type">{a.letter_type}</p>
      </header>

      <ReadAloud analysis={a} lang={SPEECH_LANG[mode === "ai" || mode === "demo" ? language : "nl"]} />

      <section className="card">
        <h2 className="card-title">In het kort</h2>
        <p className="summary">{a.summary}</p>
      </section>

      <section className="card card-actions">
        <h2 className="card-title">Wat moet ik doen?</h2>
        <ol className="checklist">
          {a.actions.map((s, i) => (
            <li key={i} className={done[i] ? "is-done" : ""}>
              <button
                className="check"
                role="checkbox"
                aria-checked={done[i]}
                aria-label={`Stap ${i + 1} ${done[i] ? "gedaan" : "nog niet gedaan"}`}
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
        {done.length > 0 && done.every(Boolean) && <p className="all-done">Goed gedaan! Alle stappen zijn klaar.</p>}
      </section>

      {a.deadline.date && days !== null && (
        <section className={`card card-deadline ${days < 0 ? "overdue" : days <= 14 ? "soon" : ""}`}>
          <h2 className="card-title">
            <Icon name="calendar" /> Uiterlijk
          </h2>
          <p className="deadline-date">{formatDateLong(a.deadline.date)}</p>
          <p className="deadline-days">
            {days < 0
              ? `Deze datum is ${Math.abs(days)} ${Math.abs(days) === 1 ? "dag" : "dagen"} geleden. Neem zo snel mogelijk contact op.`
              : days === 0
                ? "Dat is vandaag!"
                : days === 1
                  ? "Dat is morgen!"
                  : `Nog ${days} dagen.`}
          </p>
          {a.deadline.what && <p className="deadline-what">{a.deadline.what}</p>}
          {a.deadline.is_estimate && (
            <p className="hint">Deze datum is uitgerekend. Kijk ook zelf op de brief of hij klopt.</p>
          )}
          {days >= 0 && (
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={() => {
                  downloadIcs(a);
                  setCalAdded(true);
                }}
              >
                <Icon name="calendar" />
                <span>{calAdded ? "Opnieuw in agenda zetten" : "Zet in mijn agenda"}</span>
              </button>
              {gcal && (
                <a className="btn btn-secondary" href={gcal} target="_blank" rel="noopener noreferrer">
                  <span>Google Agenda</span>
                </a>
              )}
            </div>
          )}
          {calAdded && (
            <p className="hint">
              Open het bestand om de afspraak op te slaan. U krijgt 3 dagen en 1 dag van tevoren een herinnering.
            </p>
          )}
        </section>
      )}

      {a.payment.needed && (
        <section className="card card-pay">
          <h2 className="card-title">
            <Icon name="euro" /> Betalen
          </h2>
          {a.payment.amount && <p className="pay-amount">{a.payment.amount}</p>}
          <dl className="pay-grid">
            {a.payment.iban && <CopyRow label="Rekeningnummer (IBAN)" value={a.payment.iban} />}
            {a.payment.to && <CopyRow label="Naam ontvanger" value={a.payment.to} />}
            {a.payment.reference && <CopyRow label="Betalingskenmerk" value={a.payment.reference} important />}
          </dl>
          <p className="hint">Neem het betalingskenmerk precies over. Controleer de gegevens op de brief zelf.</p>
        </section>
      )}

      {a.amounts.length > 0 && (
        <section className="card">
          <h2 className="card-title">Bedragen in de brief</h2>
          <ul className="amounts">
            {a.amounts.map((x, i) => (
              <li key={i}>
                <span>{x.description}</span>
                <strong>{x.amount}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.if_you_do_nothing && (
        <section className="card">
          <h2 className="card-title">Wat gebeurt er als ik niets doe?</h2>
          <p>{a.if_you_do_nothing}</p>
        </section>
      )}

      {a.objection.possible && (
        <section className="card">
          <h2 className="card-title">Bent u het er niet mee eens?</h2>
          {a.objection.how && <p>{a.objection.how}</p>}
          {a.objection.deadline && (
            <p>
              <strong>Termijn:</strong> {a.objection.deadline}
            </p>
          )}
        </section>
      )}

      {(telHref || site || a.contact.email) && (
        <section className="card">
          <h2 className="card-title">Contact met {a.sender.name}</h2>
          <div className="btn-col">
            {telHref && (
              <a className="btn btn-secondary" href={telHref}>
                <Icon name="phone" />
                <span>Bel {a.contact.phone}</span>
              </a>
            )}
            {site && (
              <a className="btn btn-secondary" href={site} target="_blank" rel="noopener noreferrer">
                <Icon name="globe" />
                <span>{a.contact.website}</span>
              </a>
            )}
            {a.contact.email && (
              <a className="btn btn-secondary" href={`mailto:${a.contact.email}`}>
                <span>{a.contact.email}</span>
              </a>
            )}
          </div>
          <p className="hint">Houd de brief bij de hand als u belt. Ze vragen vaak om een nummer van de brief.</p>
        </section>
      )}

      {a.references.length > 0 && (
        <details className="card fold">
          <summary className="card-title">Nummers op de brief</summary>
          <dl className="pay-grid">
            {a.references.map((r, i) => (
              <CopyRow key={i} label={r.label} value={r.value} />
            ))}
          </dl>
        </details>
      )}

      {a.difficult_words.length > 0 && (
        <details className="card fold">
          <summary className="card-title">Moeilijke woorden uitgelegd</summary>
          <dl className="words">
            {a.difficult_words.map((w) => (
              <div key={w.word}>
                <dt>{w.word}</dt>
                <dd>{w.meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {onUpgrade && (
        <section className="card card-upgrade">
          <h2 className="card-title">Wilt u een betere uitleg?</h2>
          <p>Met de volledige uitleg leest slimme software (AI) de hele brief. U krijgt een uitleg in gewone taal, ook in andere talen, en u kunt vragen stellen.</p>
          <p className="hint">Hiervoor wordt de foto beveiligd verstuurd naar Anthropic (Claude). Er wordt niets bewaard.</p>
          <button className="btn btn-primary" onClick={onUpgrade}>
            <span>Volledige uitleg</span>
          </button>
        </section>
      )}

      {letterText && (
        <details className="card fold">
          <summary className="card-title">Tekst van de brief</summary>
          <p className="hint">Zo heeft uw telefoon de brief gelezen. Er kunnen leesfouten in zitten.</p>
          <pre className="letter-text">{letterText}</pre>
        </details>
      )}

      {!isLocal && <AskQuestion analysis={a} language={language} />}

      <section className="card card-help">
        <h2 className="card-title">
          <Icon name="help" /> Hulp nodig?
        </h2>
        <ul className="help-list">
          {a.help.map((h) => (
            <li key={h.name}>
              <strong>{h.name}</strong>
              <span>{h.why}</span>
              {h.contact && <HelpContact text={h.contact} />}
            </li>
          ))}
          {!a.help.some((h) => /juridisch loket/i.test(h.name)) && (
            <li>
              <strong>Het Juridisch Loket</strong>
              <span>Gratis advies als u twijfelt wat u moet doen.</span>
              <HelpContact text="0800 - 8020" />
            </li>
          )}
          <li>
            <strong>Iemand die u vertrouwt</strong>
            <span>Laat de brief en deze uitleg zien aan familie, een buur of het sociaal wijkteam van uw gemeente.</span>
          </li>
        </ul>
      </section>

      <div className="btn-col">
        <ShareButton text={shareText} />
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Icon name="print" />
          <span>Afdrukken</span>
        </button>
        <button className="btn btn-primary" onClick={onNew}>
          <Icon name="camera" />
          <span>Nog een brief uitleggen</span>
        </button>
      </div>

      <p className="disclaimer">
        {isLocal ? "Deze uitleg is automatisch gemaakt met vaste regels en kan fouten of missende informatie bevatten." : "Deze uitleg is gemaakt door een computer en kan fouten bevatten."} Het is geen juridisch of financieel advies. Bij twijfel
        geldt altijd wat er in de brief zelf staat. Uw foto en deze uitleg worden niet door ons bewaard: als u op &quot;Nog een
        brief&quot; drukt of de app sluit, zijn ze weg.
      </p>
    </article>
  );
}

function HelpContact({ text }: { text: string }) {
  const phone = /^[\d\s\-+()]{8,}$/.test(text.trim());
  const web = /^[\w.-]+\.(nl|com|org|eu)(\/\S*)?$/i.test(text.trim());
  if (phone)
    return (
      <a className="help-link" href={`tel:${text.replace(/[^\d+]/g, "")}`}>
        <Icon name="phone" size={20} /> {text}
      </a>
    );
  if (web)
    return (
      <a className="help-link" href={`https://${text.trim()}`} target="_blank" rel="noopener noreferrer">
        <Icon name="globe" size={20} /> {text}
      </a>
    );
  return <span className="help-contact">{text}</span>;
}

function CopyRow({ label, value, important }: { label: string; value: string; important?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s+/g, label.toLowerCase().includes("iban") ? "" : " ").trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* kopiëren niet toegestaan */
    }
  };
  return (
    <div className={`copy-row ${important ? "important" : ""}`}>
      <dt>{label}</dt>
      <dd>
        <span className="mono">{value}</span>
        <button className="copy-btn" onClick={copy} aria-label={`${label} kopiëren`}>
          <Icon name={copied ? "check" : "copy"} size={22} />
          <span>{copied ? "Gekopieerd" : "Kopieer"}</span>
        </button>
      </dd>
    </div>
  );
}

function ReadAloud({ analysis: a, lang }: { analysis: Analysis; lang: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const parts = [
      a.headline,
      a.summary,
      lang.startsWith("nl") ? "Wat moet u doen?" : "",
      ...a.actions.map((s, i) => `${i + 1}. ${s.step}. ${s.detail ?? ""}`),
      a.deadline.date && lang.startsWith("nl") ? `Uiterlijk ${formatDateLong(a.deadline.date)}.` : "",
    ].filter(Boolean);
    synth.cancel();
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
    parts.forEach((text, i) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      if (voice) utt.voice = voice;
      utt.rate = 0.9;
      if (i === parts.length - 1) utt.onend = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      synth.speak(utt);
    });
    setSpeaking(true);
  };

  return (
    <button className={`btn btn-listen ${speaking ? "on" : ""}`} onClick={toggle} aria-pressed={speaking}>
      <Icon name={speaking ? "stop" : "speaker"} />
      <span>{speaking ? "Stop met voorlezen" : "Lees voor"}</span>
    </button>
  );
}

const SUGGESTIONS = ["Wat als ik niet kan betalen?", "Moet ik dit echt doen?", "Wie kan mij helpen?"];

function AskQuestion({ analysis, language }: { analysis: Analysis; language: ExplainLanguage }) {
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
        body: JSON.stringify({ analysis, question: text, language, history }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.answer) throw new Error(json.error || "Er ging iets mis. Probeer het opnieuw.");
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
      <h2 className="card-title">Heeft u nog een vraag?</h2>
      {history.length === 0 && (
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="chat">
        {history.map((h, i) => (
          <div key={i} className="chat-pair">
            <p className="bubble me">{h.q}</p>
            <p className="bubble bot">{h.a}</p>
          </div>
        ))}
        {busy && <p className="bubble bot typing" aria-label="Antwoord wordt geschreven"><i /><i /><i /></p>}
        <div ref={endRef} />
      </div>
      {err && <p className="notice" role="alert">{err}</p>}
      <form
        className="ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="vraag" className="sr-only">
          Uw vraag
        </label>
        <input
          id="vraag"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Typ uw vraag…"
          maxLength={600}
          enterKeyHint="send"
          autoComplete="off"
        />
        <button type="submit" className="send" disabled={busy || !q.trim()} aria-label="Vraag versturen">
          <Icon name="send" size={26} />
        </button>
      </form>
    </section>
  );
}

function ShareButton({ text }: { text: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Uitleg van mijn brief", text });
      } else {
        await navigator.clipboard.writeText(text);
        setMsg("De uitleg is gekopieerd. U kunt hem nu plakken in WhatsApp of een e-mail.");
      }
    } catch {
      /* geannuleerd */
    }
  };
  return (
    <>
      <button className="btn btn-secondary" onClick={share}>
        <Icon name="share" />
        <span>Deel met iemand die u helpt</span>
      </button>
      {msg && <p className="hint">{msg}</p>}
    </>
  );
}

function buildShareText(a: Analysis) {
  const lines = [
    `📄 Brief van ${a.sender.name}`,
    a.headline,
    "",
    a.summary,
    "",
    "Wat moet ik doen?",
    ...a.actions.map((s, i) => `${i + 1}. ${s.step}`),
  ];
  if (a.deadline.date) lines.push("", `⏰ Uiterlijk: ${formatDateLong(a.deadline.date)}`);
  if (a.payment.needed) {
    lines.push("", `💶 Betalen: ${a.payment.amount ?? ""}`);
    if (a.payment.iban) lines.push(`IBAN: ${a.payment.iban}`);
    if (a.payment.to) lines.push(`Naam: ${a.payment.to}`);
    if (a.payment.reference) lines.push(`Kenmerk: ${a.payment.reference}`);
  }
  lines.push("", "(Uitleg door Briefhulp – geen juridisch of financieel advies)");
  return lines.join("\n");
}
