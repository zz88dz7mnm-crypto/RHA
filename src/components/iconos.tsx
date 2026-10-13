type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** El logo de RHA: un corazón con un tilde, como "hecho". */
export function Logo({ className = "size-10" }: Props) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[28%] bg-acento text-sobre-acento ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="currentColor">
        <path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
        <path d="m8.8 12.4 2.2 2.2 4.3-4.4" fill="none" stroke="var(--color-acento)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function IconoHoy({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconoSemana({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

export function IconoAgenda({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconoHabitos({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z" />
    </svg>
  );
}

export function IconoPanel({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconoVencidos({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5 21 19.5H3L12 3.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconoAjustes({ className = "size-6" }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function IconoMas({ className = "size-5" }: Props) {
  return (
    <svg {...base} className={className} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconoCheck({ className = "size-4" }: Props) {
  return (
    <svg {...base} className={className} strokeWidth={3}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconoFlecha({ className = "size-4", izquierda }: Props & { izquierda?: boolean }) {
  return (
    <svg {...base} className={className} strokeWidth={2.2}>
      <path d={izquierda ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

export function IconoCampana({ className = "size-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconoPastilla({ className = "size-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7" />
    </svg>
  );
}

export function IconoRepetir({ className = "size-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function IconoLlama({ className = "size-4" }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-9-1 2-2 3-4 4 0-1.5-.5-2.5-1-3-1.5 2-3 4.5-3 8a6 6 0 0 0 6 6Z" />
    </svg>
  );
}
