"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n/context";
import { decide, frameRect, measure, type Hint, type Rect } from "../lib/client/framing";

interface Props {
  onCapture: (file: File) => void;
  onFallback: () => void; // gewone camera-app gebruiken
  onClose: () => void;
}

const SAMPLE_W = 180; // breedte van het verkleinde beeld voor de analyse
const GOOD_NEEDED = 4; // aantal goede metingen op rij voor automatische foto (± 1,2 s)
const TOP_SPACE = 136;
const BOTTOM_SPACE = 150;

type TorchTrack = Omit<MediaStreamTrack, "getCapabilities"> & { getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean } };

export function CameraScreen({ onCapture, onFallback, onClose }: Props) {
  const { t } = useI18n();
  const c = t.camera;
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);
  const goodRef = useRef(0);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "live" | "denied" | "unsupported" | "review">("starting");
  const [hint, setHint] = useState<Hint>("aim");
  const [good, setGood] = useState(0);
  const [frame, setFrame] = useState<Rect | null>(null);
  const [torch, setTorch] = useState<{ available: boolean; on: boolean }>({ available: false, on: false });
  const [auto, setAuto] = useState(true);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [flash, setFlash] = useState(false);

  // ---------- Camera starten ----------
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setStatus("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        const track = stream.getVideoTracks()[0] as unknown as TorchTrack;
        const caps = track.getCapabilities?.();
        setTorch({ available: !!caps?.torch, on: false });
        // Scherpstellen op dichtbij, als de camera dat kan
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
        } catch {
          /* niet ondersteund */
        }
        setStatus("live");
      } catch (e) {
        const name = (e as DOMException).name;
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, []);

  // ---------- Kader berekenen (en bij draaien van het scherm opnieuw) ----------
  useEffect(() => {
    const update = () => {
      const el = boxRef.current;
      if (el) setFrame(frameRect(el.clientWidth, el.clientHeight, TOP_SPACE, BOTTOM_SPACE));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /** Rekent een rechthoek op het scherm om naar pixels in het camerabeeld (video staat op object-fit: cover). */
  const toVideo = useCallback((r: Rect) => {
    const v = videoRef.current!;
    const cw = v.clientWidth;
    const ch = v.clientHeight;
    const s = Math.max(cw / v.videoWidth, ch / v.videoHeight);
    const ox = (cw - v.videoWidth * s) / 2;
    const oy = (ch - v.videoHeight * s) / 2;
    return { x: (r.x - ox) / s, y: (r.y - oy) / s, w: r.w / s, h: r.h / s };
  }, []);

  // ---------- Foto maken: bijsnijden tot het kader (met een klein randje) ----------
  const capture = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !frame || busyRef.current || !v.videoWidth) return;
    busyRef.current = true;
    const margin = 0.04;
    const r = toVideo({
      x: frame.x - frame.w * margin,
      y: frame.y - frame.h * margin,
      w: frame.w * (1 + 2 * margin),
      h: frame.h * (1 + 2 * margin),
    });
    const sx = Math.max(0, r.x);
    const sy = Math.max(0, r.y);
    const sw = Math.min(v.videoWidth - sx, r.w);
    const sh = Math.min(v.videoHeight - sy, r.h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    canvas.getContext("2d")!.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    navigator.vibrate?.(40);
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (blob) {
      setShot({ url: URL.createObjectURL(blob), blob });
      setStatus("review");
    }
    busyRef.current = false;
    goodRef.current = 0;
    setGood(0);
  }, [frame, toVideo]);

  // ---------- Live analyse, ± 3 keer per seconde ----------
  useEffect(() => {
    if (status !== "live" || !frame) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const timer = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth || busyRef.current) return;
      const cw = v.clientWidth;
      const ch = v.clientHeight;
      const scale = SAMPLE_W / cw;
      const W = SAMPLE_W;
      const H = Math.round(ch * scale);
      canvas.width = W;
      canvas.height = H;
      // Precies het zichtbare deel van de video tekenen
      const vis = toVideo({ x: 0, y: 0, w: cw, h: ch });
      ctx.drawImage(v, vis.x, vis.y, vis.w, vis.h, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);
      const gray = new Uint8ClampedArray(W * H);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) gray[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      const m = measure(gray, W, H, { x: frame.x * scale, y: frame.y * scale, w: frame.w * scale, h: frame.h * scale }, prevRef.current);
      prevRef.current = gray;
      const h = decide(m);
      setHint(h);
      if (h === "good") {
        goodRef.current += 1;
        setGood(goodRef.current);
        if (auto && goodRef.current >= GOOD_NEEDED) capture();
      } else {
        goodRef.current = 0;
        setGood(0);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [status, frame, auto, capture, toVideo]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ available: true, on });
    } catch {
      setTorch({ available: false, on: false });
    }
  };

  const retry = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setStatus("live");
  };

  const use = () => {
    if (!shot) return;
    const file = new File([shot.blob], `brief-${Date.now()}.jpg`, { type: "image/jpeg" });
    URL.revokeObjectURL(shot.url);
    onCapture(file);
  };

  const hintText =
    hint === "tooDark"
      ? torch.available && !torch.on
        ? c.tooDarkTorch
        : c.tooDark
      : hint === "holdStill"
        ? c.holdStill
        : hint === "closer"
          ? c.closer
          : hint === "further"
            ? c.further
            : hint === "good"
              ? c.good
              : c.aim;
  const ok = hint === "good";
  const progress = auto ? Math.min(1, good / GOOD_NEEDED) : 0;

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="camera-stage" ref={boxRef}>
        <video ref={videoRef} className="camera-video" playsInline muted autoPlay />

        {status === "live" && frame && (
          <>
            <div
              className={`camera-frame ${ok ? "ok" : "warn"}`}
              style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
              aria-hidden="true"
            >
              <i className="c tl" />
              <i className="c tr" />
              <i className="c bl" />
              <i className="c br" />
              <div className="camera-paper-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
            <p className={`camera-hint ${ok ? "ok" : ""}`} role="status" aria-live="polite">
              <Icon name={ok ? "check" : hint === "tooDark" ? "sun" : hint === "holdStill" ? "hand" : "frame"} size={22} />
              <span>{hintText}</span>
            </p>
          </>
        )}

        {status === "starting" && <p className="camera-center">{c.starting}</p>}

        {(status === "denied" || status === "unsupported") && (
          <div className="camera-center camera-problem">
            <Icon name="camera" size={48} />
            <p>{status === "denied" ? c.denied : c.noCamera}</p>
            <button className="btn btn-primary" onClick={onFallback}>
              <Icon name="camera" />
              <span>{c.useCameraApp}</span>
            </button>
          </div>
        )}

        {status === "review" && shot && (
          <div className="camera-review">
            <p className="camera-review-q">{c.review}</p>
            <img src={shot.url} alt="" />
          </div>
        )}

        {flash && <div className="camera-flash" aria-hidden="true" />}
      </div>

      {/* Bovenbalk */}
      <div className="camera-top">
        <button className="cam-btn" onClick={onClose} aria-label={c.close}>
          <Icon name="close" size={26} />
        </button>
        <span className="camera-title">{c.title}</span>
        <div className="camera-top-right">
          {status === "live" && (
            <button className={`auto-toggle ${auto ? "on" : ""}`} onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
              {auto ? c.autoOn : c.autoOff}
            </button>
          )}
          {status === "live" && torch.available && (
            <button className={`cam-btn ${torch.on ? "on" : ""}`} onClick={toggleTorch} aria-pressed={torch.on} aria-label={torch.on ? c.torchOff : c.torchOn}>
              <Icon name="sun" size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Onderbalk */}
      <div className="camera-bottom">
        {status === "review" ? (
          <div className="camera-review-btns">
            <button className="btn btn-ghost cam-ghost" onClick={retry}>
              <Icon name="back" />
              <span>{c.retry}</span>
            </button>
            <button className="btn btn-primary" onClick={use}>
              <Icon name="check" />
              <span>{c.use}</span>
            </button>
          </div>
        ) : status === "live" ? (
          <>
            <button className={`shutter ${ok ? "ok" : ""}`} onClick={capture} aria-label={c.shutter}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" className="ring-bg" />
                <circle cx="50" cy="50" r="46" className="ring" style={{ strokeDashoffset: 289 * (1 - progress) }} />
              </svg>
              <span className="shutter-dot" />
            </button>
            <p className="camera-tip">{c.tip}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
