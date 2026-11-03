// Keep this pattern compatible with both JavaScript and PostgreSQL regexes.
// Match identified crawlers conservatively; normal in-app browsers still count.
export const AUTOMATED_USER_AGENT_PATTERN =
  "facebookexternalhit|facebot|meta-externalads|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|slackbot-linkexpanding|discordbot|telegrambot|googlebot|bingbot|applebot";

export function isAutomatedAttributionVisit(userAgent?: string | null) {
  return new RegExp(AUTOMATED_USER_AGENT_PATTERN, "i").test(userAgent || "");
}
