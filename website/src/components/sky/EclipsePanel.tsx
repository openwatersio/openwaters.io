import { Fragment } from "react";
import type { LunarEclipse, LunarEclipseVisibility } from "@openwaters/almanac";

import { DateTime } from "../DateTime";

export interface EclipseCardProps {
  heading: string;
  eclipse: LunarEclipse;
  visibility: LunarEclipseVisibility;
  tz: string;
}

const CONTACTS = [
  ["p1", "Penumbra begins"],
  ["u1", "Partial begins"],
  ["u2", "Totality begins"],
  ["u3", "Totality ends"],
  ["u4", "Partial ends"],
  ["p4", "Penumbra ends"],
] as const;

const KIND_LABEL: Record<LunarEclipse["kind"], string> = {
  total: "Total",
  partial: "Partial",
  penumbral: "Penumbral",
};

export function EclipseCard({
  heading,
  eclipse,
  visibility,
  tz,
}: EclipseCardProps) {
  const alt = Math.round(visibility.moonGeometricAltAtPeakDeg);

  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">{heading}</h3>
        <span className="rounded-full bg-(--accent-bg) px-3 py-1 text-xs font-semibold tracking-wide text-(--accent) uppercase">
          {KIND_LABEL[eclipse.kind]}
        </span>
      </div>

      <div>
        <div className="text-2xl font-semibold">
          <DateTime
            datetime={eclipse.peak}
            timeZone={tz}
            month="long"
            day="numeric"
            year="numeric"
          />
        </div>
        <div className="text-(--text-secondary)">
          Greatest eclipse at{" "}
          <DateTime
            datetime={eclipse.peak}
            timeZone={tz}
            hour="2-digit"
            minute="2-digit"
            timeZoneName="short"
          />
        </div>
      </div>

      <div
        className={
          visibility.visibleAtPeak
            ? "rounded-lg bg-(--status-green-bg) px-3 py-2 text-sm text-(--status-green-text)"
            : "rounded-lg bg-(--surface-subtle) px-3 py-2 text-sm text-(--text-secondary)"
        }
      >
        {visibility.visibleAtPeak
          ? `Visible from here — the Moon is ${alt}° above the horizon at greatest eclipse.`
          : `Not visible from here — the Moon is ${Math.abs(alt)}° below the horizon at greatest eclipse.`}
      </div>

      {/* The site's base `dl` is already a two-column grid, so dt/dd stay
          direct children — a wrapper div per row fights it into two columns. */}
      <dl>
        {CONTACTS.map(([key, label]) => {
          const time = eclipse[key];
          if (!time) return null; // absent for this eclipse kind
          const dim = visibility.contactsVisible[key] ? "" : "opacity-40";
          const title = visibility.contactsVisible[key]
            ? undefined
            : "Moon below the horizon";
          return (
            <Fragment key={key}>
              <dt className={dim} title={title}>
                {label}
              </dt>
              <dd className={`text-right tabular-nums ${dim}`} title={title}>
                <DateTime
                  datetime={time}
                  timeZone={tz}
                  hour="2-digit"
                  minute="2-digit"
                />
              </dd>
            </Fragment>
          );
        })}
        {eclipse.magUmbral > 0 && (
          <>
            <dt className="mt-1 border-t border-(--border-subtle) pt-1">
              Umbral magnitude
            </dt>
            <dd className="mt-1 border-t border-(--border-subtle) pt-1 text-right tabular-nums">
              {eclipse.magUmbral.toFixed(3)}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
