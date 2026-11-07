// Kleine set lijn-iconen (geen externe bibliotheek nodig).
const paths: Record<string, React.ReactNode> = {
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m20.5 16-5-5-8.5 8.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  phone: (
    <path d="M6.6 3.5h2.6l1.4 4.2-2 1.3a11 11 0 0 0 6.4 6.4l1.3-2 4.2 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11M7.5 8 12 3.5 16.5 8" />
      <path d="M5 12.5v5.5A2 2 0 0 0 7 20h10a2 2 0 0 0 2-2v-5.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.3 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.3-3.5-8.5s1-6 3.5-8.5z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.8 21 19.5H3z" />
      <path d="M12 10v4.2M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  send: <path d="M4 11.5 20 4l-6.5 16-2.5-6.5z" />,
  euro: <path d="M17.5 6.5A6.5 6.5 0 1 0 17.5 17.5M4.5 10.5h9M4.5 13.5h9" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8h.01" />
    </>
  ),
  print: (
    <>
      <path d="M7 8.5V4h10v4.5" />
      <rect x="4" y="8.5" width="16" height="7.5" rx="2" />
      <path d="M7 13.5h10V20H7z" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" />,
  text: <path d="M4 18 8.5 6h1L14 18M5.6 14h6.8M15.5 18l3-7.5h.5l3 7.5M16.3 16h4.4" />,
};

export function Icon({ name, size = 28 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`icon icon-${name}`}
    >
      {paths[name]}
    </svg>
  );
}
