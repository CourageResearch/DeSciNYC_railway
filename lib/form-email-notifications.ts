import "server-only";

import { Resend, type CreateEmailOptions } from "resend";
import { shouldSendAdminEmailNotification } from "@/lib/admin-email-preferences";
import { ADMIN_EMAILS } from "@/types/adminEmails";

const FROM_ADDRESS = "DeSciNYC <admin@desci.nyc>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactEmailDetails = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type SubscriptionEmailDetails = {
  email: string;
  nextEvent: {
    name: string;
    url: string;
  } | null;
};

export type SpeakerSuggestionEmailDetails = {
  yourName: string;
  yourEmail: string;
  speakerName: string;
  speakerEmail: string;
  speakerBio: string;
};

function createEmailClient() {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(resendApiKey);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return replacements[character];
  });
}

async function sendCheckedEmail(
  resend: Resend,
  email: CreateEmailOptions
) {
  const result = await resend.emails.send(email);

  if (result.error || !result.data) {
    console.error("Email provider rejected a form notification:", result.error);
    throw new Error("Email provider rejected the message");
  }
}

async function sendBestEffortEmail(
  resend: Resend,
  email: CreateEmailOptions,
  description: string
) {
  try {
    await sendCheckedEmail(resend, email);
  } catch (error) {
    console.error(`Failed to send ${description}:`, error);
  }
}

export async function sendContactEmails({
  name,
  email,
  phone,
  message,
}: ContactEmailDetails) {
  const resend = createEmailClient();
  const sendAdminCopy = await shouldSendAdminEmailNotification("contact");

  if (sendAdminCopy) {
    await sendCheckedEmail(resend, {
      from: FROM_ADDRESS,
      to: ADMIN_EMAILS,
      subject: "New Contact Form Submission",
      text: `
        Name: ${name || "Not provided"}
        Email: ${email || "Not provided"}
        Phone: ${phone || "Not provided"}
        Message: ${message}
      `,
    });
  }

  if (EMAIL_PATTERN.test(email)) {
    const confirmationEmail: CreateEmailOptions = {
      from: FROM_ADDRESS,
      to: [email],
      subject: "Thank you for contacting DeSciNYC",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Dear ${escapeHtml(name || "there")},</p>

          <p>Thank you for reaching out to DeSciNYC. We have received your message and will get back to you as soon as possible.</p>

          <p>Best regards,<br>The DeSciNYC Team</p>
        </div>
      `,
    };

    if (sendAdminCopy) {
      await sendBestEffortEmail(
        resend,
        confirmationEmail,
        "contact confirmation"
      );
    } else {
      await sendCheckedEmail(resend, confirmationEmail);
    }
  }
}

export async function sendSubscriptionEmails({
  email,
  nextEvent,
}: SubscriptionEmailDetails) {
  const resend = createEmailClient();
  const sendAdminCopy = await shouldSendAdminEmailNotification("subscribe");

  if (sendAdminCopy) {
    await sendCheckedEmail(resend, {
      from: FROM_ADDRESS,
      to: ADMIN_EMAILS,
      subject: "New DeSciNYC email list member!",
      text: `A user signed up with the email ${email}! They are now in the luma list.`,
    });
  }

  const nextEventMarkup = nextEvent
    ? `
      <p>Join us at our next event, "${escapeHtml(nextEvent.name)}" - you can RSVP here:</p>
      <div style="margin: 25px 0;">
        <a href="${escapeHtml(nextEvent.url)}"
           style="background-color: #0FA711;
                  color: white;
                  padding: 10px 20px;
                  text-decoration: none;
                  border-radius: 0px;
                  display: inline-block;">
          RSVP to Event
        </a>
      </div>
    `
    : "";

  const welcomeEmail: CreateEmailOptions = {
    from: FROM_ADDRESS,
    to: [email],
    subject: "Welcome to DeSciNYC!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <p>Hi there,</p>

        <p>Thanks for subscribing to the DeSciNYC email list! We're thrilled to have you as part of our community.</p>

        <p>We'll keep you in the loop with upcoming events.</p>

        ${nextEventMarkup}

        <p>Missed an event or want to catch up? You can watch previous event recordings anytime on our website here:</p>
        <div style="margin: 25px 0;">
          <a href="https://www.desci.nyc/#past-events"
             style="background-color: #0FA711;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 0px;
                    display: inline-block;">
            Watch Recordings
          </a>
        </div>

        <p>Looking forward to seeing you soon!</p>

        <p>All the best,<br>The DeSciNYC Team</p>
      </div>
    `,
  };

  if (sendAdminCopy) {
    await sendBestEffortEmail(resend, welcomeEmail, "subscription welcome email");
  } else {
    await sendCheckedEmail(resend, welcomeEmail);
  }
}

export async function sendSpeakerSuggestionEmails({
  yourName,
  yourEmail,
  speakerName,
  speakerEmail,
  speakerBio,
}: SpeakerSuggestionEmailDetails) {
  const resend = createEmailClient();
  const sendAdminCopy = await shouldSendAdminEmailNotification(
    "speaker_suggestion"
  );

  if (sendAdminCopy) {
    await sendCheckedEmail(resend, {
      from: FROM_ADDRESS,
      to: ADMIN_EMAILS,
      subject: "New Speaker Suggestion",
      text: `
        Suggested by:
        Name: ${yourName}
        Email: ${yourEmail}

        Speaker Details:
        Name: ${speakerName}
        Email: ${speakerEmail}
        Bio: ${speakerBio}
      `,
    });
  }

  const confirmationEmail: CreateEmailOptions = {
    from: FROM_ADDRESS,
    to: [yourEmail],
    subject: "Thank you for your speaker suggestion",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Dear ${escapeHtml(yourName)},</p>

        <p>Thank you for suggesting a speaker for DeSciNYC. We appreciate your contribution to our community.</p>

        <p>Best regards,<br>The DeSciNYC Team</p>
      </div>
    `,
  };

  if (sendAdminCopy) {
    await sendBestEffortEmail(
      resend,
      confirmationEmail,
      "speaker-suggestion confirmation"
    );
  } else {
    await sendCheckedEmail(resend, confirmationEmail);
  }
}
