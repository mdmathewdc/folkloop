'use client';

import { ScrollText } from 'lucide-react';
import { formatInGameTime } from '@/lib/clock';
import type { VillagerEventRecord } from '@/lib/types';

interface ActivityFeedProps {
  events: VillagerEventRecord[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="rounded-2xl border-4 border-wood bg-parchment p-4 shadow-cozy">
      <div className="mb-3 flex items-center justify-between border-b-2 border-wood/15 pb-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-wood" />
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-wood">
            Village Chronicle
          </h3>
        </div>
        <span className="rounded-md bg-wood/10 px-2 py-0.5 font-pixel text-[10px] font-bold text-wood/75">
          {events.length} PERSISTED EVENTS
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-xs font-medium text-wood/60">
          Waiting for Bob&apos;s first durable activity event from PostgreSQL...
        </p>
      ) : (
        <ul className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
          {events.map((ev) => {
            const isTheft = ev.eventType === 'BREAD_STOLEN';
            const isCan = ev.eventType === 'CONTINUED_AS_NEW';
            const isFeed = ev.eventType === 'FED_BY_PLAYER';

            return (
              <li
                key={ev.id}
                className={`flex items-baseline gap-2.5 rounded-lg border px-3 py-1.5 text-xs ${
                  isTheft
                    ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
                    : isCan
                      ? 'border-indigo-400/40 bg-indigo-50 text-indigo-900'
                      : isFeed
                        ? 'border-moss/40 bg-moss/10 text-moss'
                        : 'border-wood/15 bg-white/70 text-wood'
                }`}
              >
                <span className="shrink-0 font-pixel text-[11px] font-bold opacity-80">
                  D{ev.inGameDay} {formatInGameTime(ev.inGameHour, ev.inGameMinute)}
                </span>
                <span className="font-semibold">{ev.description}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
