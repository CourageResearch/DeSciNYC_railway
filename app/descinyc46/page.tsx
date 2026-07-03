import type { Metadata } from "next";
import AttributionEventLanding from "@/components/AttributionEventLanding";
import {
  ATTRIBUTION_EVENTS,
  extractTrackingParams,
  withTrackingDefaults,
} from "@/lib/attribution";

export const dynamic = "force-dynamic";
const event = ATTRIBUTION_EVENTS.descinyc46;

export const metadata: Metadata = {
  title: event.title,
  description: event.description,
  alternates: {
    canonical: `/${event.slug}`,
  },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DeSciNYC46Page({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const tracking = withTrackingDefaults(extractTrackingParams(params), event);

  return <AttributionEventLanding event={event} tracking={tracking} />;
}
