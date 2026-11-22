'use client';

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { VillagerState, WorkflowInspectorInfo } from '@/lib/types';

interface TemporalInspectorProps {
  open: boolean;
  onToggle: () => void;
  inspector: WorkflowInspectorInfo | null;
  state: VillagerState | null;
  stateSource: 'temporal_query' | 'postgres_snapshot';
  onRefresh: () => void;
}

export default function TemporalInspector({
  open,
  onToggle,
  inspector,
  state,
  stateSource,
  onRefresh,
}: TemporalInspectorProps) {
  return (
    <section className="rounded-2xl border-4 border-wood bg-[#2b2118] text-[#f6efe0] shadow-cozy">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-2.5">
          <Cpu className="h-4 w-4 text-honey" />
          <span className="font-pixel text-sm font-bold tracking-wide text-honey">
            TEMPORAL INSPECTOR
          </span>
          <span className="hidden rounded bg-white/10 px-2 py-0.5 text-[11px] text-[#e8dcc4] sm:inline">
            Developer Execution View
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#e8dcc4]/80">
          {inspector && (
            <span className="hidden font-pixel text-[11px] md:inline">
              {inspector.workflowId} · {inspector.status} · {inspector.historyLength} events
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-white/10 p-5">
          {!inspector ? (
            <div className="py-4 text-center font-pixel text-xs text-[#e8dcc4]/70">
              Loading workflow execution metadata from Temporal Server...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-moss/30 px-2.5 py-1 font-pixel text-[11px] text-lime-200">
                    Temporal Execution Metadata
                  </span>
                  <span className="rounded-md bg-white/10 px-2.5 py-1 font-pixel text-[11px] text-[#e8dcc4]">
                    State Source: {stateSource}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                  <a
                    href={inspector.temporalUiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-honey px-3 py-1.5 text-xs font-bold text-wood hover:brightness-105"
                  >
                    Open Temporal Web UI
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/15 bg-black/25 p-4">
                  <div className="mb-2.5 flex items-center gap-1.5 font-pixel text-xs font-bold text-honey">
                    <Activity className="h-3.5 w-3.5" />
                    TEMPORAL EXECUTION METADATA
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[#e8dcc4]/60">Workflow ID</dt>
                      <dd className="font-pixel font-bold">{inspector.workflowId}</dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Status</dt>
                      <dd className="font-pixel font-bold text-lime-300">{inspector.status}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#e8dcc4]/60">Run ID</dt>
                      <dd className="truncate font-pixel text-[11px]">{inspector.runId}</dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Task Queue</dt>
                      <dd className="font-pixel">{inspector.taskQueue}</dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">History Length</dt>
                      <dd className="font-pixel">{inspector.historyLength} events</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#e8dcc4]/60">Last Completed Activity</dt>
                      <dd className="font-pixel text-[11px]">
                        {inspector.lastCompletedActivity
                          ? `${inspector.lastCompletedActivity.activityType} (${new Date(
                              inspector.lastCompletedActivity.completedAt ?? '',
                            ).toLocaleTimeString()})`
                          : 'None yet'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-white/15 bg-black/25 p-4">
                  <div className="mb-2.5 flex items-center gap-1.5 font-pixel text-xs font-bold text-sky-300">
                    <Clock className="h-3.5 w-3.5" />
                    PENDING TIMER &amp; APPLICATION STATE
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[#e8dcc4]/60">Pending Durable Timer</dt>
                      <dd className="font-pixel">
                        {inspector.pendingTimer
                          ? `#${inspector.pendingTimer.timerId} (${inspector.pendingTimer.fireDelaySeconds ?? '?'}s)`
                          : 'No open timer'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Est. Next Fire</dt>
                      <dd className="font-pixel text-[11px]">
                        {inspector.pendingTimer?.estimatedFireAt
                          ? new Date(inspector.pendingTimer.estimatedFireAt).toLocaleTimeString()
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Current Activity</dt>
                      <dd className="font-pixel font-bold text-amber-200">
                        {inspector.currentActivity ?? state?.currentActivity ?? 'Unknown'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Continue-As-New Gen</dt>
                      <dd className="font-pixel">Generation #{state?.generation ?? 1}</dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Clock Speed</dt>
                      <dd className="font-pixel">
                        {state ? `${Math.round(state.msPerInGameHour / 1000)}s = 1h` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#e8dcc4]/60">Event Seq</dt>
                      <dd className="font-pixel">#{state?.eventSeq ?? 0}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-black/25 p-4">
                <div className="mb-2 font-pixel text-xs font-bold text-honey">
                  RECENT WORKFLOW EXECUTION HISTORY (LATEST 15)
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left font-pixel text-[11px]">
                    <thead className="border-b border-white/10 text-[#e8dcc4]/60">
                      <tr>
                        <th className="py-1 pr-3">#</th>
                        <th className="py-1 pr-3">Event Type</th>
                        <th className="py-1 pr-3">Details</th>
                        <th className="py-1">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {inspector.recentEvents.map((ev) => (
                        <tr key={ev.eventId}>
                          <td className="py-1 pr-3 text-[#e8dcc4]/50">{ev.eventId}</td>
                          <td className="py-1 pr-3 font-bold text-amber-200">{ev.eventType}</td>
                          <td className="py-1 pr-3 text-[#f6efe0]/90">{ev.details || '—'}</td>
                          <td className="py-1 text-[#e8dcc4]/60">
                            {ev.eventTime ? new Date(ev.eventTime).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
