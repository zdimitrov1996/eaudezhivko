export function BottleMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="13" y="3.5" width="6" height="4" rx="1" fill="var(--color-moss-400)" />
      <rect x="14.5" y="7.5" width="3" height="2.5" fill="var(--color-moss-500)" />
      <rect
        x="8"
        y="10"
        width="16"
        height="18.5"
        rx="4.5"
        fill="none"
        stroke="var(--color-moss-400)"
        strokeWidth="1.8"
      />
      <path
        d="M11.5 21.5c2.5-1.2 6.5-1.2 9 0"
        fill="none"
        stroke="var(--color-moss-400)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <BottleMark />
      {/* Phones: stacked like a bottle label, so the header fits; wider: one line */}
      <span className="font-serif font-semibold tracking-wide text-smoke-100">
        <span className="block text-[0.8rem] leading-none sm:inline sm:text-2xl sm:leading-normal">
          Eau de{" "}
        </span>
        <span className="block text-xl leading-none text-moss-400 sm:inline sm:text-2xl sm:leading-normal">
          Fragrances
        </span>
      </span>
    </span>
  );
}
