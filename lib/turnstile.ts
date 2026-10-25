type TurnstileResult =
  | { success: true }
  | { success: false; status: 400 | 503; error: string };

type TurnstileOptions = {
  token: unknown;
  secretKey: string | undefined;
  allowedHostnames: string[];
  expectedAction: string;
  fetchImpl?: typeof fetch;
};

const unavailable: TurnstileResult = {
  success: false,
  status: 503,
  error: "Human verification is temporarily unavailable. Please try again later.",
};

const invalid: TurnstileResult = {
  success: false,
  status: 400,
  error: "Please complete the human verification and try again.",
};

export async function verifyTurnstileToken({
  token,
  secretKey,
  allowedHostnames,
  expectedAction,
  fetchImpl = fetch,
}: TurnstileOptions): Promise<TurnstileResult> {
  // Never silently bypass protection when configuration is missing.
  if (!secretKey?.trim() || allowedHostnames.length === 0) {
    return unavailable;
  }

  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    return invalid;
  }

  try {
    const response = await fetchImpl(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: secretKey, response: token }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      }
    );

    if (!response.ok) return unavailable;

    const result = await response.json();
    if (!result || typeof result.success !== "boolean") return unavailable;

    if (
      result.success !== true ||
      result.action !== expectedAction ||
      typeof result.hostname !== "string" ||
      !allowedHostnames.includes(result.hostname.toLowerCase())
    ) {
      return invalid;
    }

    return { success: true };
  } catch {
    // Network errors, invalid responses, and timeouts must not send emails.
    return unavailable;
  }
}
