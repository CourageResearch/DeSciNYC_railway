import assert from "node:assert/strict";
import test from "node:test";
import {
  adsReportingToday, buildAdsEventReports, defaultAdsEventSlug,
  filtersForAdsEvent, resolveAdsPageFilters,
} from "../lib/ads-events.ts";

const now = new Date("2026-11-03T05:30:00Z");
const range = { startDate: "2026-07-09", endDate: "2026-11-03" };
const events = [
  { slug: "old", title: "Peptides 101", startsAt: "2026-07-14T19:30:00-04:00" },
  { slug: "new", title: "Space evening", startsAt: "2026-11-14T18:30:00-05:00" },
];
const metric = (eventSlug, spendMicros, clicks, impressions, date) => ({
  eventSlug, spendMicros, clicks, impressions, date, reach: 0, provisional: false, unmapped: false,
});
const reports = () => buildAdsEventReports({ events, range, now,
  metrics: [metric("old", 70_000_000, 30, 600, "2026-07-10"), metric("old", 30_000_000, 20, 400, "2026-07-11")],
  clicks: [{eventSlug:"old",date:"2026-07-09",count:80}, {eventSlug:"new",date:"2026-11-02",count:4}],
  conversions: [{eventSlug:"old",date:"2026-07-14",count:10,revenueMicros:200_000_000}],
});

test("new event starts with its own zero spend and conversions; past results remain intact", () => {
  const data = reports();
  const current = data.find(r => r.eventSlug === "new");
  const old = data.find(r => r.eventSlug === "old");
  assert.equal(current.totals.spendMicros, 0);
  assert.equal(current.totals.registrations, 0);
  assert.equal(current.totals.trackedClicks, 4);
  assert.equal(current.totals.costPerRegistrationMicros, null);
  assert.equal(old.totals.spendMicros, 100_000_000);
  assert.equal(old.totals.registrations, 10);
  assert.equal(old.totals.revenueMicros, 200_000_000);
  assert.equal(old.totals.cpcMicros, 2_000_000);
  assert.equal(old.totals.costPerRegistrationMicros, 10_000_000);
  assert.equal(old.totals.ctr, 0.05);
  assert.equal(old.totals.conversionRate, 0.125);
  assert.equal(old.totals.roas, 2);
  assert.equal(current.range.startDate, "2026-11-02");
  assert.equal(old.range.startDate, "2026-07-09");
  assert.equal(old.status, "past");
});

test("new delivered spend and conversions stay with their event, including unassigned data", () => {
  const data = buildAdsEventReports({events,range,now,
    metrics:[metric("old",90_000_000,9,90,"2026-07-10"),metric("new",4_000_000,2,40,"2026-11-03"),metric(null,1_000_000,1,20,"2026-11-03")],
    clicks:[], conversions:[{eventSlug:"new",date:"2026-11-03",count:1,revenueMicros:50_000_000}],
  });
  const current = data.find(r=>r.eventSlug==="new");
  assert.equal(current.totals.spendMicros,4_000_000);
  assert.equal(current.totals.registrations,1);
  assert.equal(current.totals.roas,12.5);
  assert.equal(data.find(r=>r.eventSlug==="").totals.spendMicros,1_000_000);
  assert.equal(data.reduce((sum,r)=>sum+r.totals.spendMicros,0),95_000_000);
});

test("default report follows upcoming event and falls back to the latest past event", () => {
  assert.equal(defaultAdsEventSlug(reports()),"new");
  const archived=buildAdsEventReports({events,range,now:new Date("2026-12-01T12:00:00Z"),metrics:[],clicks:[],conversions:[]});
  assert.equal(defaultAdsEventSlug(archived),"new");
  const future=buildAdsEventReports({events:[...events,{slug:"later",title:"Later",startsAt:"2026-12-14T18:30:00-05:00"}],range,now,metrics:[],clicks:[],conversions:[]});
  assert.equal(defaultAdsEventSlug(future),"new");
});

test("switching events restores lifetime dates and drops campaign/ad filters", () => {
  assert.deepEqual(filtersForAdsEvent(reports(),"old",range),{...range,platform:"all",eventSlug:"old"});
  assert.deepEqual(filtersForAdsEvent(reports(),undefined,range),{...range,platform:"all",eventSlug:undefined});
  assert.equal(filtersForAdsEvent(reports(),"new",range).startDate,"2026-11-02");
});

test("bookmarked event reports and explicit all-events views survive reload", () => {
  assert.equal(resolveAdsPageFilters(reports(),range,{}).eventSlug,"new");
  assert.equal(resolveAdsPageFilters(reports(),range,{eventSlug:"old"}).eventSlug,"old");
  assert.equal(resolveAdsPageFilters(reports(),range,{eventSlug:"all"}).eventSlug,undefined);
  assert.equal(resolveAdsPageFilters(reports(),range,{eventSlug:"mistyped"}).eventSlug,"new");
  const custom=resolveAdsPageFilters(reports(),range,{eventSlug:"old",startDate:"2026-07-10",endDate:"2026-07-15",platform:"meta"});
  assert.equal(custom.startDate,"2026-07-10");
  assert.equal(custom.endDate,"2026-07-15");
  assert.equal(custom.platform,"meta");
});

test("event status and reporting day use New York midnight", () => {
  assert.equal(adsReportingToday(new Date("2026-11-03T02:00:00Z")),"2026-11-02");
  assert.equal(adsReportingToday(now),"2026-11-03");
});
