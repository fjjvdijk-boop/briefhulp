"use client";

import { isNative, shareText } from "../lib/client/platform";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n/context";
import { buildReply, loadMe, replySubject, saveMe, type ReplyInput, type ReplyKind } from "../lib/client/reply";
import type { Analysis } from "../lib/types";

/** Kaart met brieven die Briefhulp kan maken (de keuzes worden meegegeven). */
export function ReplyCard({ analysis, kinds, title, intro }: { analysis: Analysis; kinds: ReplyKind[]; title?: string; intro?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<ReplyKind | null>(null);
  if (kinds.length === 0) return null;
  return (
    <section className="card card-reply">
      <h2 className="card-title">
        <Icon name="send" /> {title ?? t.reply.title}
      </h2>
      <p className="hint">{intro ?? t.reply.intro}</p>
      <div className="reply-kinds">
        {kinds.map((k) => (
          <button key={k} className="reply-kind" onClick={() => setOpen(k)}>
            <strong>{t.reply.kinds[k].title}</strong>
            <span>{t.reply.kinds[k].text}</span>
          </button>
        ))}
      </div>
      {open && <ReplySheet kind={open} analysis={analysis} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Kleine knop die direct één soort brief opent. */
export function ReplySheetButton({ analysis, kind, label }: { analysis: Analysis; kind: ReplyKind; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="small-btn primary" onClick={() => setOpen(true)}>
        <Icon name="send" size={18} /> {label}
      </button>
      {open && <ReplySheet kind={kind} analysis={analysis} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReplySheet({ kind, analysis, onClose }: { kind: ReplyKind; analysis: Analysis; onClose: () => void }) {
  const { t } = useI18n();
  const r = t.reply;
  const [input, setInput] = useState<ReplyInput>({ name: "", address: "", postcode: "", phone: "", monthly: "", reason: "" });
  const [remember, setRemember] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const me = loadMe();
    if (me.name) {
      setInput((i) => ({ ...i, ...me }));
      setRemember(true);
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const letter = useMemo(() => buildReply(kind, analysis, input, analysis.letter_date), [kind, analysis, input]);
  const subject = replySubject(kind, analysis);
  const set = (k: keyof ReplyInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInput((i) => ({ ...i, [k]: e.target.value }));

  const done = () => {
    saveMe(input, remember);
    onClose();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* niet toegestaan */
    }
  };
  const share = async () => {
    try {
      if (!(await shareText(letter, subject))) await copy();
    } catch {
      /* geannuleerd */
    }
  };
  const print = () => {
    document.body.classList.add("print-reply");
    const off = () => {
      document.body.classList.remove("print-reply");
      window.removeEventListener("afterprint", off);
    };
    window.addEventListener("afterprint", off);
    window.print();
    setTimeout(off, 1500);
  };
  const mailto = analysis.contact.email
    ? `mailto:${analysis.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="reply-title" onClick={(e) => e.target === e.currentTarget && done()}>
      <div className="sheet reply-sheet">
        <div className="reply-head">
          <h2 id="reply-title">{r.kinds[kind].title}</h2>
          <button className="cam-btn dark" onClick={done} aria-label={r.close}>
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className="form-grid">
          <Field label={r.name} value={input.name} onChange={set("name")} autoComplete="name" />
          <Field label={r.address} value={input.address} onChange={set("address")} autoComplete="street-address" />
          <Field label={r.postcode} value={input.postcode} onChange={set("postcode")} autoComplete="postal-code" />
          <Field label={r.phone} value={input.phone} onChange={set("phone")} autoComplete="tel" type="tel" />
          {kind === "regeling" && <Field label={r.monthly} value={input.monthly} onChange={set("monthly")} inputMode="decimal" />}
          <label className="field">
            <span>{r.reason}</span>
            <textarea value={input.reason} onChange={set("reason")} rows={3} placeholder={r.reasonHint} lang="nl" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>{r.remember}</span>
          </label>
        </div>

        <h3 className="reply-preview-title">{r.preview}</h3>
        <p className="hint">{r.dutchNote}</p>
        <pre className="reply-letter" lang="nl" dir="ltr">
          {letter}
        </pre>
        <p className="notice">
          <Icon name="info" size={20} /> <span>{r.check}</span>
        </p>

        <div className="reply-actions">
          <button className="btn btn-primary" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} />
            <span>{copied ? r.copied : r.copy}</span>
          </button>
          <button className="btn btn-secondary" onClick={share}>
            <Icon name="share" />
            <span>{r.share}</span>
          </button>
          <a className="btn btn-secondary" href={mailto}>
            <Icon name="send" />
            <span>{r.email}</span>
          </a>
          {!isNative() && (
            <button className="btn btn-ghost" onClick={print}>
              <Icon name="print" />
              <span>{r.print}</span>
            </button>
          )}
        </div>
        <p className="hint">{r.sendTip}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...rest} />
    </label>
  );
}
