"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: "dark";
    size: "flexible";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string | undefined;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileProps = {
  siteKey: string;
  resetKey: number;
  onToken: (token: string) => void;
};

export default function Turnstile({ siteKey, resetKey, onToken }: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !window.turnstile || !container.current) return;

    const turnstile = window.turnstile;
    let active = true;
    let widgetId: string | undefined;
    const fail = () => {
      if (!active) return;
      onToken("");
      setError("Verification couldn’t finish. Please refresh the page to try again.");
    };

    onToken("");
    setError(null);
    try {
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey,
        action: "suggest_speaker",
        theme: "dark",
        size: "flexible",
        callback: (token) => {
          if (!active) return;
          setError(null);
          onToken(token);
        },
        "expired-callback": () => {
          if (active) onToken("");
        },
        "error-callback": fail,
        "timeout-callback": fail,
      });
    } catch {
      fail();
    }

    return () => {
      active = false;
      if (widgetId !== undefined) turnstile.remove(widgetId);
    };
  }, [ready, siteKey, resetKey, onToken]);

  return (
    <div className="w-full min-w-0">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => {
          onToken("");
          setError("Verification couldn’t load. Please refresh the page to try again.");
        }}
      />
      <div ref={container} aria-label="Human verification" />
      {!ready && !error && (
        <p role="status" className="text-sm text-stone-200">Loading human verification…</p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
