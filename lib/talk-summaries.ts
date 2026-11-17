import summaries from "@/data/talks/summaries.json";

export type TalkOverview = {
  summary: string;
  takeaways: { text: string; start: number }[];
};

export function getTalkOverview(key: string): TalkOverview {
  const overview = (summaries as Record<string, TalkOverview>)[key];
  if (!overview) throw new Error(`Missing talk summary: ${key}`);
  return overview;
}
