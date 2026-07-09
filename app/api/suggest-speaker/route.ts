import { NextRequest, NextResponse } from "next/server";
import { detectBot, type BotProtectionData } from "@/lib/botProtection";
import { sendSpeakerSuggestionEmails } from "@/lib/form-email-notifications";
import { runPublicFormAction } from "@/lib/public-form-rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOCKED_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "tempmail.org",
  "guerrillamail.com",
  "mailinator.com",
  "throwaway.email",
  "temp-mail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "bccto.me",
  "chacuo.net",
  "dispostable.com",
  "mailnesia.com",
  "mailcatch.com",
  "inboxalias.com",
  "mailmetrash.com",
  "trashmail.net",
  "spamgourmet.com",
]);

function normalizeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Date.now();
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      yourName,
      yourEmail,
      speakerName,
      speakerEmail,
      speakerBio,
      honeypot,
      honeypot2,
      honeypot3,
      timestamp,
      formStartTime,
      userAgent,
      referrer,
      screenResolution,
      timezone,
      language,
      captchaToken,
    } = data;

    const botData: BotProtectionData = {
      honeypot: String(honeypot || ""),
      honeypot2: String(honeypot2 || ""),
      honeypot3: String(honeypot3 || ""),
      timestamp: normalizeTimestamp(timestamp),
      formStartTime: normalizeTimestamp(formStartTime),
      userAgent:
        req.headers.get("user-agent") || String(userAgent || ""),
      referrer: String(referrer || ""),
      screenResolution: String(screenResolution || ""),
      timezone: String(timezone || ""),
      language: String(language || ""),
    };

    const botDetection = detectBot(botData);

    if (botDetection.isBot) {
      console.log("Bot detected:", botDetection.reasons);
      return NextResponse.json(
        { error: "Invalid submission" },
        { status: 400 }
      );
    }

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecretKey) {
      if (typeof captchaToken !== "string" || !captchaToken) {
        console.log("Missing reCAPTCHA token");
        return NextResponse.json(
          { error: "reCAPTCHA verification required" },
          { status: 400 }
        );
      }

      const captchaResponse = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            secret: recaptchaSecretKey,
            response: captchaToken,
          }),
        }
      );

      const captchaResult = await captchaResponse.json();

      if (!captchaResult.success) {
        console.log("reCAPTCHA verification failed:", captchaResult);
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }
    } else {
      console.warn("RECAPTCHA_SECRET_KEY is not set - skipping reCAPTCHA");
    }

    const normalizedSuggestion = {
      yourName: String(yourName || "").trim(),
      yourEmail: String(yourEmail || "").trim(),
      speakerName: String(speakerName || "").trim(),
      speakerEmail: String(speakerEmail || "").trim(),
      speakerBio: String(speakerBio || "").trim(),
    };

    if (
      normalizedSuggestion.yourName.length < 2 ||
      normalizedSuggestion.speakerName.length < 2 ||
      normalizedSuggestion.speakerBio.length < 10
    ) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      );
    }

    if (
      !EMAIL_PATTERN.test(normalizedSuggestion.yourEmail) ||
      !EMAIL_PATTERN.test(normalizedSuggestion.speakerEmail)
    ) {
      return NextResponse.json(
        { error: "Please enter valid email addresses." },
        { status: 400 }
      );
    }

    const yourEmailDomain = normalizedSuggestion.yourEmail
      .split("@")[1]
      .toLowerCase();
    const speakerEmailDomain = normalizedSuggestion.speakerEmail
      .split("@")[1]
      .toLowerCase();

    if (
      BLOCKED_EMAIL_DOMAINS.has(yourEmailDomain) ||
      BLOCKED_EMAIL_DOMAINS.has(speakerEmailDomain)
    ) {
      console.log("Bot email domain detected");
      return NextResponse.json(
        { error: "Invalid email domain" },
        { status: 400 }
      );
    }

    const submission = await runPublicFormAction(
      req,
      "suggest-speaker",
      () => sendSpeakerSuggestionEmails(normalizedSuggestion)
    );

    if (!submission.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(submission.retryAfterSeconds),
          },
        }
      );
    }

    return NextResponse.json({ message: "Speaker suggestion received" });
  } catch (error) {
    console.error("Error submitting speaker suggestion:", error);
    return NextResponse.json(
      { error: "Unable to submit speaker suggestion" },
      { status: 500 }
    );
  }
}
