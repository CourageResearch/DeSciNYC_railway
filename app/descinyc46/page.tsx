import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AttributionEventLanding from "@/components/AttributionEventLanding";
import {
  captureAttributionAndBuildRedirectUrl,
  shouldShowAttributionPreview,
  type AttributionSearchParams,
} from "@/lib/attribution-redirect";
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
  searchParams?: Promise<AttributionSearchParams>;
};

export default async function DeSciNYC46Page({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const tracking = withTrackingDefaults(extractTrackingParams(params), event);

  if (!shouldShowAttributionPreview(params)) {
    redirect(await captureAttributionAndBuildRedirectUrl({ event, params }));
  }

  return <AttributionEventLanding event={event} tracking={tracking} />;
}
