"use client";

import { Save } from "lucide-react";
import React, { useMemo, useState } from "react";

type EmailPreference = {
  type: string;
  label: string;
  description: string;
  enabled: boolean;
};

type EmailPreferencesPanelProps = {
  initialPreferences: EmailPreference[];
  databaseConfigured: boolean;
};

type StatusMessage = {
  tone: "success" | "error" | "neutral";
  text: string;
};

function preferencesToRecord(preferences: EmailPreference[]) {
  return Object.fromEntries(
    preferences.map((preference) => [preference.type, preference.enabled])
  );
}

export default function EmailPreferencesPanel({
  initialPreferences,
  databaseConfigured,
}: EmailPreferencesPanelProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savedPreferences, setSavedPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(
    databaseConfigured
      ? null
      : {
          tone: "error",
          text: "Database is not configured. Admin emails remain on.",
        }
  );

  const savedByType = useMemo(() => {
    return new Map(
      savedPreferences.map((preference) => [
        preference.type,
        preference.enabled,
      ])
    );
  }, [savedPreferences]);

  const hasChanges = preferences.some((preference) => {
    return savedByType.get(preference.type) !== preference.enabled;
  });

  const enabledCount = preferences.filter((preference) => preference.enabled).length;

  function togglePreference(type: string) {
    setPreferences((current) =>
      current.map((preference) =>
        preference.type === type
          ? { ...preference, enabled: !preference.enabled }
          : preference
      )
    );
    setStatus({ tone: "neutral", text: "Unsaved changes" });
  }

  async function savePreferences() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: preferencesToRecord(preferences) }),
      });
      const body = await response.json();

      if (!response.ok) {
        setStatus({
          tone: "error",
          text: body.error || "Could not save email preferences.",
        });
        return;
      }

      setPreferences(body.preferences);
      setSavedPreferences(body.preferences);
      setStatus({ tone: "success", text: "Email preferences saved." });
    } catch (error) {
      setStatus({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not save email preferences.",
      });
    } finally {
      setSaving(false);
    }
  }

  const statusToneClass =
    status?.tone === "success"
      ? "text-green-700"
      : status?.tone === "error"
        ? "text-red-700"
        : "text-slate-600";

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inbox controls
          </p>
          <h2 className="text-xl font-bold text-slate-950">
            Email notifications
          </h2>
        </div>
        <div className="text-sm text-slate-600">
          {enabledCount} of {preferences.length} on
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {preferences.map((preference) => (
          <div
            key={preference.type}
            className="flex flex-col gap-3 border-b border-slate-200 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium text-slate-950">{preference.label}</div>
              <div className="text-sm text-slate-600">
                {preference.description}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-sm font-medium text-slate-600">
                {preference.enabled ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={preference.enabled}
                aria-label={`${preference.label}: ${
                  preference.enabled ? "on" : "off"
                }`}
                disabled={!databaseConfigured || saving}
                onClick={() => togglePreference(preference.type)}
                className={`relative h-6 w-11 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  preference.enabled
                    ? "border-green-700 bg-green-700"
                    : "border-slate-300 bg-slate-200"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    preference.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={`min-h-5 text-sm ${statusToneClass}`}>
          {status?.text || ""}
        </div>
        <button
          type="button"
          onClick={savePreferences}
          disabled={!databaseConfigured || saving || !hasChanges}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <Save size={16} aria-hidden="true" />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </section>
  );
}
