// Outline after M. Micallef's GnTonic flacon: wide cap, short neck, a broad
// square body and the band of glass shards across its middle.
export function BottleMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="10.75" y="2.5" width="10.5" height="5.1" rx="0.9" fill="var(--color-moss-400)" />
      <rect x="12.8" y="7.6" width="6.4" height="3.3" fill="var(--color-moss-500)" />
      <rect
        x="6.2"
        y="11.8"
        width="19.6"
        height="17.7"
        rx="1.4"
        fill="var(--color-moss-400)"
        fillOpacity="0.1"
        stroke="var(--color-moss-400)"
        strokeWidth="1.8"
      />
      {/* The shard band pokes out past the sides; the zigzag is a see-through cut */}
      <path fillRule="evenodd" fill="var(--color-moss-400)" d="M4.6 19.2H27.4V24.4H4.6ZM6.8 22.37 8.6 19.57 10.4 22.37 12.2 19.57 14 22.37 15.8 19.57 17.6 22.37 19.4 19.57 21.2 22.37 23 19.57 24.8 22.37 24.8 24.03 23 21.23 21.2 24.03 19.4 21.23 17.6 24.03 15.8 21.23 14 24.03 12.2 21.23 10.4 24.03 8.6 21.23 6.8 24.03Z" />
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
