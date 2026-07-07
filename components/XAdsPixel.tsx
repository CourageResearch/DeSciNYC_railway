"use client";

import { useEffect } from "react";

type XAdsPixelProps = {
  pixelId?: string | null;
};

type TwqFunction = ((...args: unknown[]) => void) & {
  exe?: (...args: unknown[]) => void;
  queue?: unknown[][];
  version?: string;
};

type TwqWindow = Window & {
  twq?: TwqFunction;
};

function cleanXId(value: string | null | undefined) {
  const clean = value?.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return clean || null;
}

export default function XAdsPixel({ pixelId }: XAdsPixelProps) {
  const cleanPixelId = cleanXId(pixelId);

  useEffect(() => {
    if (!cleanPixelId) {
      return;
    }

    const twqWindow = window as TwqWindow;

    if (!twqWindow.twq) {
      const twq: TwqFunction = (...args: unknown[]) => {
        if (twq.exe) {
          twq.exe(...args);
          return;
        }

        twq.queue?.push(args);
      };
      twq.version = "1.1";
      twq.queue = [];
      twqWindow.twq = twq;
    }

    if (!document.getElementById("x-ads-pixel-lib")) {
      const script = document.createElement("script");
      script.id = "x-ads-pixel-lib";
      script.async = true;
      script.src = "https://static.ads-twitter.com/uwt.js";
      script.onload = () => {
        document.documentElement.dataset.xAdsPixelStatus = "loaded";
      };
      script.onerror = () => {
        document.documentElement.dataset.xAdsPixelStatus = "error";
      };
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript.parentNode?.insertBefore(script, firstScript);
    }

    document.documentElement.dataset.xAdsPixelStatus ||= "queued";
    twqWindow.twq("config", cleanPixelId);
  }, [cleanPixelId]);

  return null;
}
