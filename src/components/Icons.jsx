// Small line-icon set (Feather-style paths) so we don't need an icon library.
const PATHS = {
  home: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  trash: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />,
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 7H5a2 2 0 0 1 0-4h12a2 2 0 0 1 2 2v2z" />
      <path d="M3 7v11a2 2 0 0 0 2 2h16v-6" />
      <path d="M21 13h-4a2 2 0 0 0 0 4h4v-4z" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4L21 6l-3-3-3.3 3.3z" />,
  edit: <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </>
  ),
};

export default function Icon({ name, size = 18, className = '' }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

// The little characters from the login screen, reused for friendly empty states.
export function Friend({ tone = 'green', size = 120 }) {
  const isGreen = tone === 'green';
  return (
    <svg className="friend" width={size} height={size * 1.14} viewBox="0 0 140 160" aria-hidden="true">
      <ellipse cx="70" cy="150" rx="44" ry="7" fill="#17392F" opacity="0.08" />
      {isGreen ? (
        <>
          <path d="M70 10c33 0 55 26 55 62 0 40-25 70-55 70S15 112 15 72C15 36 37 10 70 10Z" fill="#4F9A82" />
          <circle className="mascot-eye" cx="52" cy="70" r="10" fill="#fff" />
          <circle className="mascot-eye" cx="88" cy="70" r="10" fill="#fff" />
          <circle cx="52" cy="72" r="5" fill="#17392F" />
          <circle cx="88" cy="72" r="5" fill="#17392F" />
          <path d="M55 100c8 8 22 8 30 0" stroke="#17392F" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M70 14c30 0 50 22 50 56 0 38-22 66-50 66S20 108 20 70C20 36 40 14 70 14Z" fill="#F4C95D" />
          <circle className="mascot-eye" cx="55" cy="64" r="8" fill="#fff" />
          <circle className="mascot-eye" cx="85" cy="64" r="8" fill="#fff" />
          <circle cx="55" cy="66" r="4" fill="#17392F" />
          <circle cx="85" cy="66" r="4" fill="#17392F" />
          <path d="M58 92c7 7 17 7 24 0" stroke="#17392F" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
