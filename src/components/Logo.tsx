export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leadsync-logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#leadsync-logo-gradient)" />
      <path
        d="M10 20.5C10 17.4624 12.4624 15 15.5 15H19"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M16.5 12L19 15L16.5 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M22 11.5C22 14.5376 19.5376 17 16.5 17H13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M15.5 8.5L13 11.5L15.5 14.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}
