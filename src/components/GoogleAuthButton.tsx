"use client";

import { useState } from "react";

export function GoogleAuthButton({ label }: { label: string }) {
  const [showStubNote, setShowStubNote] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowStubNote(true)}
        className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-surface hover:bg-surface-hover px-4 py-2.5 text-sm font-medium transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
          />
          <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
          />
        </svg>
        {label}
      </button>
      {showStubNote && (
        <p className="mt-2 text-xs text-muted text-center">
          Google orqali kirish tez orada faollashadi — hozircha parol orqali davom eting.
        </p>
      )}
    </div>
  );
}
