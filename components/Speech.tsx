"use client";

// Voorlezen op het scherm: de spelerbalk onderin en de kleine voorleesknop op elke kaart.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n/context";
import {
  dismissNoVoice,
  getSpeechState,
  isSpeaking,
  onSpeechState,
  pauseSpeech,
  resumeSpeech,
  skipSpeech,
  speak,
  speechSupported,
  stopSpeech,
  toggleSlow,
  type SpeechState,
} from "../lib/client/speech";
import { readableLang, readableText } from "../lib/client/readable";
import { isRtl } from "../lib/i18n";

function useSpeechState(): SpeechState {
  const [s, setS] = useState<SpeechState>(() => getSpeechState());
  useEffect(() => onSpeechState(setS), []);
  return s;
}

/**
 * Spelerbalk onderin zolang er wordt voorgelezen: de zin die nu klinkt (groot, om mee te lezen),
 * vorige zin, pauze/verder, langzamer en stoppen.
 */
export function SpeechBar() {
  const { t } = useI18n();
  const s = useSpeechState();
  // Tijdens het voorlezen ruimte onderin de pagina, zodat de balk niets bedekt
  useEffect(() => {
    document.documentElement.classList.toggle("speech-bar-open", s.id !== null);
    return () => document.documentElement.classList.remove("speech-bar-open");
  }, [s.id]);

  if (s.noVoice && s.id === null)
    return (
      <div className="speech-bar speech-bar-msg" role="status">
        <p>{t.result.noVoice}</p>
        <button className="btn btn-ghost btn-small" onClick={dismissNoVoice}>
          <Icon name="close" size={20} />
          <span>{t.reply.close}</span>
        </button>
      </div>
    );
  if (s.id === null) return null;
  const slow = s.rate < 0.95;
  return (
    <div className="speech-bar" role="region" aria-label={t.result.readAloud}>
      <p className="speech-now" lang={s.lang} dir={isRtl(s.lang) ? "rtl" : "ltr"} aria-live="off">
        {s.current || "…"}
      </p>
      <div className="speech-controls">
        <button className="speech-btn" onClick={() => skipSpeech(-1)} disabled={s.index === 0} aria-label={t.result.prevSentence}>
          <Icon name="prev" size={22} />
        </button>
        <button
          className="speech-btn speech-main"
          onClick={() => (s.paused ? resumeSpeech() : pauseSpeech())}
          aria-label={s.paused ? t.result.resume : t.result.pause}
        >
          <Icon name={s.paused ? "play" : "pause"} size={26} />
          <span>{s.paused ? t.result.resume : t.result.pause}</span>
        </button>
        <button className={`speech-btn ${slow ? "on" : ""}`} onClick={toggleSlow} aria-pressed={slow} aria-label={t.result.slower}>
          <span aria-hidden="true">🐢</span>
          <span className="speech-btn-label">{t.result.slower}</span>
        </button>
        <button className="speech-btn" onClick={stopSpeech} aria-label={t.result.stopReading}>
          <Icon name="stop" size={22} />
        </button>
      </div>
      {s.total > 0 && <p className="speech-progress">{t.result.sentenceOf(s.index + 1, s.total)}</p>}
    </div>
  );
}

/**
 * Kleine voorleesknop in de titel van een kaart: leest precies wat er op die kaart staat.
 * Nog een keer tikken = stoppen.
 */
export function SpeakCard({ label }: { label?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const [id, setId] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);
  const s = useSpeechState();
  useEffect(() => setSupported(speechSupported()), []);
  if (!supported) return null;
  const active = isSpeaking(id) && s.id === id;
  const onClick = () => {
    if (active) return stopSpeech();
    const card = ref.current?.closest(".card, .topic, .screen, .speak-root");
    if (!card) return;
    const lines = readableText(card);
    if (!lines.length) return;
    setId(speak(lines, { lang: readableLang(card), label: label ?? lines[0].replace(/\.$/, "") }));
  };
  return (
    <button
      ref={ref}
      type="button"
      className={`speak-card ${active ? "on" : ""}`}
      onClick={(e) => {
        e.preventDefault(); // in een <summary>: niet open- of dichtklappen
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={active ? t.result.stopReading : t.result.readThis}
      title={active ? t.result.stopReading : t.result.readThis}
    >
      <Icon name={active ? "stop" : "speaker"} size={20} />
    </button>
  );
}
