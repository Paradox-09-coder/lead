import Image from "next/image";

// Uses the brand logo PNG from /public. The full lockup (icon + "LeadSync"
// wordmark) lives in /public/leadsync-logo.png; this component uses the
// icon-only crop at /public/leadsync-icon.png so it sits next to the text
// label without duplication.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/leadsync-icon.png"
      alt="LeadSync"
      width={size}
      height={size}
      priority
      className="rounded-md"
    />
  );
}
