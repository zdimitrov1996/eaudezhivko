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
      <span className="font-serif text-xl font-semibold tracking-wide text-smoke-100 sm:text-2xl">
        Eau de <span className="text-moss-400">Fragrances</span>
      </span>
    </span>
  );
}
