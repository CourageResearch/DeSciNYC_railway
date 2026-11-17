import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { transcripts, type TranscriptParagraph } from "./transcripts";

export async function getTranscriptParagraphs(key: string): Promise<TranscriptParagraph[]> {
  if (!transcripts.some((item) => item.key === key)) return [];
  const content = await readFile(path.join(process.cwd(), "data", "transcripts", `${key}.json`), "utf8");
  return JSON.parse(content).paragraphs;
}
