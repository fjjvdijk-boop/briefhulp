"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { getDict } from "../lib/i18n";
import { I18nProvider } from "../lib/i18n/context";
import { AllTopics } from "./LegalParts";

const VERSION = "1.0";

function useLang() {
  const [lang, setLang] = useState("nl");
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("briefhulp:prefs:v2") || "{}");
      if (typeof p.lang === "string") setLang(p.lang);
    } catch {
      /* standaard Nederlands */
    }
  }, []);
  const t = getDict(lang);
  useEffect(() => {
    document.documentElement.lang = t.code;
    document.documentElement.dir = t.dir;
    try {
      const p = JSON.parse(localStorage.getItem("briefhulp:prefs:v2") || "{}");
      document.documentElement.classList.toggle("large-text", !!p.largeText);
    } catch {
      /* niets */
    }
  }, [t.code, t.dir]);
  return t;
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useLang();
  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="topbar-btn">
          <Icon name="back" size={24} />
          <span>{t.app.back}</span>
        </Link>
      </header>
      <main className="screen prose">{children}</main>
    </div>
  );
}

export function PrivacyPage() {
  const t = useLang();
  const p = t.privacyPage;
  return (
    <Shell>
      <h1 className="title">{p.title}</h1>
      <p className="lead">{p.lead}</p>
      <h2>{p.shortTitle}</h2>
      <ul>
        {p.short.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h2>{p.aiTitle}</h2>
      <p>{p.ai}</p>
      <h2>{p.feedbackTitle}</h2>
      <p>{p.feedback}</p>
      <h2>{p.adviceTitle}</h2>
      <p>{p.advice}</p>
      <p className="hint">{p.updated}</p>
      <Link href="/" className="btn btn-primary">
        Briefhulp
      </Link>
    </Shell>
  );
}

export function AboutPage() {
  const t = useLang();
  const p = t.aboutPage;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <Shell>
      <div className="about-hero">
        <img src="/icon.svg" alt="" width={72} height={72} />
        <div>
          <h1 className="title">{p.title}</h1>
          <p className="hint">{t.app.tagline}</p>
        </div>
      </div>
      <p className="lead">{p.lead}</p>
      <h2>{p.howTitle}</h2>
      <p>{p.how}</p>
      <h2>{p.forWhoTitle}</h2>
      <p>{p.forWho}</p>
      <h2>{p.a11yTitle}</h2>
      <p>{p.a11y}</p>
      {email && (
        <>
          <h2>{p.contactTitle}</h2>
          <p>
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        </>
      )}
      <p className="hint">
        {p.version} {VERSION} · {t.app.footer}
      </p>
      <Link href="/" className="btn btn-primary">
        Briefhulp
      </Link>
    </Shell>
  );
}

export function RightsPage() {
  const t = useLang();
  return (
    <Shell>
      <I18nProvider lang={t.code} dict={t}>
        <h1 className="title">{t.legal.pageTitle}</h1>
        <p className="lead">{t.legal.pageIntro}</p>
        {t.code !== "nl" && t.code !== "en" && <p className="hint">{t.legal.contentLang}</p>}
        <AllTopics />
        <Link href="/" className="btn btn-primary">
          Briefhulp
        </Link>
      </I18nProvider>
    </Shell>
  );
}
