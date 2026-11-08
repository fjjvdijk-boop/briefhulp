"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { ReplySheetButton } from "./ReplyLetter";
import { useI18n } from "../lib/i18n/context";
import { formatDateLong, daysUntil } from "../lib/client/calendar";
import { collectLinks, epcPayload, officialSite, paymentSafe } from "../lib/client/pay";
import { CHECKED, TOPICS, topicById, type Topic, type TopicId } from "../lib/legal/topics";
import { disagreeRoute } from "../lib/legal/route";
import { useLegalText } from "../lib/legal/i18n";
import type { Analysis } from "../lib/types";

/* ---------------------------------------------------------------------------------------------
 * Betaalhulp: betaallinks/QR op de brief (gecontroleerd), officiële website, EPC-betaal-QR.
 * ------------------------------------------------------------------------------------------- */
export function PayHelp({ analysis: a, letterText, qrCodes }: { analysis: Analysis; letterText: string | null; qrCodes: string[] }) {
  const { t } = useI18n();
  const g = t.legal;
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const safe = paymentSafe(a);
  const site = officialSite(a);
  const links = collectLinks(letterText ?? "", qrCodes, a);
  const payload = safe ? epcPayload(a) : null;

  useEffect(() => {
    if (!showQr || !payload) return;
    import("qrcode").then((QR) =>
      QR.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 2, width: 260 }).then(setQrSvg).catch(() => setQrSvg(null)),
    );
  }, [showQr, payload]);

  if (!a.payment.needed) return null;
  if (!safe) {
    return (
      <section className="card card-scam" role="alert">
        <h2 className="card-title">
          <Icon name="alert" /> {g.payNowTitle}
        </h2>
        <p>{g.notSafe}</p>
      </section>
    );
  }
  if (!site && !links.length && !payload) return null;

  return (
    <section className="card card-paynow">
      <h2 className="card-title">
        <Icon name="euro" /> {g.payNowTitle}
      </h2>

      {links.map((l) => (
        <div key={l.url} className={`pay-link status-${l.status}`}>
          <p className="pay-link-head">
            <Icon name={l.status === "onbekend" ? "alert" : "check"} size={20} />
            <strong>{g.payLinkTitle}</strong> <span className="hint">({l.source === "qr" ? g.fromQr : g.fromText})</span>
          </p>
          <p className="mono pay-link-host" dir="ltr">
            {l.host}
          </p>
          <p className="hint">{l.status === "afzender" ? g.linkSender : l.status === "bank" ? g.linkBank : g.linkUnknown}</p>
          {l.status !== "onbekend" && (
            <a className="btn btn-primary" href={l.url} target="_blank" rel="noopener noreferrer nofollow">
              <Icon name="globe" /> <span>{g.open}</span>
            </a>
          )}
        </div>
      ))}

      {site && (
        <div className="pay-official">
          <p>{g.officialText(site.name)}</p>
          <a className="btn btn-secondary" href={site.url} target="_blank" rel="noopener noreferrer">
            <Icon name="globe" /> <span>{g.openSite}</span>
          </a>
        </div>
      )}

      {payload && (
        <div className="pay-qr">
          {!showQr ? (
            <button className="btn btn-ghost" onClick={() => setShowQr(true)}>
              <Icon name="frame" /> <span>{g.showQr}</span>
            </button>
          ) : (
            <>
              <h3>{g.payQrTitle}</h3>
              {qrSvg && <div className="qr-box" role="img" aria-label={g.payQrTitle} dangerouslySetInnerHTML={{ __html: qrSvg }} />}
              <p className="hint">{g.payQrText}</p>
              <p className="hint">{g.payQrNote}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------
 * "Ik ben het er niet mee eens": stappenplan bij deze brief, met datum en knop naar de brief.
 * ------------------------------------------------------------------------------------------- */
export function DisagreePlan({ analysis: a, typeKey }: { analysis: Analysis; typeKey: string }) {
  const { t, locale } = useI18n();
  const lt = useLegalText();
  const g = t.legal;
  const route = disagreeRoute(a, typeKey);
  return (
    <section className="card card-route">
      <h2 className="card-title">
        <Icon name="help" /> {g.disagreeTitle}
      </h2>
      <p>{lt.tx(route.intro)}</p>
      {lt.fallback && <p className="hint">{g.contentLang}</p>}
      <ol className="route-steps" lang={lt.lang}>
        {route.steps.map((st, i) => {
          const days = st.deadline ? daysUntil(st.deadline) : null;
          return (
            <li key={i}>
              <span className="route-dot" aria-hidden="true" />
              <div>
                <h3>{lt.tx(st.title)}</h3>
                <p>{lt.tx(st.text)}</p>
                {st.deadline && days !== null && days >= 0 && (
                  <p className={`route-deadline ${days <= 14 ? "soon" : ""}`}>
                    <Icon name="calendar" size={18} /> {g.by(formatDateLong(st.deadline, locale))}
                    {st.deadlineEstimated && <span className="hint"> · {g.estimatedNote}</span>}
                  </p>
                )}
                {st.reply && <ReplySheetButton analysis={a} kind={st.reply} label={g.writeLetter} />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Rechten: uitklapbare onderwerpen uit de kennisbank, met bronnen.
 * ------------------------------------------------------------------------------------------- */
export function TopicCard({ topic, open }: { topic: Topic; open?: boolean }) {
  const { t, locale } = useI18n();
  const lt = useLegalText();
  const g = t.legal;
  const pts = lt.list(topic.points);
  return (
    <details className="topic" open={open}>
      <summary>
        <span>{lt.tx(topic.title)}</span>
      </summary>
      <div className="topic-body" lang={lt.lang}>
        <p>{lt.tx(topic.summary)}</p>
        <ul className="bullets">
          {pts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="topic-where-title">{g.where}</p>
        <ul className="topic-where">
          {topic.where.map((w) => (
            <li key={w.name}>
              <strong>{lt.name(w.name)}</strong>
              {w.contact && /\d/.test(w.contact) ? (
                <a href={`tel:${w.contact.replace(/[^\d+]/g, "")}`} dir="ltr">
                  {" "}
                  {w.contact}
                </a>
              ) : w.contact ? (
                <span> – {w.contact}</span>
              ) : null}
              {w.url && (
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="topic-link" dir="ltr">
                  {w.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className="topic-sources">
          {g.sources}:{" "}
          {topic.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && " · "}
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          . {g.checked(formatDateLong(CHECKED, locale))}
        </p>
      </div>
    </details>
  );
}

export function RightsList({ ids }: { ids: TopicId[] }) {
  const { t } = useI18n();
  const lt = useLegalText();
  const g = t.legal;
  return (
    <section className="card card-rights">
      <h2 className="card-title">
        <Icon name="info" /> {g.rightsTitle}
      </h2>
      <p className="hint">{g.rightsIntro}</p>
      {lt.fallback && <p className="hint">{g.contentLang}</p>}
      <div className="topics">
        {ids.map((id) => (
          <TopicCard key={id} topic={topicById(id)} />
        ))}
      </div>
      <Link href="/rechten" className="btn btn-ghost">
        <span>{g.allRights}</span>
      </Link>
      <p className="hint legal-note">{g.legalNote}</p>
    </section>
  );
}

export function AllTopics() {
  const { t } = useI18n();
  const g = t.legal;
  const groups = Object.keys(g.groups) as (keyof typeof g.groups)[];
  return (
    <>
      {groups.map((gr) => (
        <section key={gr} className="topic-group">
          <h2>{g.groups[gr]}</h2>
          <div className="topics">
            {TOPICS.filter((x) => x.group === gr).map((x) => (
              <TopicCard key={x.id} topic={x} />
            ))}
          </div>
        </section>
      ))}
      <p className="hint legal-note">{g.legalNote}</p>
    </>
  );
}
