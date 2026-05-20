"use client";

import React, { useEffect, useState } from "react";

// Define Event interface to replace 'any'
interface Event {
  id: number | null;
  event_uuid?: string | null;
  title: string;
  speaker: string | null;
  yt_uuid?: string | null;
  luma_url?: string | null;
  luma_id?: string | null;
  slides?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  active: boolean;
}

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/events");
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to load events");
          setEvents([]);
          return;
        }

        setEvents(await response.json());
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    const onEventsChanged = () => fetchEvents();
    window.addEventListener("descinyc:events-changed", onEventsChanged);
    return () => {
      window.removeEventListener("descinyc:events-changed", onEventsChanged);
    };
  }, []);

  return (
    <div className="overflow-x-auto max-w-full mb-8">
      <h2 className="text-xl font-bold mb-2">All Events</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <>
          <table className="min-w-[800px] border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Speaker</th>
                <th className="border px-2 py-1">YouTube UUID</th>
                <th className="border px-2 py-1">Luma URL</th>
                <th className="border px-2 py-1">Luma ID</th>
                <th className="border px-2 py-1">Slides</th>
                <th className="border px-2 py-1">Created At</th>
                <th className="border px-2 py-1">Updated At</th>
                <th className="border px-2 py-1">Active</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? events : events.slice(0, 5)).map(event => (
                <tr key={event.event_uuid || event.luma_id || event.id}>
                  <td className="border px-2 py-1">{event.id ?? ""}</td>
                  <td className="border px-2 py-1">{event.title}</td>
                  <td className="border px-2 py-1">{event.speaker}</td>
                  <td className="border px-2 py-1">{event.yt_uuid}</td>
                  <td className="border px-2 py-1 whitespace-nowrap max-w-xs truncate">{event.luma_url}</td>
                  <td className="border px-2 py-1">{event.luma_id}</td>
                  <td className="border px-2 py-1 whitespace-nowrap max-w-xs truncate">{event.slides}</td>
                  <td className="border px-2 py-1 whitespace-nowrap">{event.created_at ? new Date(event.created_at).toLocaleString() : ""}</td>
                  <td className="border px-2 py-1 whitespace-nowrap">{event.updated_at ? new Date(event.updated_at).toLocaleString() : ""}</td>
                  <td className="border px-2 py-1 text-center">{event.active ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length > 5 && (
            <button
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? "Show Less" : `Show All (${events.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
} 
