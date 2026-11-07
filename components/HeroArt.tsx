// Illustratie voor het startscherm: een brief met een vergrootglas en een groen vinkje.
// Kleuren via CSS-variabelen, dus mooi in licht én donker.
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 240 200" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ha-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--art-1)" />
          <stop offset="1" stopColor="var(--art-2)" />
        </linearGradient>
      </defs>
      <circle cx="122" cy="102" r="92" fill="url(#ha-bg)" />
      <circle cx="40" cy="40" r="6" fill="var(--accent)" opacity=".9" />
      <circle cx="210" cy="56" r="4" fill="var(--primary)" opacity=".5" />
      <circle cx="200" cy="168" r="7" fill="var(--accent)" opacity=".6" />
      {/* envelop achter */}
      <g transform="rotate(-8 110 110)">
        <rect x="52" y="78" width="122" height="84" rx="10" fill="var(--primary)" />
        <path d="M52 86l61 42 61-42" fill="none" stroke="var(--primary-ink)" strokeOpacity=".35" strokeWidth="4" strokeLinejoin="round" />
      </g>
      {/* brief */}
      <g transform="rotate(4 120 90)">
        <rect x="74" y="26" width="98" height="126" rx="8" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
        <rect x="86" y="42" width="44" height="8" rx="4" fill="var(--primary)" />
        <rect x="86" y="60" width="72" height="5" rx="2.5" fill="var(--line)" />
        <rect x="86" y="72" width="64" height="5" rx="2.5" fill="var(--line)" />
        <rect x="86" y="84" width="70" height="5" rx="2.5" fill="var(--line)" />
        <rect x="86" y="104" width="38" height="12" rx="6" fill="var(--accent)" />
        <rect x="86" y="126" width="54" height="5" rx="2.5" fill="var(--line)" />
      </g>
      {/* vergrootglas */}
      <g>
        <circle cx="160" cy="112" r="26" fill="var(--surface)" fillOpacity=".55" stroke="var(--ink)" strokeWidth="7" />
        <path d="M179 131l20 20" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round" />
      </g>
      {/* vinkje */}
      <circle cx="74" cy="150" r="20" fill="var(--green)" />
      <path d="M64 150l7 7 13-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
