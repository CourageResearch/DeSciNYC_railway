import "server-only";

type EnvGroup = {
  canonical: string;
  aliases: string[];
};

const X_ADS_ENV = {
  accountId: {
    canonical: "X_ADS_ACCOUNT_ID",
    aliases: ["X_ACCOUNT_ID", "TWITTER_ADS_ACCOUNT_ID"],
  },
  apiKey: {
    canonical: "X_ADS_API_KEY",
    aliases: ["X_API_KEY", "TWITTER_API_KEY"],
  },
  apiSecret: {
    canonical: "X_ADS_API_SECRET",
    aliases: [
      "X_API_SECRET",
      "X_API_KEY_SECRET",
      "TWITTER_API_SECRET",
      "TWITTER_API_KEY_SECRET",
    ],
  },
  accessToken: {
    canonical: "X_ADS_ACCESS_TOKEN",
    aliases: ["X_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN"],
  },
  accessTokenSecret: {
    canonical: "X_ADS_ACCESS_TOKEN_SECRET",
    aliases: ["X_ACCESS_TOKEN_SECRET", "TWITTER_ACCESS_TOKEN_SECRET"],
  },
} satisfies Record<string, EnvGroup>;

function firstEnvValue(group: EnvGroup) {
  for (const key of [group.canonical, ...group.aliases]) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

export function getXAdsConfig() {
  const accountId = firstEnvValue(X_ADS_ENV.accountId);
  const apiKey = firstEnvValue(X_ADS_ENV.apiKey);
  const apiSecret = firstEnvValue(X_ADS_ENV.apiSecret);
  const accessToken = firstEnvValue(X_ADS_ENV.accessToken);
  const accessTokenSecret = firstEnvValue(X_ADS_ENV.accessTokenSecret);
  const required = [
    [X_ADS_ENV.accountId.canonical, accountId],
    [X_ADS_ENV.apiKey.canonical, apiKey],
    [X_ADS_ENV.apiSecret.canonical, apiSecret],
    [X_ADS_ENV.accessToken.canonical, accessToken],
    [X_ADS_ENV.accessTokenSecret.canonical, accessTokenSecret],
  ] as const;

  return {
    accountId,
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
    apiVersion: process.env.X_ADS_API_VERSION || "12",
    missing: required.filter(([, value]) => !value).map(([key]) => key),
  };
}
