"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setPreferenceAction } from "@/app/veli/notification-actions";
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_ORDER } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/server/db/schema";

/** One switch per type; a type turned off creates neither an in-app notification nor a push. */
export function PreferenceSwitches({ preferences }: { preferences: Record<NotificationType, boolean> }) {
  const [prefs, setPrefs] = useOptimistic(preferences);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(type: NotificationType) {
    const enabled = !prefs[type];
    setError(null);
    start(async () => {
      setPrefs({ ...prefs, [type]: enabled });
      const result = await setPreferenceAction({ type, enabled });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y">
        {NOTIFICATION_TYPE_ORDER.map((type) => {
          const { icon, label, description } = NOTIFICATION_TYPES[type];
          const on = prefs[type];
          const id = `pref-${type}`;
          return (
            <li key={type} className="flex items-center gap-3 py-3">
              <span className="text-2xl" aria-hidden>
                {icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span id={id} className="font-medium">
                  {label}
                </span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-labelledby={id}
                onClick={() => toggle(type)}
                className="flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    on ? "bg-emerald-600" : "bg-muted-foreground/40",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
                      on && "translate-x-5",
                    )}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
