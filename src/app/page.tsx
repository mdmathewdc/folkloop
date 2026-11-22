'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import ActivityFeed from '@/components/ActivityFeed';
import CharacterPanel from '@/components/CharacterPanel';
import TemporalInspector from '@/components/TemporalInspector';
import {
  ApiError,
  feedBob,
  fetchBobEvents,
  fetchBobInspector,
  fetchBobNotifications,
  fetchBobState,
  stealBobBread,
  wakeBob,
} from '@/lib/api';
import { formatInGameTime, getInGameTime } from '@/lib/clock';
import type {
  VillagerEventRecord,
  VillagerNotificationRecord,
  VillagerState,
  WorkflowInspectorInfo,
} from '@/lib/types';

const VillageCanvas = dynamic(() => import('@/components/VillageCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border-4 border-wood bg-[#a8d5e5] font-pixel text-sm font-bold text-wood shadow-cozy">
      Loading Folkloop Village...
    </div>
  ),
});

export default function HomePage() {
  const [villagerState, setVillagerState] = useState<VillagerState | null>(null);
  const [stateSource, setStateSource] = useState<'temporal_query' | 'postgres_snapshot'>(
    'temporal_query',
  );
  const [workerOnline, setWorkerOnline] = useState(true);
  const [workerWarning, setWorkerWarning] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [events, setEvents] = useState<VillagerEventRecord[]>([]);
  const [notifications, setNotifications] = useState<VillagerNotificationRecord[]>([]);
  const [inspector, setInspector] = useState<WorkflowInspectorInfo | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [upsetPulse, setUpsetPulse] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const refreshData = useCallback(async () => {
    try {
      const [stateRes, eventsList, notifsList] = await Promise.all([
        fetchBobState(),
        fetchBobEvents(40),
        fetchBobNotifications(10),
      ]);
      setVillagerState(stateRes.state);
      setStateSource(stateRes.source);
      setWorkerOnline(stateRes.workerOnline);
      setWorkerWarning(stateRes.warning ?? null);
      setEvents(eventsList);
      setNotifications(notifsList);
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
    const poll = setInterval(() => {
      void refreshData();
    }, 2000);
    return () => clearInterval(poll);
  }, [refreshData]);

  useEffect(() => {
    if (!inspectorOpen) return;
    void refreshInspector();
    const poll = setInterval(() => {
      void refreshInspector();
    }, 3000);
    return () => clearInterval(poll);
  }, [inspectorOpen, refreshInspector]);

  useEffect(() => {
    const tick = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(tick);
  }, []);

  const displayTime = useMemo(() => {
    if (!villagerState) {
      return { day: 1, hour: 7, minute: 0 };
    }
    if (!workerOnline) {
      return {
        day: villagerState.currentDay,
        hour: villagerState.currentHour,
        minute: villagerState.currentMinute,
      };
    }
    const interpolated = getInGameTime(nowMs, {
      simulationEpochMs: villagerState.simulationEpochMs,
      msPerInGameHour: villagerState.msPerInGameHour,
    });
    return {
      day: interpolated.day,
      hour: interpolated.hour,
      minute: interpolated.minute,
    };
  }, [villagerState, workerOnline, nowMs]);

  const handleFeed = async () => {
    try {
      const res = await feedBob({ amount: 30, foodItem: 'a warm cinnamon bun' });
      setVillagerState(res.state);
      setFeedback({ type: 'success', message: res.message });
      await refreshData();
      if (inspectorOpen) void refreshInspector();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to feed Bob.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleWake = async () => {
    try {
      const res = await wakeBob('Player rang the morning bell');
      setFeedback({ type: 'info', message: res.message });
      setTimeout(() => {
        void refreshData();
        if (inspectorOpen) void refreshInspector();
      }, 400);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send Wake Up signal.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const handleStealBread = async () => {
    try {
      const res = await stealBobBread({ thief: 'Someone', loaves: 1 });
      setUpsetPulse((p) => p + 1);
      setFeedback({ type: 'info', message: res.message });
      setTimeout(() => {
        void refreshData();
        if (inspectorOpen) void refreshInspector();
      }, 450);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send Steal Bread signal.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const isNight = displayTime.hour >= 20 || displayTime.hour < 6;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-4 border-wood bg-parchment px-5 py-3.5 shadow-cozy">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-wood">Folkloop</h1>
          <p className="text-xs font-semibold text-wood/70">
            Little lives. Endless stories. · Powered by Temporal.io
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border-2 border-wood/30 bg-white/80 px-3.5 py-1.5 font-pixel text-xs font-bold text-wood">
            {isNight ? (
              <Moon className="h-4 w-4 text-indigo-700" />
            ) : (
              <Sun className="h-4 w-4 text-honey" />
            )}
            <span>DAY {displayTime.day}</span>
            <span className="text-wood/35">|</span>
            <Clock className="h-3.5 w-3.5 text-terracotta" />
            <span className="text-terracotta">
              {formatInGameTime(displayTime.hour, displayTime.minute)}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 font-pixel text-[11px] font-bold ${
              workerOnline
                ? 'border-moss/50 bg-moss/15 text-moss'
                : 'border-terracotta/50 bg-terracotta/15 text-terracotta'
            }`}
          >
            {workerOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {workerOnline ? 'WORKER ONLINE' : 'WORKER OFFLINE'}
          </div>
        </div>
      </header>

      {connectionError && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-terracotta bg-terracotta/15 px-4 py-3 text-xs font-bold text-terracotta">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{connectionError}</span>
        </div>
      )}

      {!workerOnline && workerWarning && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-honey bg-honey/25 px-4 py-3 text-xs font-bold text-wood">
          <AlertTriangle className="h-4 w-4 shrink-0 text-terracotta" />
          <span>{workerWarning}</span>
        </div>
      )}

      <main className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <VillageCanvas
            sceneState={{
              activity: villagerState?.currentActivity ?? 'SLEEPING',
              location: villagerState?.currentLocation ?? 'HOME',
              hour: displayTime.hour,
              minute: displayTime.minute,
              happiness: villagerState?.happiness ?? 75,
              upsetPulse,
            }}
          />
          <ActivityFeed events={events} />
        </div>

        <aside className="lg:col-span-4">
          <CharacterPanel
            state={villagerState}
            displayHour={displayTime.hour}
            displayMinute={displayTime.minute}
            workerOnline={workerOnline}
            notifications={notifications}
            onFeed={handleFeed}
            onWake={handleWake}
            onStealBread={handleStealBread}
            feedback={feedback}
          />
        </aside>
      </main>

      <TemporalInspector
        open={inspectorOpen}
        onToggle={() => setInspectorOpen((o) => !o)}
        inspector={inspector}
        state={villagerState}
        stateSource={stateSource}
        onRefresh={() => void refreshInspector()}
      />
    </div>
  );
}
