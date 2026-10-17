"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/client";

export function Modal({
  title,
  onClose,
  children,
  widthClassName = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}) {
  const { t } = useT();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full ${widthClassName} rounded-xl border border-border bg-surface shadow-2xl max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-hover" aria-label={t("common.close")}>
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
