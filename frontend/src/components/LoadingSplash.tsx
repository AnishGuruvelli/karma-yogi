import { useEffect, useState } from "react";

type LoadingSplashProps = {
  /** Controlled: show full-screen loading until parent sets false (e.g. after APIs finish). */
  open: boolean;
};

/**
 * Full-screen loading overlay — same motion language as the reference splash,
 * restyled to match Karma Yogi (light cards, cyan/purple accents, dot grain).
 */
export function LoadingSplash({ open }: LoadingSplashProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setFading(false);
      return;
    }
    if (!visible) return;
    setFading(true);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setFading(false);
    }, 420);
    return () => window.clearTimeout(hideTimer);
  }, [open, visible]);

  if (!visible) return null;

  return (
    <div
      className={`ky-splash-root fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden transition-opacity duration-[420ms] ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading app data"
    >
      <div className="ky-splash-orb ky-splash-orb--a" aria-hidden />
      <div className="ky-splash-orb ky-splash-orb--b" aria-hidden />
      <div className="ky-splash-orb ky-splash-orb--c" aria-hidden />
      <div className="ky-splash-grain" aria-hidden />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="ky-splash-eyebrow">
          <span className="ky-splash-dot" aria-hidden />
          Just a moment
        </span>

        <h1 className="ky-splash-title font-display">
          <span className="ky-splash-word">Pulling</span>{" "}
          <span className="ky-splash-word ky-splash-word--muted">it</span>{" "}
          <span className="ky-splash-word ky-splash-word--accent">
            together
            <span className="ky-splash-shine" aria-hidden />
          </span>
          <span className="ky-splash-cursor" aria-hidden>
            .
          </span>
        </h1>

        <p className="ky-splash-sub">Syncing sessions, goals, profile, and preferences from the server</p>

        <div className="ky-splash-progress" aria-hidden>
          <div className="ky-splash-progress__fill" />
        </div>
      </div>

      <style>{`
        .ky-splash-root {
          background:
            radial-gradient(120% 90% at 50% -5%, color-mix(in oklch, var(--neon-cyan) 22%, var(--background)) 0%, var(--background) 48%, color-mix(in oklch, var(--neon-purple) 12%, var(--background)) 100%);
          color: var(--foreground);
          font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
        }
        .ky-splash-grain {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(color-mix(in oklch, var(--foreground) 12%, transparent) 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.35;
          pointer-events: none;
        }
        .ky-splash-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(72px);
          opacity: 0.45;
          pointer-events: none;
          will-change: transform;
        }
        .ky-splash-orb--a {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, color-mix(in oklch, var(--neon-cyan) 55%, transparent) 0%, transparent 72%);
          top: -100px;
          left: -80px;
          animation: ky-splash-float 8s ease-in-out infinite;
        }
        .ky-splash-orb--b {
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, color-mix(in oklch, var(--neon-purple) 45%, transparent) 0%, transparent 72%);
          bottom: -120px;
          right: -60px;
          animation: ky-splash-float 10s ease-in-out infinite reverse;
        }
        .ky-splash-orb--c {
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 70%);
          top: 38%;
          left: 52%;
          opacity: 0.3;
          animation: ky-splash-float 12s ease-in-out infinite;
        }
        .ky-splash-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: color-mix(in oklch, var(--foreground) 65%, transparent);
          padding: 0.45rem 0.95rem;
          border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
          border-radius: 9999px;
          backdrop-filter: blur(10px);
          background: color-mix(in oklch, var(--card) 88%, transparent);
          margin-bottom: 1.5rem;
          animation: ky-splash-rise 0.65s ease-out both;
        }
        .ky-splash-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: var(--primary);
          box-shadow: 0 0 14px color-mix(in oklch, var(--primary) 60%, transparent);
          animation: ky-splash-pulse 1.35s ease-in-out infinite;
        }
        .ky-splash-title {
          font-weight: 500;
          font-size: clamp(2.25rem, 7vw, 4.25rem);
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: baseline;
          gap: 0.12em;
        }
        .ky-splash-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(18px);
          animation: ky-splash-rise 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .ky-splash-word:nth-child(1) { animation-delay: 0.04s; }
        .ky-splash-word:nth-child(3) { animation-delay: 0.16s; }
        .ky-splash-word:nth-child(5) { animation-delay: 0.28s; }
        .ky-splash-word--muted {
          font-style: italic;
          font-weight: 400;
          color: color-mix(in oklch, var(--foreground) 58%, transparent);
        }
        .ky-splash-word--accent {
          position: relative;
          font-weight: 600;
          background: linear-gradient(180deg, color-mix(in oklch, var(--neon-cyan) 35%, var(--foreground)) 0%, var(--primary) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .ky-splash-shine {
          position: absolute;
          left: 50%;
          top: -0.35em;
          width: 120%;
          height: 0.45em;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, color-mix(in oklch, var(--neon-cyan) 40%, transparent), transparent);
          opacity: 0.55;
          filter: blur(6px);
          pointer-events: none;
          animation: ky-splash-shine 2.4s ease-in-out infinite;
        }
        .ky-splash-cursor {
          color: var(--primary);
          margin-left: 0.04em;
          animation: ky-splash-blink 1s steps(2) infinite;
        }
        .ky-splash-sub {
          margin-top: 1.1rem;
          max-width: 22rem;
          font-size: 0.9rem;
          line-height: 1.45;
          color: color-mix(in oklch, var(--muted-foreground) 92%, transparent);
          letter-spacing: 0.02em;
          animation: ky-splash-rise 0.75s 0.35s ease-out both;
        }
        .ky-splash-progress {
          margin-top: 2rem;
          width: min(280px, 70vw);
          height: 3px;
          border-radius: 9999px;
          background: color-mix(in oklch, var(--muted) 75%, transparent);
          overflow: hidden;
          animation: ky-splash-rise 0.75s 0.45s ease-out both;
        }
        .ky-splash-progress__fill {
          height: 100%;
          width: 0%;
          border-radius: 9999px;
          background: linear-gradient(90deg, var(--neon-cyan), var(--primary), var(--neon-purple));
          box-shadow: 0 0 14px color-mix(in oklch, var(--primary) 45%, transparent);
          animation: ky-splash-fill 1.85s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @keyframes ky-splash-rise {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ky-splash-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes ky-splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.65; }
        }
        @keyframes ky-splash-blink {
          50% { opacity: 0; }
        }
        @keyframes ky-splash-shine {
          0%, 100% { opacity: 0.35; transform: translateX(-50%) scaleX(0.85); }
          50% { opacity: 0.75; transform: translateX(-50%) scaleX(1); }
        }
        @keyframes ky-splash-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(28px, -22px) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ky-splash-word, .ky-splash-eyebrow, .ky-splash-sub, .ky-splash-progress {
            opacity: 1;
            transform: none;
            animation: none;
          }
          .ky-splash-orb, .ky-splash-dot, .ky-splash-cursor, .ky-splash-shine { animation: none; }
          .ky-splash-progress__fill { width: 100%; animation: none; }
        }
      `}</style>
    </div>
  );
}
