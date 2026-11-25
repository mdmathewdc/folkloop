'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  feedBob,
  fetchBobEvents,
  fetchBobInspector,
  fetchBobState,
  stealBobBread,
  wakeBob,
} from '@/lib/api';
import { formatInGameTime, getInGameTime } from '@/lib/clock';
import type {
  VillagerActivity,
  VillagerEventRecord,
  VillagerLocation,
  VillagerState,
  WorkflowInspectorInfo,
} from '@/lib/types';

const VillageCanvas = dynamic(() => import('@/components/VillageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="gba-bezel w-full p-1.5 sm:p-2">
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 border-2 border-[#121c1a] bg-[#1b3b36] text-telemetry-mint">
        <span className="font-pixel-display text-[10px] uppercase tracking-widest">
          LOADING VILLAGE...
        </span>
      </div>
    </div>
  ),
});

const ACTIVITY_LABELS: Record<VillagerActivity, string> = {
  SLEEPING: 'SLEEPING',
  WAKING_UP: 'WAKING UP',
  GARDENING: 'GARDENING',
  WALKING: 'WALKING',
  BAKING: 'BAKING',
  FETCHING_WATER: 'FETCHING WATER',
  EATING: 'EATING',
  RESTOCKING: 'RESTOCKING',
  STROLLING: 'STROLLING',
  RELAXING: 'RELAXING',
  IDLE: 'TIDYING UP',
};

const LOCATION_LABELS: Record<VillagerLocation, string> = {
  HOME: 'COTTAGE',
  GARDEN: 'GARDEN',
  VILLAGE: 'VILLAGE',
  BAKERY: 'BAKERY',
  POND: 'POND',
  BENCH: 'BENCH',
};

function PixelEmeraldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 12 12"
      fill="none"
      className="pixel-svg shrink-0"
      aria-hidden="true"
    >
      <rect x="4" y="1" width="4" height="1" fill="#182422" />
      <rect x="3" y="2" width="1" height="1" fill="#182422" />
      <rect x="8" y="2" width="1" height="1" fill="#182422" />
      <rect x="2" y="3" width="1" height="6" fill="#182422" />
      <rect x="9" y="3" width="1" height="6" fill="#182422" />
      <rect x="3" y="9" width="1" height="1" fill="#182422" />
      <rect x="8" y="9" width="1" height="1" fill="#182422" />
      <rect x="4" y="10" width="4" height="1" fill="#182422" />
      <rect x="4" y="2" width="4" height="8" fill="#58d888" />
      <rect x="3" y="3" width="6" height="6" fill="#58d888" />
      <rect x="4" y="3" width="2" height="3" fill="#b8ffd0" />
      <rect x="7" y="4" width="2" height="5" fill="#2f9860" />
      <rect x="4" y="8" width="4" height="2" fill="#2f9860" />
    </svg>
  );
}

function PixelSunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      className="pixel-svg shrink-0"
      aria-hidden="true"
    >
      <rect x="5" y="0" width="2" height="2" fill="#e0a018" />
      <rect x="5" y="10" width="2" height="2" fill="#e0a018" />
      <rect x="0" y="5" width="2" height="2" fill="#e0a018" />
      <rect x="10" y="5" width="2" height="2" fill="#e0a018" />
      <rect x="2" y="2" width="1" height="1" fill="#e0a018" />
      <rect x="9" y="2" width="1" height="1" fill="#e0a018" />
      <rect x="2" y="9" width="1" height="1" fill="#e0a018" />
      <rect x="9" y="9" width="1" height="1" fill="#e0a018" />
      <rect x="4" y="3" width="4" height="6" fill="#f8d038" />
      <rect x="3" y="4" width="6" height="4" fill="#f8d038" />
      <rect x="4" y="4" width="2" height="2" fill="#fff4a8" />
    </svg>
  );
}

function PixelMoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      className="pixel-svg shrink-0"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="4" height="1" fill="#384c88" />
      <rect x="3" y="3" width="3" height="1" fill="#5874c0" />
      <rect x="2" y="4" width="3" height="4" fill="#5874c0" />
      <rect x="3" y="8" width="3" height="1" fill="#5874c0" />
      <rect x="4" y="9" width="4" height="1" fill="#384c88" />
      <rect x="6" y="8" width="2" height="1" fill="#7c98e0" />
      <rect x="3" y="4" width="1" height="3" fill="#a8c0f8" />
      <rect x="8" y="3" width="1" height="1" fill="#f8d038" />
      <rect x="9" y="6" width="1" height="1" fill="#f8d038" />
    </svg>
  );
}

function PixelPointer() {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 6 7"
      fill="none"
      className="pixel-svg shrink-0"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="1" height="7" fill="#283030" />
      <rect x="1" y="1" width="2" height="5" fill="#283030" />
      <rect x="3" y="2" width="2" height="3" fill="#283030" />
      <rect x="5" y="3" width="1" height="1" fill="#283030" />
    </svg>
  );
}

function PixelWarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      className="pixel-svg shrink-0"
      aria-hidden="true"
    >
      <rect x="5" y="1" width="2" height="2" fill="#283030" />
      <rect x="4" y="3" width="4" height="2" fill="#f85838" />
      <rect x="3" y="5" width="6" height="2" fill="#f85838" />
      <rect x="2" y="7" width="8" height="3" fill="#f85838" />
      <rect x="1" y="10" width="10" height="1" fill="#283030" />
      <rect x="5" y="4" width="2" height="3" fill="#f8f8f0" />
      <rect x="5" y="8" width="2" height="1" fill="#f8f8f0" />
    </svg>
  );
}

type BarTone = 'green' | 'amber' | 'red';

const HP_BAR_STYLES: Record<BarTone, { fill: string; highlight: string; shadow: string }> = {
  green: {
    fill: 'bg-gba-hp-green',
    highlight: 'bg-gba-hp-green-hi',
    shadow: 'bg-[#32a862]',
  },
  amber: {
    fill: 'bg-gba-hp-amber',
    highlight: 'bg-gba-hp-amber-hi',
    shadow: 'bg-[#c89618]',
  },
  red: {
    fill: 'bg-gba-hp-red',
    highlight: 'bg-gba-hp-red-hi',
    shadow: 'bg-[#c43020]',
  },
};

function EmeraldHpBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: BarTone;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const palette = HP_BAR_STYLES[tone];

  return (
    <div className="flex items-center gap-2.5">
      {/* Authentic GBA dark slate HP capsule */}
      <div className="flex min-w-0 flex-1 items-center gap-2 border-2 border-gba-ink bg-gba-slate px-2 py-1 shadow-[inset_0_1px_0_0_#54606c]">
        <span className="w-[62px] shrink-0 font-pixel-display text-[8px] tracking-tight text-gba-gold">
          {label}
        </span>
        <div className="relative h-3 flex-1 overflow-hidden border border-[#181e22] bg-[#1e262a] p-[1px]">
          <div
            className={`relative h-full transition-all duration-300 ${palette.fill}`}
            style={{ width: `${clamped}%` }}
          >
            {/* Top pixel highlight stripe */}
            <div className={`h-[2px] w-full ${palette.highlight}`} />
            {/* Segmented GBA bar lines */}
            <div className="gba-hp-segments pointer-events-none absolute inset-0" />
            {/* Bottom pixel shade */}
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${palette.shadow}`} />
          </div>
        </div>
      </div>

      {/* Crisp pixel numeric readout */}
      <span className="w-[58px] shrink-0 text-right font-pixel-display text-[9px] tabular-nums text-gba-ink">
        {clamped}
        <span className="text-gba-ink-soft">/100</span>
      </span>
    </div>
  );
}

export default function HomePage() {
  const [state, setState] = useState<VillagerState | null>(null);
  const [stateSource, setStateSource] = useState<'temporal_query' | 'postgres_snapshot'>(
    'temporal_query',
  );
  const [workerOnline, setWorkerOnline] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [events, setEvents] = useState<VillagerEventRecord[]>([]);
  const [inspector, setInspector] = useState<WorkflowInspectorInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'story' | 'temporal'>('story');
  const [busyAction, setBusyAction] = useState<'feed' | 'wake' | 'steal' | null>(null);
  const [upsetPulse, setUpsetPulse] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const refreshData = useCallback(async () => {
    try {
      const [stateRes, eventsList] = await Promise.all([fetchBobState(), fetchBobEvents(15)]);
      setState(stateRes.state);
      setStateSource(stateRes.source);
      setWorkerOnline(stateRes.workerOnline);
      setEvents(eventsList);
      setConnectionError(null);
    } catch (err) {
      setConnectionError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Folkloop backend. Make sure `pnpm dev` is running.',
      );
    }
  }, []);

  const refreshInspector = useCallback(async () => {
    try {
      const info = await fetchBobInspector();
      setInspector(info);
    } catch {
      // Keep previous inspector data if temporarily unreachable
    }
  }, []);

  useEffect(() => {
    void refreshData();
    const poll = setInterval(() => void refreshData(), 2000);
    return () => clearInterval(poll);
  }, [refreshData]);

  useEffect(() => {
    if (activeTab !== 'temporal') return;
    void refreshInspector();
    const poll = setInterval(() => void refreshInspector(), 3000);
    return () => clearInterval(poll);
  }, [activeTab, refreshInspector]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(tick);
  }, []);

  const displayTime = useMemo(() => {
    if (!state) return { day: 1, hour: 7, minute: 0 };
    if (!workerOnline) {
      return { day: state.currentDay, hour: state.currentHour, minute: state.currentMinute };
    }
    const t = getInGameTime(nowMs, {
      simulationEpochMs: state.simulationEpochMs,
      msPerInGameHour: state.msPerInGameHour,
    });
    return { day: t.day, hour: t.hour, minute: t.minute };
  }, [state, workerOnline, nowMs]);

  const runAction = async (kind: 'feed' | 'wake' | 'steal', fn: () => Promise<void>) => {
    setBusyAction(kind);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const handleFeed = () =>
    runAction('feed', async () => {
      try {
        const res = await feedBob({ amount: 30, foodItem: 'a warm cinnamon bun' });
        setState(res.state);
        setFeedback({ type: 'success', message: res.message });
        await refreshData();
        if (activeTab === 'temporal') void refreshInspector();
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Failed to feed Bob.',
        });
      }
    });

  const handleWake = () =>
    runAction('wake', async () => {
      try {
        const res = await wakeBob('Player rang the morning bell');
        setFeedback({ type: 'info', message: res.message });
        setTimeout(() => {
          void refreshData();
          if (activeTab === 'temporal') void refreshInspector();
        }, 400);
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Failed to send Wake signal.',
        });
      }
    });

  const handleStealBread = () =>
    runAction('steal', async () => {
      try {
        const res = await stealBobBread({ thief: 'Someone', loaves: 1 });
        setUpsetPulse((p) => p + 1);
        setFeedback({ type: 'info', message: res.message });
        setTimeout(() => {
          void refreshData();
          if (activeTab === 'temporal') void refreshInspector();
        }, 450);
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Failed to send Steal Bread signal.',
        });
      }
    });

  const isNight = displayTime.hour >= 20 || displayTime.hour < 6;
  const isSleeping = state?.currentActivity === 'SLEEPING';
  const statusBadge = state
    ? `${LOCATION_LABELS[state.currentLocation]} · ${ACTIVITY_LABELS[state.currentActivity]}`
    : undefined;

  const hungerVal = state?.hunger ?? 0;
  const energyVal = state?.energy ?? 0;
  const happyVal = state?.happiness ?? 0;

  const hungerTone: BarTone = hungerVal >= 75 ? 'red' : hungerVal >= 45 ? 'amber' : 'green';
  const energyTone: BarTone = energyVal <= 25 ? 'red' : energyVal <= 55 ? 'amber' : 'green';
  const happyTone: BarTone = happyVal <= 30 ? 'red' : happyVal <= 60 ? 'amber' : 'green';

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-6 sm:py-5">
      {/* Minimal GBA Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="gba-capsule flex items-center gap-2 px-3 py-1.5">
            <PixelEmeraldIcon />
            <h1 className="font-pixel-display text-xs tracking-wider text-gba-ink sm:text-[13px]">
              FOLKLOOP
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Classic GBA Clock Capsule */}
          <div className="gba-capsule flex items-center gap-2 px-2.5 py-1.5">
            {isNight ? <PixelMoonIcon /> : <PixelSunIcon />}
            <span className="font-pixel-display text-[9px] uppercase tracking-wide text-gba-ink sm:text-[10px]">
              DAY {displayTime.day} · {formatInGameTime(displayTime.hour, displayTime.minute)}
            </span>
          </div>

          {/* Compact Worker Status LED */}
          <div
            className="gba-capsule flex items-center gap-2 px-2.5 py-1.5"
            title={
              workerOnline
                ? 'Temporal Worker is polling'
                : 'Worker is offline — showing Postgres snapshot'
            }
          >
            <span
              className={`inline-block h-2.5 w-2.5 border border-gba-ink ${
                workerOnline
                  ? 'bg-gba-hp-green shadow-[0_0_6px_#58d888]'
                  : 'bg-gba-hp-red shadow-[0_0_6px_#f85838]'
              }`}
            />
            <span className="font-pixel-display text-[9px] uppercase text-gba-ink">
              {workerOnline ? 'WORKER' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Error / Worker Offline GBA Banners */}
      {connectionError && (
        <div className="flex items-center gap-2.5 border-[3px] border-gba-ink bg-[#fff2ee] px-3.5 py-2 text-xs text-[#9e2618] shadow-gba-sm">
          <PixelWarningIcon />
          <span className="font-pixel-body">{connectionError}</span>
        </div>
      )}

      {!workerOnline && !connectionError && (
        <div className="flex items-center gap-2.5 border-[3px] border-gba-ink bg-[#fff9e0] px-3.5 py-2 text-xs text-gba-ink shadow-gba-sm">
          <PixelWarningIcon />
          <span className="font-pixel-body">
            <strong className="font-pixel-display text-[9px] uppercase text-[#b83220]">
              WORKER OFFLINE:
            </strong>{' '}
            Showing last PostgreSQL snapshot while Temporal keeps Bob&apos;s timers ticking.
          </span>
        </div>
      )}

      {/* Hero Village Viewport */}
      <VillageCanvas
        sceneState={{
          activity: state?.currentActivity ?? 'SLEEPING',
          location: state?.currentLocation ?? 'HOME',
          hour: displayTime.hour,
          minute: displayTime.minute,
          happiness: state?.happiness ?? 75,
          upsetPulse,
        }}
        statusBadge={statusBadge}
      />

      {/* GBA Battle-HUD Status Bars + Pokémon Emerald Command Menu */}
      <section className="gba-window p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr] md:items-stretch">
          {/* Left: Battle-HUD Need Bars */}
          <div className="flex flex-col justify-between border-2 border-gba-ink bg-[#f2f4ea] p-3 shadow-[inset_2px_2px_0_0_#ffffff]">
            <div className="mb-2.5 flex items-center justify-between border-b-2 border-dashed border-[#c2d0c8] pb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-pixel-display text-[10px] uppercase tracking-wide text-gba-ink">
                  BOB
                </span>
                <span className="border border-gba-teal-dark bg-gba-teal px-1.5 py-0.5 font-pixel-display text-[7px] uppercase text-gba-cream">
                  BAKER
                </span>
              </div>
              <span className="font-pixel-display text-[8px] uppercase text-gba-ink-soft">
                GEN #{state?.generation ?? 1}
              </span>
            </div>

            <div className="space-y-2">
              <EmeraldHpBar label="HUNGER" value={hungerVal} tone={hungerTone} />
              <EmeraldHpBar label="ENERGY" value={energyVal} tone={energyTone} />
              <EmeraldHpBar label="HAPPY" value={happyVal} tone={happyTone} />
            </div>
          </div>

          {/* Right: Classic Pokémon Emerald Command Box */}
          <div className="flex flex-col justify-between border-2 border-gba-ink bg-gba-cream p-2.5 shadow-[inset_0_0_0_2px_#c8dcd2]">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="font-pixel-display text-[8px] uppercase tracking-wider text-gba-teal-dark">
                WHAT WILL YOU DO?
              </span>
              {!workerOnline && (
                <span className="font-pixel-display text-[7px] uppercase text-[#c43020]">
                  LIMITED
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {/* Feed */}
              <button
                type="button"
                disabled={busyAction !== null || !workerOnline}
                onClick={() => void handleFeed()}
                title="Give Bob a warm cinnamon bun"
                className="group flex w-full items-center justify-between border-2 border-transparent px-2 py-1.5 text-left transition-colors hover:border-gba-ink hover:bg-[#e4f4ea] focus-visible:border-gba-ink focus-visible:bg-[#e4f4ea] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 ${
                      busyAction === 'feed'
                        ? 'opacity-100 animate-gba-cursor'
                        : 'opacity-0 group-hover:opacity-100 group-hover:animate-gba-cursor group-focus-visible:opacity-100 group-focus-visible:animate-gba-cursor group-disabled:opacity-0'
                    }`}
                  >
                    <PixelPointer />
                  </span>
                  <span className="font-pixel-display text-[10px] uppercase tracking-wide text-gba-ink">
                    {busyAction === 'feed' ? 'FEEDING...' : 'FEED'}
                  </span>
                </span>
                <span className="border border-[#2b6654] bg-[#d8f2e2] px-1.5 py-0.5 font-pixel-display text-[7px] uppercase text-[#205842]">
                  UPDATE
                </span>
              </button>

              {/* Wake */}
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleWake()}
                title="Ring the morning bell if Bob is sleeping"
                className={`group flex w-full items-center justify-between border-2 px-2 py-1.5 text-left transition-colors focus-visible:border-gba-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSleeping
                    ? 'border-[#c49318] bg-[#fff5cf] hover:border-gba-ink hover:bg-[#ffebb0]'
                    : 'border-transparent hover:border-gba-ink hover:bg-[#f4f0dc]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 ${
                      busyAction === 'wake'
                        ? 'opacity-100 animate-gba-cursor'
                        : 'opacity-0 group-hover:opacity-100 group-hover:animate-gba-cursor group-focus-visible:opacity-100 group-focus-visible:animate-gba-cursor group-disabled:opacity-0'
                    }`}
                  >
                    <PixelPointer />
                  </span>
                  <span className="font-pixel-display text-[10px] uppercase tracking-wide text-gba-ink">
                    {busyAction === 'wake' ? 'WAKING...' : 'WAKE'}
                  </span>
                </span>
                <span className="border border-[#9c7618] bg-[#fdf0be] px-1.5 py-0.5 font-pixel-display text-[7px] uppercase text-[#7a5808]">
                  SIGNAL
                </span>
              </button>

              {/* Steal Bread */}
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleStealBread()}
                title="Swipe a loaf from Bob's bakery"
                className="group flex w-full items-center justify-between border-2 border-transparent px-2 py-1.5 text-left transition-colors hover:border-gba-ink hover:bg-[#fde8e2] focus-visible:border-gba-ink focus-visible:bg-[#fde8e2] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 ${
                      busyAction === 'steal'
                        ? 'opacity-100 animate-gba-cursor'
                        : 'opacity-0 group-hover:opacity-100 group-hover:animate-gba-cursor group-focus-visible:opacity-100 group-focus-visible:animate-gba-cursor group-disabled:opacity-0'
                    }`}
                  >
                    <PixelPointer />
                  </span>
                  <span className="font-pixel-display text-[10px] uppercase tracking-wide text-[#a82a1c]">
                    {busyAction === 'steal' ? 'STEALING...' : 'STEAL BREAD'}
                  </span>
                </span>
                <span className="border border-[#a82a1c] bg-[#fce0d8] px-1.5 py-0.5 font-pixel-display text-[7px] uppercase text-[#982418]">
                  SIGNAL
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Classic Pokémon Emerald RPG Dialogue Feedback Strip */}
        {feedback && (
          <div
            className={`gba-dialogue-strip mt-3 flex items-center justify-between gap-3 px-3 py-2 text-xs ${
              feedback.type === 'error'
                ? 'border-l-[6px] border-l-gba-hp-red text-[#9e2618]'
                : feedback.type === 'success'
                  ? 'border-l-[6px] border-l-gba-hp-green text-[#1e5c3c]'
                  : 'border-l-[6px] border-l-gba-gold text-gba-ink'
            }`}
          >
            <span className="font-pixel-body leading-snug">{feedback.message}</span>
            <span
              className="animate-gba-arrow shrink-0 font-pixel-display text-[8px] text-gba-hp-red"
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
        )}
      </section>

      {/* 2-Tab Emerald Box: STORY | TEMPORAL */}
      <section className="gba-window overflow-hidden p-3 sm:p-4">
        {/* GBA Tab Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-gba-ink pb-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('story')}
              className={`border-2 border-gba-ink px-3 py-1.5 font-pixel-display text-[9px] uppercase tracking-wide transition-colors ${
                activeTab === 'story'
                  ? 'bg-gba-teal text-gba-cream shadow-[inset_0_2px_0_0_#70b898]'
                  : 'bg-gba-cream-dim text-gba-ink-soft hover:bg-[#dce6de] hover:text-gba-ink'
              }`}
            >
              STORY
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('temporal')}
              className={`border-2 border-gba-ink px-3 py-1.5 font-pixel-display text-[9px] uppercase tracking-wide transition-colors ${
                activeTab === 'temporal'
                  ? 'bg-telemetry-bg text-telemetry-mint shadow-[inset_0_2px_0_0_#386860]'
                  : 'bg-gba-cream-dim text-gba-ink-soft hover:bg-[#dce6de] hover:text-gba-ink'
              }`}
            >
              TEMPORAL
            </button>
          </div>

          {activeTab === 'temporal' && inspector && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void refreshInspector()}
                className="border-2 border-gba-ink bg-gba-cream-dim px-2.5 py-1 font-pixel-display text-[8px] uppercase text-gba-ink transition-colors hover:bg-[#dce6de]"
              >
                ↻ REFRESH
              </button>
              <a
                href={inspector.temporalUiUrl}
                target="_blank"
                rel="noreferrer"
                className="border-2 border-gba-ink bg-gba-gold px-2.5 py-1 font-pixel-display text-[8px] uppercase text-gba-ink shadow-[inset_0_2px_0_0_#fce888] transition-colors hover:bg-[#ffe060]"
              >
                TEMPORAL UI ↗
              </a>
            </div>
          )}
        </div>

        {/* Tab Body */}
        {activeTab === 'story' ? (
          <div className="border-2 border-gba-ink bg-[#fcfcf6] p-3 shadow-[inset_0_0_0_2px_#dde8e0]">
            {events.length === 0 ? (
              <p className="py-5 text-center font-pixel-body text-xs text-gba-ink-soft">
                Waiting for Bob&apos;s first event...
              </p>
            ) : (
              <ul className="gba-scroll max-h-48 divide-y divide-dashed divide-[#d0dcd4] overflow-y-auto pr-1">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-baseline gap-3 py-1.5 first:pt-0 last:pb-0"
                  >
                    <span className="shrink-0 border border-[#a8c4b8] bg-[#eaf3ee] px-1.5 py-0.5 font-pixel-display text-[8px] tabular-nums text-gba-teal-dark">
                      D{ev.inGameDay} {formatInGameTime(ev.inGameHour, ev.inGameMinute)}
                    </span>
                    <span
                      className={`font-pixel-body text-xs leading-relaxed ${
                        ev.eventType === 'BREAD_STOLEN'
                          ? 'text-[#c03020]'
                          : ev.eventType === 'FED_BY_PLAYER'
                            ? 'text-[#22744a]'
                            : ev.eventType === 'WOKEN_BY_PLAYER'
                              ? 'text-[#94640e]'
                              : 'text-gba-ink'
                      }`}
                    >
                      {ev.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* Temporal Telemetry Screen */
          <div className="telemetry-screen p-3 sm:p-3.5">
            <div className="mb-3 flex items-center justify-between border-b border-telemetry-border pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 bg-telemetry-mint shadow-[0_0_6px_#68e8a8]" />
                <span className="font-pixel-display text-[8px] uppercase tracking-widest text-telemetry-mint">
                  DURABLE WORKFLOW TELEMETRY
                </span>
              </div>
              <span className="font-pixel-display text-[8px] uppercase text-telemetry-amber">
                {stateSource === 'temporal_query' ? 'LIVE QUERY' : 'PG SNAPSHOT'}
              </span>
            </div>

            {!inspector ? (
              <p className="py-6 text-center font-pixel-display text-[9px] uppercase tracking-wider text-telemetry-mint/80">
                SCANNING WORKFLOW EXECUTION...
              </p>
            ) : (
              <div className="space-y-3">
                {/* 4 Telemetry Readout Cells */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="border border-telemetry-border bg-telemetry-panel px-2.5 py-2">
                    <div className="mb-1 font-pixel-display text-[7px] uppercase text-telemetry-mint/65">
                      WORKFLOW ID
                    </div>
                    <div
                      className="truncate font-pixel-display text-[9px] text-telemetry-mint"
                      title={inspector.workflowId}
                    >
                      {inspector.workflowId}
                    </div>
                  </div>

                  <div className="border border-telemetry-border bg-telemetry-panel px-2.5 py-2">
                    <div className="mb-1 font-pixel-display text-[7px] uppercase text-telemetry-mint/65">
                      STATUS / GEN
                    </div>
                    <div className="truncate font-pixel-display text-[9px] text-telemetry-mint">
                      {inspector.status} · #{state?.generation ?? 1}
                    </div>
                  </div>

                  <div className="border border-telemetry-border bg-telemetry-panel px-2.5 py-2">
                    <div className="mb-1 font-pixel-display text-[7px] uppercase text-telemetry-mint/65">
                      NEXT TIMER
                    </div>
                    <div className="truncate font-pixel-display text-[9px] text-telemetry-amber">
                      {inspector.pendingTimer?.estimatedFireAt
                        ? new Date(inspector.pendingTimer.estimatedFireAt).toLocaleTimeString()
                        : '—'}
                    </div>
                  </div>

                  <div className="border border-telemetry-border bg-telemetry-panel px-2.5 py-2">
                    <div className="mb-1 font-pixel-display text-[7px] uppercase text-telemetry-mint/65">
                      HISTORY
                    </div>
                    <div className="truncate font-pixel-display text-[9px] text-telemetry-mint">
                      {inspector.historyLength} EVTS
                    </div>
                  </div>
                </div>

                {/* Compact Event History Tape */}
                <div className="border border-telemetry-border bg-[#102222] p-2.5">
                  <div className="mb-1.5 flex items-center justify-between border-b border-telemetry-border/60 pb-1">
                    <span className="font-pixel-display text-[7px] uppercase tracking-wider text-telemetry-mint/70">
                      EVENT HISTORY TAPE
                    </span>
                    <span className="font-pixel-body text-[10px] text-telemetry-mint/60">
                      LATEST {Math.min(8, inspector.recentEvents.length)}
                    </span>
                  </div>
                  <div className="telemetry-scroll max-h-36 space-y-1 overflow-y-auto pr-1 font-pixel-body text-[11px]">
                    {inspector.recentEvents.length === 0 ? (
                      <div className="py-2 text-center text-telemetry-mint/60">
                        No history events recorded yet.
                      </div>
                    ) : (
                      inspector.recentEvents.slice(0, 8).map((ev) => (
                        <div key={ev.eventId} className="flex items-baseline gap-2.5">
                          <span className="w-7 shrink-0 font-pixel-display text-[8px] text-telemetry-mint/50">
                            #{ev.eventId}
                          </span>
                          <span className="shrink-0 text-telemetry-amber">
                            {ev.eventType}
                          </span>
                          <span className="truncate text-[#d4f4e4]/85">{ev.details}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
