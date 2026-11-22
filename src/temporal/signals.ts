import { defineQuery, defineSignal, defineUpdate } from '@temporalio/workflow';
import type {
  BreadStolenSignalPayload,
  FeedVillagerRequest,
  FeedVillagerResult,
  VillagerState,
  WakeVillagerSignalPayload,
} from '../lib/types';

export const getVillagerStateQuery = defineQuery<VillagerState>('getVillagerState');
export const feedVillagerUpdate = defineUpdate<
  FeedVillagerResult,
  [FeedVillagerRequest | undefined]
>('feedVillager');
export const wakeVillagerSignal = defineSignal<[WakeVillagerSignalPayload?]>('wakeVillager');
export const breadStolenSignal = defineSignal<[BreadStolenSignalPayload?]>('breadStolen');
