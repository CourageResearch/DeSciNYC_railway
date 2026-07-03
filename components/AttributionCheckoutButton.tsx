"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Script from "next/script";
import {
  ATTRIBUTION_MAX_AGE_SECONDS,
  attributionCookieName,
  buildLumaUrl,
  extractTrackingParams,
  type AttributionEventConfig,
  type TrackingParams,
} from "@/lib/attribution";

type AttributionCheckoutButtonProps = {
  event: AttributionEventConfig;
  initialTracking: TrackingParams;
  className?: string;
  children: ReactNode;
};

function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")[1];
}

function createClickId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (window.crypto.getRandomValues(new Uint8Array(1))[0] &
        (15 >> (Number(char) / 4)))
    ).toString(16)
  );
}

export default function AttributionCheckoutButton({
  event,
  initialTracking,
  className,
  children,
}: AttributionCheckoutButtonProps) {
  const [href, setHref] = useState(buildLumaUrl(null, initialTracking, event));

  useEffect(() => {
    const storageKey = attributionCookieName(event.slug);
    const storedClickId =
      localStorage.getItem(storageKey) || readCookie(storageKey);
    const clickId = storedClickId || createClickId();
    localStorage.setItem(storageKey, clickId);
    document.cookie = `${storageKey}=${clickId}; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;

    const searchTracking = extractTrackingParams(
      new URLSearchParams(window.location.search)
    );
    const tracking: TrackingParams = {
      ...initialTracking,
      ...searchTracking,
      utm_id: searchTracking.utm_id || initialTracking.utm_id || clickId,
    };
    const currentUrl = new URL(window.location.href);

    for (const [key, value] of Object.entries(tracking)) {
      if (value) {
        currentUrl.searchParams.set(key, value);
      }
    }

    window.history.replaceState(null, "", currentUrl.toString());

    setHref(buildLumaUrl(clickId, tracking, event));

    fetch("/api/attribution/click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        clickId,
        eventSlug: event.slug,
        landingUrl: currentUrl.toString(),
        landingPath: `${currentUrl.pathname}${currentUrl.search}`,
        tracking,
        referrer: document.referrer || null,
      }),
    }).catch((error) => {
      console.error("Failed to capture ad attribution:", error);
    });
  }, [event, initialTracking]);

  return (
    <>
      <Script
        id="luma-checkout"
        src="https://embed.lu.ma/checkout-button.js"
        strategy="afterInteractive"
      />
      <a
        href={href}
        className={`luma-checkout--button ${className || ""}`}
        data-luma-action="checkout"
        data-luma-event-id={event.lumaEventId}
        data-luma-utm-source={
          initialTracking.utm_source || event.defaultUtm.utm_source
        }
      >
        {children}
      </a>
    </>
  );
}
