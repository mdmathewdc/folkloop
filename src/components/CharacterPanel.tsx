'use client';

import { useState } from 'react';
import {
  Bell,
  Croissant,
  Flame,
  Heart,
  MapPin,
  Moon,
  Smile,
  Sparkles,
  Sun,
  Utensils,
  Zap,
} from 'lucide-react';
import { formatInGameTime } from '@/lib/clock';
import type { VillagerActivity, VillagerNotificationRecord, VillagerState } from '@/lib/types';

interface CharacterPanelProps {
  state: VillagerState | null;
  displayHour: number;
  displayMinute: number;
  workerOnline: boolean;
  notifications: VillagerNotificationRecord[];
  onFeed: () => Promise<void>;
  onWake: () => Promise<void>;
  onStealBread: () => Promise<void>;
  feedback: { type: 'success' | 'error' | 'info'; message: string } | null;
}

const ACTIVITY_LABELS: Record<VillagerActivity, string> = {
  SLEEPING: 'Sleeping soundly',
  WAKING_UP: 'Waking up',
  WALKING: 'Walking in village',
  BAKING: 'Baking fresh bread',
  EATING: 'Eating lunch',
  RELAXING: 'Relaxing at home',
  IDLE: 'Tidying up',
};

function NeedBar({
  label,
  value,
  hint,
  barColor,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  barColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold text-wood">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-pixel text-[11px] text-wood/80">
          {value}/100 <span className="font-sans font-normal text-wood/60">({hint})</span>
        </span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-full border-2 border-wood/40 bg-parchment-dark">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function CharacterPanel({
  state,
  displayHour,
  displayMinute,
  workerOnline,
  notifications,
  onFeed,
  onWake,
  onStealBread,
  feedback,
}: CharacterPanelProps) {
  const [busyAction, setBusyAction] = useState<'feed' | 'wake' | 'steal' | null>(null);

  const handleAction = async (kind: 'feed' | 'wake' | 'steal', fn: () => Promise<void>) => {
    setBusyAction(kind);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  if (!state) {
    return (
      <div className="rounded-2xl border-4 border-wood bg-parchment p-5 shadow-cozy">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 rounded bg-parchment-dark" />
          <div className="h-4 w-full rounded bg-parchment-dark" />
          <div className="h-4 w-3/4 rounded bg-parchment-dark" />
        </div>
      </div>
    );
  }

  const isSleeping = state.currentActivity === 'SLEEPING';
  const isFull = state.hunger <= 5;
  const hungerColor =
    state.hunger >= 75 ? 'bg-terracotta' : state.hunger >= 45 ? 'bg-honey' : 'bg-moss';
  const energyColor =
    state.energy <= 25 ? 'bg-terracotta' : state.energy <= 55 ? 'bg-honey' : 'bg-moss';
  const happinessColor =
    state.happiness <= 30 ? 'bg-berry' : state.happiness <= 60 ? 'bg-honey' : 'bg-moss-light';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-4 border-wood bg-parchment p-5 shadow-cozy">
        <div className="flex items-start justify-between gap-3 border-b-2 border-wood/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-wood bg-honey/30 text-wood shadow-cozy-sm">
              <Croissant className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight text-wood">
                {state.name} the {state.occupation}
              </h2>
              <p className="text-xs font-semibold text-wood/70">
                Autonomous Villager · Gen #{state.generation}
              </p>
            </div>
          </div>
          <div className="rounded-lg border-2 border-wood/30 bg-white/70 px-2.5 py-1 text-right font-pixel">
            <div className="text-[11px] font-bold text-wood">DAY {state.currentDay}</div>
            <div className="text-xs font-bold text-terracotta">
              {formatInGameTime(displayHour, displayMinute)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl border-2 border-wood/20 bg-white/60 px-3 py-2">
            {isSleeping ? (
              <Moon className="h-4 w-4 text-indigo-700" />
            ) : (
              <Sparkles className="h-4 w-4 text-honey" />
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-wood/55">
                Activity
              </div>
              <div className="font-bold text-wood">
                {ACTIVITY_LABELS[state.currentActivity] ?? state.currentActivity}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border-2 border-wood/20 bg-white/60 px-3 py-2">
            <MapPin className="h-4 w-4 text-moss" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-wood/55">
                Location
              </div>
              <div className="font-bold text-wood">{state.currentLocation}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <NeedBar
            label="Hunger"
            value={state.hunger}
            hint={state.hunger <= 20 ? 'Full' : state.hunger >= 70 ? 'Hungry!' : 'Peckish'}
            barColor={hungerColor}
            icon={<Utensils className="h-3.5 w-3.5 text-terracotta" />}
          />
          <NeedBar
            label="Energy"
            value={state.energy}
            hint={state.energy >= 70 ? 'Rested' : state.energy <= 30 ? 'Tired' : 'Steady'}
            barColor={energyColor}
            icon={<Zap className="h-3.5 w-3.5 text-honey" />}
          />
          <NeedBar
            label="Happiness"
            value={state.happiness}
            hint={state.happiness >= 70 ? 'Cheerful' : state.happiness <= 35 ? 'Upset' : 'Content'}
            barColor={happinessColor}
            icon={<Smile className="h-3.5 w-3.5 text-moss" />}
          />
        </div>

        <div className="mt-5 space-y-2 border-t-2 border-wood/15 pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-wood/60">
            Interact with Bob
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <button
              type="button"
              disabled={busyAction !== null || !workerOnline}
              onClick={() => void handleAction('feed', onFeed)}
              title={
                !workerOnline
                  ? 'Worker is offline — Temporal Updates require an active Worker'
                  : isSleeping
                    ? 'Bob is sleeping (clicking will test Temporal Update validation!)'
                    : isFull
                      ? 'Bob is already full (clicking will test Temporal Update validation!)'
                      : 'Send a validated Temporal Update to feed Bob'
              }
              className="flex items-center justify-between rounded-xl border-2 border-wood bg-moss px-3.5 py-2.5 text-sm font-bold text-white shadow-cozy-sm transition hover:brightness-105 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {busyAction === 'feed' ? 'Feeding...' : 'Feed Bob'}
              </span>
              <span className="rounded bg-black/20 px-1.5 py-0.5 font-pixel text-[10px]">
                UPDATE
              </span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleAction('wake', onWake)}
              className={`flex items-center justify-between rounded-xl border-2 border-wood px-3.5 py-2.5 text-sm font-bold shadow-cozy-sm transition hover:brightness-105 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSleeping ? 'bg-honey text-wood' : 'bg-parchment-dark text-wood/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                {busyAction === 'wake' ? 'Sending...' : isSleeping ? 'Wake Up' : 'Wake Up (Awake)'}
              </span>
              <span className="rounded bg-wood/15 px-1.5 py-0.5 font-pixel text-[10px]">
                SIGNAL
              </span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleAction('steal', onStealBread)}
              className="flex items-center justify-between rounded-xl border-2 border-wood bg-terracotta px-3.5 py-2.5 text-sm font-bold text-white shadow-cozy-sm transition hover:brightness-105 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                {busyAction === 'steal' ? 'Sneaking...' : 'Steal Bread'}
              </span>
              <span className="rounded bg-black/20 px-1.5 py-0.5 font-pixel text-[10px]">
                SIGNAL
              </span>
            </button>
          </div>

          {feedback && (
            <div
              className={`mt-2 rounded-xl border-2 px-3 py-2 text-xs font-semibold ${
                feedback.type === 'error'
                  ? 'border-terracotta/50 bg-terracotta/15 text-terracotta'
                  : feedback.type === 'success'
                    ? 'border-moss/50 bg-moss/15 text-moss'
                    : 'border-honey/60 bg-honey/20 text-wood'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="rounded-2xl border-4 border-wood bg-parchment p-4 shadow-cozy">
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-wood">
            <Bell className="h-4 w-4 text-terracotta" />
            Village Alerts
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="rounded-xl border-2 border-terracotta/30 bg-white/75 px-3 py-2 text-xs"
              >
                <div className="font-bold text-terracotta">{n.title}</div>
                <div className="text-wood/85">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
