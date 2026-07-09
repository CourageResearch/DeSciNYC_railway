import { NextRequest, NextResponse } from "next/server";
import { detectBot, type BotProtectionData } from "@/lib/botProtection";
import { sendContactEmails } from "@/lib/form-email-notifications";
import { runPublicFormAction } from "@/lib/public-form-rate-limit";

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

    if (data.type !== "contact") {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      message,
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

    const contactName = String(name || "").trim();
    const contactEmail = String(email || "").trim();
    const contactPhone = String(phone || "").trim();
    const contactMessage = String(message || "").trim();
    const emailDomain = contactEmail.split("@")[1]?.toLowerCase();

    if (!contactMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (emailDomain && BLOCKED_EMAIL_DOMAINS.has(emailDomain)) {
      console.log("Bot email domain detected:", emailDomain);
      return NextResponse.json(
        { error: "Invalid email domain" },
        { status: 400 }
      );
    }

    const submission = await runPublicFormAction(req, "contact", () =>
      sendContactEmails({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        message: contactMessage,
      })
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

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
