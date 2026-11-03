import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTRIBUTION_EVENTS,
  resolveAttributionEvent,
  buildLumaUrl,
  decodeLumaSourceWithClickId,
  withTrackingDefaults,
} from "../lib/attribution.ts";

const event = ATTRIBUTION_EVENTS.descinyc54;
const clickId = "e9cb0dd8-1e9a-4132-9d7e-d845af4a021c";

test("new Luma registrations resolve to the November event, not a legacy event", () => {
  assert.equal(resolveAttributionEvent({ lumaEventId: "evt-9OpRa1KTEFHva0s" }).slug, "descinyc54");
  assert.equal(resolveAttributionEvent({ url: "https://luma.com/descinyc54" }).slug, "descinyc54");
  assert.equal(resolveAttributionEvent({ tracking: { utm_campaign: "descinyc54_science_evening" } }).slug, "descinyc54");
  assert.equal(new Date(event.startsAt).toISOString(), "2026-11-14T23:30:00.000Z");
});

for (const [source, platformClick] of [
  ["twitter_ads", { twclid: "test-x-click" }],
  ["instagram_ads", { fbclid: "test-meta-click" }],
]) {
  test(`${source} preserves platform, creative, and exact click attribution through Luma`, () => {
    const tracking = withTrackingDefaults({ utm_source: source, utm_content: "descinyc54_space_future", ...platformClick }, event);
    const url = new URL(buildLumaUrl(clickId, tracking, event));
    assert.equal(url.origin + url.pathname, "https://luma.com/descinyc54");
    assert.equal(url.searchParams.get("utm_campaign"), "descinyc54_science_evening");
    assert.equal(url.searchParams.get("utm_content"), "descinyc54_space_future");
    assert.equal(url.searchParams.get("utm_id"), clickId);
    assert.deepEqual(decodeLumaSourceWithClickId(url.searchParams.get("utm_source")), { source, clickId });
    for (const [key, value] of Object.entries(platformClick)) assert.equal(url.searchParams.get(key), value);
  });
}
