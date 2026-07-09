// Bot protection utilities
export interface BotProtectionData {
  honeypot: string;
  honeypot2: string;
  honeypot3: string;
  timestamp: number;
  formStartTime: number;
  userAgent: string;
  referrer: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

export interface BotDetectionResult {
  isBot: boolean;
  reasons: string[];
}

export function detectBot(data: BotProtectionData): BotDetectionResult {
  const reasons: string[] = [];
  let isBot = false;

  // 1. Honeypot check
  if (
    [data.honeypot, data.honeypot2, data.honeypot3].some(
      (value) => value && value.trim() !== ""
    )
  ) {
    reasons.push("Honeypot field filled");
    isBot = true;
  }

  // 2. Form fill time check (too fast = bot)
  const fillTime = data.timestamp - data.formStartTime;
  if (fillTime < 3000) {
    // Less than 3 seconds
    reasons.push("Form filled too quickly");
    isBot = true;
  }

  // 3. Suspicious user agent patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i,
    /java/i,
    /node/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(data.userAgent))) {
    reasons.push("Suspicious user agent");
    isBot = true;
  }

  // 4. Missing or suspicious browser features
  if (!data.screenResolution || data.screenResolution === "0x0") {
    reasons.push("Invalid screen resolution");
    isBot = true;
  }

  return { isBot, reasons };
}

export function generateBotProtectionData(): BotProtectionData {
  return {
    honeypot: "",
    honeypot2: "",
    honeypot3: "",
    timestamp: Date.now(),
    formStartTime: Date.now(),
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
    referrer: typeof window !== "undefined" ? document.referrer : "",
    screenResolution:
      typeof window !== "undefined"
        ? `${window.screen.width}x${window.screen.height}`
        : "",
    timezone:
      typeof window !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "",
    language: typeof window !== "undefined" ? navigator.language : "",
  };
}
