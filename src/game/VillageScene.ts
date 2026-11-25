import * as Phaser from 'phaser';
import type { VillagerActivity, VillagerLocation } from '@/lib/types';
import { registerEmeraldTextures } from './emeraldArt';

export interface VillageSceneState {
  activity: VillagerActivity;
  location: VillagerLocation;
  hour: number;
  minute: number;
  happiness: number;
  upsetPulse: number;
}

const WORLD_WIDTH = 768;
const WORLD_HEIGHT = 432;
const ROAD_Y = 288;
const CROSS_VILLAGE_SPEED = 112;

interface Waypoint {
  x: number;
  y: number;
}

interface LocalPatrolPlan {
  spots: readonly Waypoint[];
  minPauseMs: number;
  maxPauseMs: number;
  speed: number;
  /** 'pingpong' traverses 0->1->2->1->0 (ideal for pond shore & storefronts); 'loop' cycles 0->1->2->0 */
  mode: 'pingpong' | 'loop';
}

const LOCATION_ANCHORS: Record<VillagerLocation, Waypoint> = {
  HOME: { x: 186, y: 250 },
  GARDEN: { x: 126, y: 254 },
  VILLAGE: { x: 384, y: 288 },
  BAKERY: { x: 582, y: 250 },
  POND: { x: 256, y: 318 },
  BENCH: { x: 444, y: 326 },
};

const RELAX_FALLBACK_SPOTS: Record<VillagerLocation, readonly Waypoint[]> = {
  HOME: [
    { x: 186, y: 250 },
    { x: 174, y: 254 },
    { x: 198, y: 254 },
  ],
  GARDEN: [
    { x: 126, y: 254 },
    { x: 116, y: 258 },
    { x: 138, y: 256 },
  ],
  VILLAGE: [
    { x: 384, y: 288 },
    { x: 368, y: 286 },
    { x: 400, y: 286 },
  ],
  BAKERY: [
    { x: 582, y: 250 },
    { x: 598, y: 254 },
    { x: 570, y: 254 },
  ],
  POND: [
    { x: 256, y: 318 },
    { x: 236, y: 318 },
    { x: 274, y: 320 },
  ],
  BENCH: [
    { x: 444, y: 326 },
    { x: 434, y: 326 },
    { x: 420, y: 332 },
  ],
};

function getLocalPatrolPlan(
  location: VillagerLocation,
  activity: VillagerActivity,
): LocalPatrolPlan | null {
  if (activity === 'SLEEPING') {
    return null;
  }

  switch (activity) {
    case 'BAKING':
      if (location === 'BAKERY') {
        return {
          spots: [
            { x: 576, y: 250 }, // bakery front doorway
            { x: 616, y: 252 }, // golden loaf display window
            { x: 652, y: 248 }, // flour barrel outside
            { x: 596, y: 258 }, // warm shopfront greeting spot
          ],
          minPauseMs: 2600,
          maxPauseMs: 4200,
          speed: 62,
          mode: 'pingpong',
        };
      }
      break;

    case 'RESTOCKING':
      if (location === 'BAKERY') {
        return {
          spots: [
            { x: 654, y: 248 }, // flour barrel
            { x: 616, y: 254 }, // display window shelf
            { x: 576, y: 250 }, // bakery entrance
          ],
          minPauseMs: 2200,
          maxPauseMs: 3600,
          speed: 68,
          mode: 'pingpong',
        };
      }
      break;

    case 'GARDENING':
      if (location === 'GARDEN') {
        return {
          spots: [
            { x: 118, y: 250 }, // right beside mailbox
            { x: 108, y: 268 }, // red & yellow cottage flower patch
            { x: 136, y: 266 }, // blue wildflower bed
            { x: 146, y: 252 }, // cottage garden edge
          ],
          minPauseMs: 2500,
          maxPauseMs: 4200,
          speed: 54,
          mode: 'loop',
        };
      }
      break;

    case 'FETCHING_WATER':
      if (location === 'POND') {
        return {
          spots: [
            { x: 214, y: 318 }, // north-west sandy pond edge
            { x: 256, y: 318 }, // north-center sandy shore
            { x: 304, y: 326 }, // north-east dry sandy bend
            { x: 314, y: 350 }, // eastern sandy bank
          ],
          minPauseMs: 2500,
          maxPauseMs: 4000,
          speed: 56,
          mode: 'pingpong',
        };
      }
      break;

    case 'STROLLING':
      if (location === 'POND') {
        return {
          spots: [
            { x: 204, y: 318 }, // west-north pond bank
            { x: 256, y: 318 }, // north pond shore
            { x: 312, y: 326 }, // east pond curve
            { x: 368, y: 328 }, // southern park path overlook
          ],
          minPauseMs: 2400,
          maxPauseMs: 4200,
          speed: 52,
          mode: 'pingpong',
        };
      }
      break;

    case 'EATING':
      if (location === 'BENCH') {
        return {
          spots: [
            { x: 444, y: 326 }, // seated happily on wooden park bench
            { x: 432, y: 326 }, // cozy left side of bench
            { x: 454, y: 326 }, // cozy right side of bench
            { x: 418, y: 334 }, // standing beside bench enjoying breeze
          ],
          minPauseMs: 3200,
          maxPauseMs: 4600,
          speed: 46,
          mode: 'pingpong',
        };
      }
      break;

    case 'WALKING':
      if (location === 'VILLAGE') {
        return {
          spots: [
            { x: 384, y: 262 }, // wooden route signpost
            { x: 356, y: 282 }, // village lamp post
            { x: 384, y: 304 }, // southern plaza flagstones
            { x: 410, y: 284 }, // eastern cobblestone plaza
          ],
          minPauseMs: 2300,
          maxPauseMs: 3800,
          speed: 60,
          mode: 'loop',
        };
      }
      break;

    case 'RELAXING':
    case 'WAKING_UP':
    case 'IDLE':
      return {
        spots: RELAX_FALLBACK_SPOTS[location] ?? RELAX_FALLBACK_SPOTS.HOME,
        minPauseMs: 3000,
        maxPauseMs: 4500,
        speed: 44,
        mode: 'pingpong',
      };
  }

  // Fallback for cross-location activities (e.g., player feeds Bob while at HOME or BAKERY)
  return {
    spots: RELAX_FALLBACK_SPOTS[location] ?? RELAX_FALLBACK_SPOTS.VILLAGE,
    minPauseMs: 2800,
    maxPauseMs: 4400,
    speed: 48,
    mode: 'pingpong',
  };
}

interface AnimatedFlower {
  sprite: Phaser.GameObjects.Image;
  prefix: string;
  phaseOffset: number;
}

interface SmokePuff {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  age: number;
  isBakery: boolean;
}

interface Butterfly {
  sprite: Phaser.GameObjects.Image;
  prefix: string;
  baseX: number;
  baseY: number;
  phase: number;
  radiusX: number;
  radiusY: number;
}

interface Firefly {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
}

interface BobParticle {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface CloudSprite {
  sprite: Phaser.GameObjects.Image;
  speed: number;
}

interface StarDot {
  sprite: Phaser.GameObjects.Rectangle;
  phase: number;
}

interface LightingSample {
  skyBands: [number, number, number, number];
  overlayColor: number;
  overlayAlpha: number;
  nightness: number;
  dayness: number;
  cloudTint: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

const SKY_KEYFRAMES: Array<{ hour: number; sample: LightingSample }> = [
  {
    hour: 0,
    sample: {
      skyBands: [0x0c1430, 0x142048, 0x1c2c5c, 0x24386c],
      overlayColor: 0x101840,
      overlayAlpha: 0.42,
      nightness: 1.0,
      dayness: 0.0,
      cloudTint: 0x485880,
    },
  },
  {
    hour: 4.5,
    sample: {
      skyBands: [0x101a3c, 0x1c2854, 0x2c386c, 0x444878],
      overlayColor: 0x18204c,
      overlayAlpha: 0.36,
      nightness: 0.85,
      dayness: 0.05,
      cloudTint: 0x706888,
    },
  },
  {
    hour: 6.0,
    sample: {
      skyBands: [0x5068a8, 0x9078a8, 0xe08870, 0xf8c880],
      overlayColor: 0xf08858,
      overlayAlpha: 0.16,
      nightness: 0.35,
      dayness: 0.55,
      cloudTint: 0xffe0c0,
    },
  },
  {
    hour: 7.5,
    sample: {
      skyBands: [0x48a0f0, 0x68bcf8, 0x90d4ff, 0xc0ecff],
      overlayColor: 0xfff0c8,
      overlayAlpha: 0.02,
      nightness: 0.0,
      dayness: 1.0,
      cloudTint: 0xffffff,
    },
  },
  {
    hour: 12.0,
    sample: {
      skyBands: [0x3894ec, 0x58b4f8, 0x84d0ff, 0xb8e8ff],
      overlayColor: 0xffffff,
      overlayAlpha: 0.0,
      nightness: 0.0,
      dayness: 1.0,
      cloudTint: 0xffffff,
    },
  },
  {
    hour: 16.5,
    sample: {
      skyBands: [0x4498e8, 0x6cb8f4, 0x9cd0f8, 0xd8e8e0],
      overlayColor: 0xffd080,
      overlayAlpha: 0.04,
      nightness: 0.0,
      dayness: 0.95,
      cloudTint: 0xfff8e8,
    },
  },
  {
    hour: 18.0,
    sample: {
      skyBands: [0x484888, 0x9c5878, 0xe87848, 0xf8b858],
      overlayColor: 0xe06830,
      overlayAlpha: 0.22,
      nightness: 0.45,
      dayness: 0.4,
      cloudTint: 0xffc898,
    },
  },
  {
    hour: 19.5,
    sample: {
      skyBands: [0x1c2250, 0x342c64, 0x64406c, 0x8c5068],
      overlayColor: 0x242050,
      overlayAlpha: 0.34,
      nightness: 0.8,
      dayness: 0.05,
      cloudTint: 0x907088,
    },
  },
  {
    hour: 21.0,
    sample: {
      skyBands: [0x0c1430, 0x142048, 0x1c2c5c, 0x24386c],
      overlayColor: 0x101840,
      overlayAlpha: 0.42,
      nightness: 1.0,
      dayness: 0.0,
      cloudTint: 0x485880,
    },
  },
  {
    hour: 24.0,
    sample: {
      skyBands: [0x0c1430, 0x142048, 0x1c2c5c, 0x24386c],
      overlayColor: 0x101840,
      overlayAlpha: 0.42,
      nightness: 1.0,
      dayness: 0.0,
      cloudTint: 0x485880,
    },
  },
];

function sampleLighting(hour: number, minute: number): LightingSample {
  const normalizedHour = (((hour % 24) + 24) % 24) + Math.max(0, Math.min(59, minute)) / 60;
  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    const a = SKY_KEYFRAMES[i];
    const b = SKY_KEYFRAMES[i + 1];
    if (normalizedHour >= a.hour && normalizedHour <= b.hour) {
      const span = b.hour - a.hour || 1;
      const t = (normalizedHour - a.hour) / span;
      return {
        skyBands: [
          lerpColor(a.sample.skyBands[0], b.sample.skyBands[0], t),
          lerpColor(a.sample.skyBands[1], b.sample.skyBands[1], t),
          lerpColor(a.sample.skyBands[2], b.sample.skyBands[2], t),
          lerpColor(a.sample.skyBands[3], b.sample.skyBands[3], t),
        ],
        overlayColor: lerpColor(a.sample.overlayColor, b.sample.overlayColor, t),
        overlayAlpha: lerp(a.sample.overlayAlpha, b.sample.overlayAlpha, t),
        nightness: lerp(a.sample.nightness, b.sample.nightness, t),
        dayness: lerp(a.sample.dayness, b.sample.dayness, t),
        cloudTint: lerpColor(a.sample.cloudTint, b.sample.cloudTint, t),
      };
    }
  }
  return SKY_KEYFRAMES[0].sample;
}

export class VillageScene extends Phaser.Scene {
  private isCreated = false;

  // Sky & atmosphere
  private skyBandRects: Phaser.GameObjects.Rectangle[] = [];
  private clouds: CloudSprite[] = [];
  private stars: StarDot[] = [];
  private nightOverlay!: Phaser.GameObjects.Rectangle;

  // Animated environment elements
  private pondSprite!: Phaser.GameObjects.Image;
  private pondStarsSprite!: Phaser.GameObjects.Image;
  private flowers: AnimatedFlower[] = [];
  private smokePuffs: SmokePuff[] = [];
  private butterflies: Butterfly[] = [];
  private fireflies: Firefly[] = [];

  // Building & lamp night-glow layers
  private cottageGlowLeft!: Phaser.GameObjects.Rectangle;
  private cottageGlowRight!: Phaser.GameObjects.Rectangle;
  private cottageMullions!: Phaser.GameObjects.Graphics;
  private cottageSpill!: Phaser.GameObjects.Ellipse;
  private bakeryGlowWindow!: Phaser.GameObjects.Rectangle;
  private bakeryGlowDoor!: Phaser.GameObjects.Rectangle;
  private bakerySpill!: Phaser.GameObjects.Ellipse;
  private lampGlow!: Phaser.GameObjects.Ellipse;
  private lampCore!: Phaser.GameObjects.Rectangle;

  // Bob the Baker
  private bobContainer!: Phaser.GameObjects.Container;
  private bobSprite!: Phaser.GameObjects.Image;
  private emoteSprite!: Phaser.GameObjects.Image;
  private bobParticles: BobParticle[] = [];

  // State & movement
  private currentState: VillageSceneState = {
    activity: 'SLEEPING',
    location: 'HOME',
    hour: 7,
    minute: 0,
    happiness: 75,
    upsetPulse: 0,
  };

  private waypoints: Waypoint[] = [];
  private isLocalPatrolMove = false;
  private localMoveSpeed = 54;
  private localPauseTimer = 2600;
  private localSpotIndex = 0;
  private localPatrolDirection: 1 | -1 = 1;
  private animTimer = 0;
  private animStep = 0;
  private worldTileTimer = 0;
  private worldAnimFrame = 0;
  private particleSpawnTimer = 0;
  private lastEmoteKey = '';
  private emotePopTimer = 0;
  private lastUpsetPulse = 0;
  private upsetTimer = 0;
  private currentNightness = 0;
  private currentDayness = 1;

  constructor() {
    super('VillageScene');
  }

  public updateVillagerState(next: VillageSceneState): void {
    const prevLocation = this.currentState.location;
    const prevActivity = this.currentState.activity;
    this.currentState = next;

    if (next.upsetPulse > this.lastUpsetPulse) {
      this.lastUpsetPulse = next.upsetPulse;
      this.upsetTimer = 4500;
      this.emotePopTimer = 320;
    }

    if (this.isCreated) {
      if (prevLocation !== next.location) {
        this.isLocalPatrolMove = false;
        this.waypoints = this.computePathWaypoints(
          this.bobContainer.x,
          this.bobContainer.y,
          next.location,
        );
        this.resetLocalPatrolState(next.location, next.activity);
      } else if (prevActivity !== next.activity) {
        if (next.activity === 'SLEEPING') {
          // Return peacefully to the porch anchor and stop patrolling while asleep
          const anchor = LOCATION_ANCHORS[next.location] ?? LOCATION_ANCHORS.HOME;
          if (Math.hypot(anchor.x - this.bobContainer.x, anchor.y - this.bobContainer.y) > 4) {
            this.isLocalPatrolMove = true;
            this.localMoveSpeed = 52;
            this.waypoints = [{ x: anchor.x, y: anchor.y }];
          } else {
            this.waypoints = [];
            this.isLocalPatrolMove = false;
          }
        } else {
          // Smoothly transition into the new activity's local patrol pattern
          if (this.isLocalPatrolMove) {
            this.waypoints = [];
            this.isLocalPatrolMove = false;
          }
          this.resetLocalPatrolState(next.location, next.activity, true);
        }
      }
      this.syncLightingAndEmote();
    }
  }

  preload(): void {
    registerEmeraldTextures(this);
  }

  create(): void {
    this.createSkyBackdrop();
    this.createMeadowAndTallGrass();
    this.createHoennPond();
    this.createVillagePath();
    this.createTownPropsAndBuildings();
    this.createBorderTrees();
    this.createWildflowers();
    this.createChimneySmoke();
    this.createAmbientCritters();
    this.createBob();

    this.nightOverlay = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x101840, 0)
      .setDepth(500);

    this.isCreated = true;
    this.resetLocalPatrolState(this.currentState.location, this.currentState.activity, true);
    this.syncLightingAndEmote();
  }

  private resetLocalPatrolState(
    location: VillagerLocation,
    activity: VillagerActivity,
    quickStart = false,
  ): void {
    this.localSpotIndex = 0;
    this.localPatrolDirection = 1;
    const plan = getLocalPatrolPlan(location, activity);
    if (!plan) {
      this.localPauseTimer = 0;
      return;
    }

    // If staying in place (not traveling cross-village), anchor index to closest spot for safe shoreline curves
    if (this.isCreated && this.waypoints.length === 0 && this.bobContainer) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < plan.spots.length; i++) {
        const d = Math.hypot(
          plan.spots[i].x - this.bobContainer.x,
          plan.spots[i].y - this.bobContainer.y,
        );
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      this.localSpotIndex = bestIdx;
      this.localPatrolDirection = bestIdx >= plan.spots.length - 1 ? -1 : 1;
    }

    this.localMoveSpeed = plan.speed;
    if (quickStart) {
      this.localPauseTimer = 1500 + Math.random() * 1100;
    } else {
      this.localPauseTimer =
        plan.minPauseMs + Math.random() * (plan.maxPauseMs - plan.minPauseMs);
    }
  }

  private pickNextLocalPatrolSpot(plan: LocalPatrolPlan): Waypoint {
    const count = plan.spots.length;
    if (count <= 1) return plan.spots[0];

    const stepOnce = () => {
      if (plan.mode === 'loop') {
        this.localSpotIndex = (this.localSpotIndex + 1) % count;
      } else {
        const candidate = this.localSpotIndex + this.localPatrolDirection;
        if (candidate >= count) {
          this.localPatrolDirection = -1;
          this.localSpotIndex = Math.max(0, count - 2);
        } else if (candidate < 0) {
          this.localPatrolDirection = 1;
          this.localSpotIndex = Math.min(count - 1, 1);
        } else {
          this.localSpotIndex = candidate;
        }
      }
    };

    stepOnce();
    let target = plan.spots[this.localSpotIndex];
    if (Math.hypot(target.x - this.bobContainer.x, target.y - this.bobContainer.y) < 6) {
      stepOnce();
      target = plan.spots[this.localSpotIndex];
    }
    return target;
  }

  update(time: number, delta: number): void {
    if (!this.isCreated) return;
    const dt = Math.min(delta, 100) / 1000;

    if (this.upsetTimer > 0) {
      this.upsetTimer = Math.max(0, this.upsetTimer - delta);
      if (this.upsetTimer === 0) {
        this.syncLightingAndEmote();
      }
    }

    if (this.emotePopTimer > 0) {
      this.emotePopTimer = Math.max(0, this.emotePopTimer - delta);
    }

    this.updateBobMovementAndAnim(time, delta, dt);
    this.updateBobParticles(delta, dt);
    this.updateWorldAnimations(time, delta, dt);
  }

  private computePathWaypoints(
    fromX: number,
    fromY: number,
    targetLocation: VillagerLocation,
  ): Waypoint[] {
    const dest = LOCATION_ANCHORS[targetLocation] ?? LOCATION_ANCHORS.VILLAGE;
    if (Math.hypot(dest.x - fromX, dest.y - fromY) < 4) return [];

    const raw: Waypoint[] = [];
    const push = (x: number, y: number) => {
      const prev = raw.length > 0 ? raw[raw.length - 1] : { x: fromX, y: fromY };
      if (Math.hypot(x - prev.x, y - prev.y) > 4) {
        raw.push({ x, y });
      }
    };

    // Fast cozy yard hop directly between HOME porch and GARDEN mailbox/flowerbeds
    if (
      fromY < 280 &&
      fromX < 230 &&
      (targetLocation === 'HOME' || targetLocation === 'GARDEN')
    ) {
      if (targetLocation === 'GARDEN') {
        push(186, 270);
        push(158, 270);
      } else {
        push(158, 270);
        push(186, 270);
      }
      push(dest.x, dest.y);
      return raw;
    }

    // Phase 1: Exit current landmark safely onto either the southern park path or main road
    let handledDirectSouth = false;

    if (fromY > 304) {
      if (fromX <= 336) {
        // Near pond: if on east bank (y > 324), step straight north out of the pond bank first
        if (fromY > 324) {
          push(316, 324);
        }
        if (targetLocation === 'BENCH') {
          push(316, 324);
          push(384, 326);
          push(416, 332);
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else if (targetLocation === 'POND') {
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else {
          const exitX = fromY > 324 ? 316 : Math.max(164, Math.min(316, fromX));
          push(exitX, ROAD_Y);
        }
      } else if (fromX > 406) {
        // Near park bench: step cleanly back to southern plaza spur (avoids fences at x=492)
        push(416, 332);
        push(384, 326);
        if (targetLocation === 'POND') {
          push(316, 324);
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else if (targetLocation === 'BENCH') {
          push(416, 332);
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else {
          push(384, ROAD_Y);
        }
      } else {
        // On southern plaza overlook (336 < x <= 406)
        if (targetLocation === 'POND') {
          push(316, 324);
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else if (targetLocation === 'BENCH') {
          push(416, 332);
          push(dest.x, dest.y);
          handledDirectSouth = true;
        } else {
          push(384, ROAD_Y);
        }
      }
    } else if (fromY < 276) {
      if (fromX > 610) {
        // Leaving bakery flour barrel area: clear storefront cleanly onto main road
        push(610, 276);
        push(582, ROAD_Y);
      } else if (fromX < 156) {
        // Leaving cottage garden west of road start
        push(162, ROAD_Y);
      } else {
        push(fromX, ROAD_Y);
      }
    } else if (Math.abs(fromY - ROAD_Y) > 6) {
      push(Math.max(162, Math.min(600, fromX)), ROAD_Y);
    }

    if (handledDirectSouth) {
      return raw;
    }

    // Phase 2: Travel along the main sandy village road (ROAD_Y) and enter target landmark
    switch (targetLocation) {
      case 'HOME':
        push(186, ROAD_Y);
        push(dest.x, dest.y);
        break;
      case 'GARDEN':
        push(162, ROAD_Y);
        push(146, 272);
        push(dest.x, dest.y);
        break;
      case 'VILLAGE':
        push(384, ROAD_Y);
        break;
      case 'BAKERY':
        push(582, ROAD_Y);
        push(dest.x, dest.y);
        break;
      case 'POND':
        push(256, ROAD_Y);
        push(dest.x, dest.y);
        break;
      case 'BENCH':
        push(384, ROAD_Y);
        push(384, 326);
        push(416, 332);
        push(dest.x, dest.y);
        break;
    }

    return raw;
  }

  private createSkyBackdrop(): void {
    // 4 crisp GBA horizontal sky bands (top 56px behind distant pine horizon)
    const bandHeight = 14;
    for (let i = 0; i < 4; i++) {
      const rect = this.add
        .rectangle(WORLD_WIDTH / 2, i * bandHeight + bandHeight / 2, WORLD_WIDTH, bandHeight, 0x58b4f8)
        .setDepth(1);
      this.skyBandRects.push(rect);
    }

    // Drifting crisp pixel cumulus clouds
    const cloudSpecs: Array<{ x: number; y: number; key: string; speed: number }> = [
      { x: 110, y: 18, key: 'cloud-lg', speed: 8 },
      { x: 310, y: 26, key: 'cloud-sm', speed: 6 },
      { x: 520, y: 16, key: 'cloud-lg', speed: 7.5 },
      { x: 690, y: 28, key: 'cloud-sm', speed: 5.5 },
    ];
    for (const c of cloudSpecs) {
      const sprite = this.add.image(c.x, c.y, c.key).setDepth(3);
      this.clouds.push({ sprite, speed: c.speed });
    }

    // Twinkling GBA pixel stars in upper sky (above treeline & night overlay so they shine crisply)
    for (let i = 0; i < 24; i++) {
      const sx = 20 + ((i * 67 + 19) % (WORLD_WIDTH - 40));
      const sy = 5 + ((i * 19 + 5) % 24);
      const size = i % 4 === 0 ? 4 : 2;
      const star = this.add.rectangle(sx, sy, size, size, 0xfff8d0, 0).setDepth(508);
      this.stars.push({ sprite: star, phase: i * 0.9 });
    }

    // Distant Hoenn pine ridge silhouette along the horizon
    const ridge = this.add.graphics().setDepth(6);
    ridge.fillStyle(0x20583c, 1);
    for (let x = 0; x < WORLD_WIDTH; x += 16) {
      const h = 10 + ((x * 7 + 13) % 12);
      ridge.fillRect(x, 54 - h, 18, h);
    }
    ridge.fillStyle(0x2c7044, 1);
    for (let x = 8; x < WORLD_WIDTH; x += 24) {
      const h = 6 + ((x * 5 + 3) % 8);
      ridge.fillRect(x, 54 - h, 16, h);
    }
  }

  private createMeadowAndTallGrass(): void {
    // 24x12 grid of 32x32 lush Emerald meadow tiles covering y=48..432
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 24; col++) {
        const hash = (row * 7 + col * 13 + row * col) % 7;
        const key = hash === 0 ? 'grass-1' : hash === 3 ? 'grass-2' : 'grass-0';
        this.add.image(col * 32 + 16, 48 + row * 32 + 16, key).setDepth(10);
      }
    }

    // Classic Hoenn Tall Grass clusters tucked naturally around clearing edges
    const tallGrassCoords: Array<[number, number]> = [
      // North clearing between Bob's Cottage & Bob's Bakery
      [320, 128],
      [352, 128],
      [416, 128],
      [448, 128],
      [352, 160],
      [416, 160],
      // South-east wildflower meadow patch
      [576, 368],
      [608, 368],
      [640, 368],
      [608, 400],
      [640, 400],
      // West shore near pond
      [96, 352],
      [96, 384],
    ];
    for (const [gx, gy] of tallGrassCoords) {
      this.add.image(gx, gy, 'tall-grass').setDepth(20);
    }
  }

  private createHoennPond(): void {
    // Shimmering animated Hoenn water pond in bottom-left / center-south clearing
    this.pondSprite = this.add.image(224, 374, 'pond-0').setDepth(25);
    this.pondStarsSprite = this.add.image(224, 374, 'pond-stars').setAlpha(0).setDepth(506);
  }

  private createVillagePath(): void {
    const g = this.add.graphics().setDepth(30);

    // Helper for crisp GBA stepped-pixel bordered path rectangles
    const fillPathShape = (color: number, pad: number) => {
      g.fillStyle(color, 1);
      // Main horizontal village road connecting HOME <-> VILLAGE <-> BAKERY
      g.fillRect(156 - pad, 266 - pad, 456 + pad * 2, 44 + pad * 2);
      // Cottage porch spur (HOME)
      g.fillRect(166 - pad, 228 - pad, 40 + pad * 2, 52 + pad * 2);
      // Bakery front spur (BAKERY)
      g.fillRect(562 - pad, 228 - pad, 40 + pad * 2, 52 + pad * 2);
      // Center village square plaza (VILLAGE) & signpost alcove
      g.fillRect(344 - pad, 246 - pad, 80 + pad * 2, 72 + pad * 2);
      // Short southern overlook spur toward pond/bench
      g.fillRect(362 - pad, 314 - pad, 44 + pad * 2, 24 + pad * 2);
    };

    // 4-layer crisp GBA Hoenn path edge: dark outline -> grass lip -> tan shadow -> sandy tan
    fillPathShape(0x203028, 4);
    fillPathShape(0x387834, 2);
    fillPathShape(0x987444, 0);

    // Inner bright sandy-tan path fill
    g.fillStyle(0xdfc080, 1);
    g.fillRect(158, 268, 452, 40);
    g.fillRect(168, 230, 36, 48);
    g.fillRect(564, 230, 36, 48);
    g.fillRect(346, 248, 76, 68);
    g.fillRect(364, 314, 40, 22);

    // Sunlit top highlight strip along sandy road
    g.fillStyle(0xf0dc9c, 1);
    g.fillRect(160, 270, 448, 4);
    g.fillRect(348, 250, 72, 4);

    // Subtle sandy speckles & stepping stones along the Hoenn path
    g.fillStyle(0xc49e60, 1);
    for (let x = 170; x <= 596; x += 24) {
      const yOff = ((x / 24) % 2) * 14;
      g.fillRect(x, 276 + yOff, 10, 6);
      g.fillStyle(0xf0dc9c, 1);
      g.fillRect(x + 2, 276 + yOff, 6, 2);
      g.fillStyle(0xc49e60, 1);
    }

    // Neat village square center flagstones around VILLAGE anchor
    const plazaStones: Array<[number, number, number, number]> = [
      [356, 262, 16, 10],
      [378, 260, 14, 10],
      [398, 264, 16, 10],
      [358, 296, 14, 10],
      [380, 298, 16, 10],
      [402, 294, 12, 10],
      [374, 320, 20, 8],
      // Subtle garden, pond-shore & bench approach stepping stones
      [142, 276, 12, 8],
      [126, 268, 12, 8],
      [250, 314, 14, 8],
      [320, 324, 14, 8],
      [410, 328, 14, 8],
    ];
    for (const [sx, sy, sw, sh] of plazaStones) {
      g.fillStyle(0x987444, 1);
      g.fillRect(sx, sy, sw, sh);
      g.fillStyle(0xe8d4a0, 1);
      g.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
      g.fillStyle(0xf8ecd0, 1);
      g.fillRect(sx + 2, sy + 2, sw - 6, 2);
    }
  }

  private createTownPropsAndBuildings(): void {
    // --- BOB'S COTTAGE (HOME, Left) ---
    // Centered at (186, 174), sprite 148x124 -> top-left (112, 112)
    this.add.image(186, 174, 'bobs-cottage').setDepth(210);

    // Warm golden cottage window glows (placed above nightOverlay so windows truly glow at night!)
    this.cottageGlowLeft = this.add.rectangle(152, 197, 20, 18, 0xffd460, 0).setDepth(505);
    this.cottageGlowRight = this.add.rectangle(220, 197, 20, 18, 0xffd460, 0).setDepth(505);
    // Re-draw crisp mullion crossbars above glow so window frames stay sharp at night
    this.cottageMullions = this.add.graphics().setDepth(506).setAlpha(0);
    this.cottageMullions.fillStyle(0x583420, 0.9);
    this.cottageMullions.fillRect(150, 188, 4, 18);
    this.cottageMullions.fillRect(142, 196, 20, 2);
    this.cottageMullions.fillRect(218, 188, 4, 18);
    this.cottageMullions.fillRect(210, 196, 20, 2);

    this.cottageSpill = this.add.ellipse(186, 236, 116, 28, 0xffcf58, 0).setDepth(502);

    // Classic Littleroot Mailbox right beside Bob's Cottage
    this.add.image(114, 228, 'mailbox').setDepth(232);

    // --- BOB'S BAKERY (BAKERY, Right) ---
    // Centered at (582, 172), sprite 160x128 -> top-left (502, 108)
    this.add.image(582, 172, 'bobs-bakery').setDepth(210);

    // Warm amber bakery display window & door pane glow (lights up during BAKING/RESTOCKING & dusk/night)
    this.bakeryGlowWindow = this.add.rectangle(616, 202, 40, 24, 0xffc44c, 0).setDepth(505);
    this.bakeryGlowDoor = this.add.rectangle(574, 198, 12, 8, 0xffd460, 0).setDepth(505);
    this.bakerySpill = this.add.ellipse(602, 240, 118, 30, 0xffb848, 0).setDepth(502);

    // Flour barrel beside bakery
    this.add.image(664, 226, 'bread-barrel').setDepth(228);

    // --- VILLAGE CENTER PROPS ---
    // Hoenn wooden route signpost at head of village square
    this.add.image(384, 224, 'route-sign').setDepth(224);

    // Village Lamp Post with warm night lantern glow
    this.add.image(336, 238, 'lamp-post').setDepth(240);
    this.lampCore = this.add.rectangle(336, 227, 8, 6, 0xffe480, 0).setDepth(505);
    this.lampGlow = this.add.ellipse(336, 252, 68, 36, 0xffd868, 0).setDepth(502);

    // Cozy wooden bench overlooking the pond & meadow
    this.add.image(444, 336, 'wood-bench').setDepth(336);

    // White wooden picket fences framing yards & meadow
    const fencePositions: Array<[number, number]> = [
      [88, 230],
      [278, 230],
      [310, 230],
      [458, 230],
      [490, 230],
      [686, 230],
      [492, 344],
      [524, 344],
    ];
    for (const [fx, fy] of fencePositions) {
      this.add.image(fx, fy, 'fence-h').setDepth(fy);
    }
  }

  private createBorderTrees(): void {
    // Dense multi-layered Pokémon Emerald town perimeter trees
    const trees: Array<[number, number, string]> = [
      // Lush top border ridge
      [28, 70, 'tree-emerald'],
      [76, 66, 'tree-emerald-alt'],
      [126, 74, 'tree-emerald'],
      [178, 68, 'tree-emerald-alt'],
      [228, 72, 'tree-emerald'],
      [278, 76, 'tree-emerald'],
      [324, 70, 'tree-emerald-alt'],
      [384, 68, 'tree-emerald'],
      [444, 70, 'tree-emerald-alt'],
      [490, 76, 'tree-emerald'],
      [540, 72, 'tree-emerald'],
      [592, 68, 'tree-emerald-alt'],
      [644, 74, 'tree-emerald'],
      [694, 66, 'tree-emerald-alt'],
      [742, 72, 'tree-emerald'],

      // West town border
      [24, 134, 'tree-emerald'],
      [42, 192, 'tree-emerald-alt'],
      [24, 250, 'tree-emerald'],
      [36, 314, 'tree-emerald-alt'],
      [28, 378, 'tree-emerald'],
      [76, 408, 'tree-emerald-alt'],

      // East town border
      [744, 134, 'tree-emerald'],
      [726, 192, 'tree-emerald-alt'],
      [744, 250, 'tree-emerald'],
      [730, 314, 'tree-emerald-alt'],
      [740, 378, 'tree-emerald'],
      [692, 408, 'tree-emerald-alt'],
    ];

    for (const [tx, ty, key] of trees) {
      this.add.image(tx, ty, key).setDepth(ty + 18);
    }
  }

  private createWildflowers(): void {
    const specs: Array<[number, number, string]> = [
      // Around Bob's Cottage yard
      [96, 260, 'flower-red'],
      [112, 276, 'flower-yellow'],
      [130, 264, 'flower-blue'],
      [268, 252, 'flower-yellow'],
      [292, 254, 'flower-red'],
      // Village center garden around signpost
      [352, 224, 'flower-blue'],
      [366, 232, 'flower-yellow'],
      [404, 232, 'flower-red'],
      [418, 224, 'flower-blue'],
      // North meadow edge
      [304, 178, 'flower-yellow'],
      [320, 190, 'flower-red'],
      [448, 184, 'flower-blue'],
      [464, 174, 'flower-yellow'],
      // Around the shimmering Hoenn pond
      [118, 336, 'flower-red'],
      [130, 396, 'flower-blue'],
      [324, 344, 'flower-yellow'],
      [338, 364, 'flower-red'],
      [322, 392, 'flower-blue'],
      // Bakery & south-east meadow
      [482, 252, 'flower-red'],
      [506, 254, 'flower-yellow'],
      [636, 260, 'flower-blue'],
      [656, 274, 'flower-red'],
      [548, 338, 'flower-yellow'],
      [564, 350, 'flower-blue'],
    ];

    specs.forEach(([fx, fy, prefix], idx) => {
      const sprite = this.add.image(fx, fy, `${prefix}-0`).setDepth(fy - 4);
      this.flowers.push({ sprite, prefix, phaseOffset: idx % 2 });
    });
  }

  private createChimneySmoke(): void {
    // Cottage stone chimney top at (224, 114) & Bakery brick oven chimney top at (633, 108)
    for (let i = 0; i < 4; i++) {
      this.smokePuffs.push({
        sprite: this.add.image(224, 114, 'smoke-puff').setDepth(235).setAlpha(0.6),
        baseX: 224,
        baseY: 114,
        age: i * 0.25,
        isBakery: false,
      });
    }
    for (let i = 0; i < 6; i++) {
      this.smokePuffs.push({
        sprite: this.add.image(633, 108, 'smoke-puff').setDepth(235).setAlpha(0.75),
        baseX: 633,
        baseY: 108,
        age: i / 6,
        isBakery: true,
      });
    }
  }

  private createAmbientCritters(): void {
    // Daytime Hoenn fluttering butterflies
    const butterflySpecs: Array<[number, number, string, number, number]> = [
      [270, 296, 'butterfly-yellow', 30, 16],
      [462, 304, 'butterfly-cyan', 34, 18],
      [360, 198, 'butterfly-orange', 28, 14],
    ];
    butterflySpecs.forEach(([bx, by, prefix, rx, ry], idx) => {
      const sprite = this.add.image(bx, by, `${prefix}-0`).setDepth(420);
      this.butterflies.push({
        sprite,
        prefix,
        baseX: bx,
        baseY: by,
        phase: idx * 2.1,
        radiusX: rx,
        radiusY: ry,
      });
    });

    // Nighttime drifting warm fireflies around meadow & Hoenn pond
    const fireflyCoords: Array<[number, number]> = [
      [158, 344],
      [246, 356],
      [298, 330],
      [372, 326],
      [474, 342],
      [564, 348],
      [124, 286],
      [318, 194],
      [452, 200],
      [648, 288],
    ];
    fireflyCoords.forEach(([fx, fy], idx) => {
      const sprite = this.add.image(fx, fy, 'firefly').setAlpha(0).setDepth(520);
      this.fireflies.push({
        sprite,
        baseX: fx,
        baseY: fy,
        phase: idx * 1.37,
        speed: 0.7 + (idx % 3) * 0.25,
      });
    });
  }

  private createBob(): void {
    const startAnchor = LOCATION_ANCHORS[this.currentState.location] ?? LOCATION_ANCHORS.HOME;
    this.bobContainer = this.add.container(startAnchor.x, startAnchor.y).setDepth(startAnchor.y + 12);

    // Classic GBA elliptical ground shadow beneath Bob's boots
    const shadow = this.add.ellipse(0, 19, 24, 9, 0x183020, 0.42);
    this.bobSprite = this.add.image(0, 0, 'bob-idle-0');
    this.emoteSprite = this.add.image(0, -37, 'emote-sleep');

    this.bobContainer.add([shadow, this.bobSprite, this.emoteSprite]);
  }

  private updateBobMovementAndAnim(time: number, delta: number, dt: number): void {
    let isMoving = false;
    let moveDx = 0;
    let moveDy = 0;

    if (this.waypoints.length > 0) {
      const nextPt = this.waypoints[0];
      const dx = nextPt.x - this.bobContainer.x;
      const dy = nextPt.y - this.bobContainer.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 2.5) {
        this.bobContainer.x = nextPt.x;
        this.bobContainer.y = nextPt.y;
        this.waypoints.shift();
        if (this.waypoints.length === 0) {
          const wasCrossVillage = !this.isLocalPatrolMove;
          this.isLocalPatrolMove = false;
          const plan = getLocalPatrolPlan(this.currentState.location, this.currentState.activity);
          if (plan) {
            if (wasCrossVillage) {
              this.resetLocalPatrolState(
                this.currentState.location,
                this.currentState.activity,
                true,
              );
            } else {
              this.localPauseTimer =
                plan.minPauseMs + Math.random() * (plan.maxPauseMs - plan.minPauseMs);
            }
          }
        }
      } else {
        isMoving = true;
        moveDx = dx;
        moveDy = dy;
        const speed = this.isLocalPatrolMove ? this.localMoveSpeed : CROSS_VILLAGE_SPEED;
        const step = Math.min(dist, speed * dt);
        this.bobContainer.x += (dx / dist) * step;
        this.bobContainer.y += (dy / dist) * step;
      }
    } else if (this.upsetTimer === 0) {
      // Subtle local activity pacing between Temporal timers so Bob feels genuinely alive
      const plan = getLocalPatrolPlan(this.currentState.location, this.currentState.activity);
      if (plan && plan.spots.length > 1) {
        this.localPauseTimer -= delta;
        if (this.localPauseTimer <= 0) {
          const nextSpot = this.pickNextLocalPatrolSpot(plan);
          this.isLocalPatrolMove = true;
          this.localMoveSpeed = plan.speed;
          this.waypoints = [{ x: nextSpot.x, y: nextSpot.y }];
        }
      }
    }

    // Y-sort Bob naturally with trees, buildings, fences & bench
    this.bobContainer.setDepth(Math.round(this.bobContainer.y) + 12);

    // Crisp GBA multi-frame animation step
    const frameInterval = isMoving
      ? this.isLocalPatrolMove
        ? 185
        : 150
      : this.upsetTimer > 0
        ? 150
        : 320;
    this.animTimer += delta;
    if (this.animTimer >= frameInterval) {
      this.animTimer = 0;
      this.animStep = (this.animStep + 1) % 4;

      if (this.upsetTimer > 0) {
        this.bobSprite.setFlipX(false);
        this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-upset-0' : 'bob-upset-1');
        this.bobSprite.y = this.animStep % 2 === 0 ? -3 : 0;
      } else if (isMoving) {
        if (Math.abs(moveDx) >= Math.abs(moveDy)) {
          this.bobSprite.setFlipX(moveDx < 0);
          const walkCycle = ['bob-walk-0', 'bob-walk-1', 'bob-walk-2', 'bob-walk-1'] as const;
          this.bobSprite.setTexture(walkCycle[this.animStep]);
          this.bobSprite.y = this.animStep % 2 === 0 ? -2 : 0;
        } else if (moveDy < 0) {
          this.bobSprite.setFlipX(false);
          this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-walk-up-0' : 'bob-walk-up-1');
          this.bobSprite.y = this.animStep % 2 === 0 ? -2 : 0;
        } else {
          this.bobSprite.setFlipX(false);
          this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-walk-down-0' : 'bob-walk-down-1');
          this.bobSprite.y = this.animStep % 2 === 0 ? -2 : 0;
        }
      } else {
        this.bobSprite.setFlipX(false);
        switch (this.currentState.activity) {
          case 'BAKING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-bake-0' : 'bob-bake-1');
            this.bobSprite.y = this.animStep % 2 === 0 ? -1 : 0;
            break;
          case 'RESTOCKING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-restock-0' : 'bob-restock-1');
            this.bobSprite.y = this.animStep % 2 === 0 ? -1 : 0;
            break;
          case 'GARDENING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-garden-0' : 'bob-garden-1');
            this.bobSprite.y = this.animStep % 2 === 0 ? -1 : 0;
            break;
          case 'FETCHING_WATER':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-water-0' : 'bob-water-1');
            this.bobSprite.y = this.animStep % 2 === 0 ? -1 : 0;
            break;
          case 'EATING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-eat-0' : 'bob-eat-1');
            this.bobSprite.y = 0;
            break;
          case 'SLEEPING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-sleep-0' : 'bob-sleep-1');
            this.bobSprite.y = 1;
            break;
          case 'WAKING_UP':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-wake-0' : 'bob-idle-0');
            this.bobSprite.y = this.animStep % 2 === 0 ? -2 : 0;
            break;
          case 'STROLLING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-relax-0' : 'bob-idle-0');
            this.bobSprite.y = this.animStep % 2 === 0 ? -1 : 0;
            break;
          case 'RELAXING':
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-relax-0' : 'bob-idle-1');
            this.bobSprite.y = 0;
            break;
          case 'WALKING':
          case 'IDLE':
          default:
            this.bobSprite.setTexture(this.animStep % 2 === 0 ? 'bob-idle-0' : 'bob-idle-1');
            this.bobSprite.y = 0;
            break;
        }
      }
    }

    // Upset shock jitter
    this.bobSprite.x = this.upsetTimer > 0 ? Math.round(Math.sin(time * 0.045) * 2) : 0;

    // Emote box gentle float + punchy Pokémon pop-in bounce
    const floatY = Math.round(Math.sin(time / 420) * 2);
    const popProgress = this.emotePopTimer > 0 ? this.emotePopTimer / 320 : 0;
    const popScale = 1 + Math.sin(popProgress * Math.PI) * 0.28;
    this.emoteSprite.setPosition(0, -38 + floatY - Math.round(popProgress * 4));
    this.emoteSprite.setScale(popScale);

    // Spawn activity-specific pixel particles around Bob
    if (!isMoving && this.upsetTimer === 0) {
      this.particleSpawnTimer += delta;
      const activity = this.currentState.activity;
      if (activity === 'SLEEPING' && this.particleSpawnTimer >= 1150) {
        this.particleSpawnTimer = 0;
        this.spawnBobParticle('particle-zzz', 12, -16, 12, -22, 1.5);
      } else if (activity === 'BAKING' && this.particleSpawnTimer >= 420) {
        this.particleSpawnTimer = 0;
        const isSparkle = Math.random() > 0.45;
        const ox = (Math.random() - 0.5) * 26;
        this.spawnBobParticle(
          isSparkle ? 'particle-sparkle' : 'particle-flour',
          ox,
          -4 + Math.random() * 8,
          (Math.random() - 0.5) * 14,
          -20 - Math.random() * 12,
          0.95,
        );
      } else if (activity === 'RESTOCKING' && this.particleSpawnTimer >= 580) {
        this.particleSpawnTimer = 0;
        const isFlour = Math.random() > 0.35;
        const ox = (Math.random() - 0.5) * 22;
        this.spawnBobParticle(
          isFlour ? 'particle-flour' : 'particle-sparkle',
          ox,
          -2 + Math.random() * 6,
          (Math.random() - 0.5) * 14,
          -16 - Math.random() * 10,
          0.85,
        );
      } else if (activity === 'GARDENING' && this.particleSpawnTimer >= 540) {
        this.particleSpawnTimer = 0;
        const roll = Math.random();
        const key =
          roll < 0.48
            ? 'particle-droplet'
            : roll < 0.78
              ? 'particle-sparkle'
              : 'particle-leaf';
        const ox = (Math.random() - 0.5) * 26;
        this.spawnBobParticle(
          key,
          ox,
          -2 + Math.random() * 8,
          (Math.random() - 0.5) * 18,
          key === 'particle-droplet' ? -10 + Math.random() * 14 : -18 - Math.random() * 8,
          0.9,
        );
      } else if (activity === 'FETCHING_WATER' && this.particleSpawnTimer >= 480) {
        this.particleSpawnTimer = 0;
        const isDrop = Math.random() > 0.3;
        const ox = (Math.random() - 0.5) * 24;
        this.spawnBobParticle(
          isDrop ? 'particle-droplet' : 'particle-sparkle',
          ox,
          0 + Math.random() * 8,
          (Math.random() - 0.5) * 20,
          isDrop ? -18 - Math.random() * 10 : -14 - Math.random() * 8,
          0.85,
        );
      } else if (activity === 'EATING' && this.particleSpawnTimer >= 620) {
        this.particleSpawnTimer = 0;
        const isCrumb = Math.random() > 0.5;
        const ox = (Math.random() - 0.5) * 20;
        this.spawnBobParticle(
          isCrumb ? 'particle-crumb' : 'particle-sparkle',
          ox,
          -4 + Math.random() * 6,
          (Math.random() - 0.5) * 14,
          isCrumb ? 8 + Math.random() * 10 : -16,
          0.85,
        );
      } else if (activity === 'STROLLING' && this.particleSpawnTimer >= 1050) {
        this.particleSpawnTimer = 0;
        const isHeart = Math.random() > 0.55;
        this.spawnBobParticle(
          isHeart ? 'particle-heart' : 'particle-note',
          10 + (Math.random() - 0.5) * 8,
          -14,
          8 + (Math.random() - 0.5) * 8,
          -18,
          1.3,
        );
      } else if (activity === 'RELAXING' && this.particleSpawnTimer >= 1350) {
        this.particleSpawnTimer = 0;
        this.spawnBobParticle('particle-note', 10, -14, 10, -18, 1.35);
      } else if (activity === 'WAKING_UP' && this.particleSpawnTimer >= 1200) {
        this.particleSpawnTimer = 0;
        this.spawnBobParticle(
          'particle-sparkle',
          (Math.random() - 0.5) * 20,
          -14,
          (Math.random() - 0.5) * 8,
          -16,
          0.95,
        );
      }
    }
  }

  private spawnBobParticle(
    key: string,
    offsetX: number,
    offsetY: number,
    vx: number,
    vy: number,
    maxLife: number,
  ): void {
    const sprite = this.add
      .image(this.bobContainer.x + offsetX, this.bobContainer.y + offsetY, key)
      .setDepth(this.bobContainer.depth + 20);
    this.bobParticles.push({ sprite, vx, vy, life: 0, maxLife });
  }

  private updateBobParticles(_delta: number, dt: number): void {
    for (let i = this.bobParticles.length - 1; i >= 0; i--) {
      const p = this.bobParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.sprite.destroy();
        this.bobParticles.splice(i, 1);
        continue;
      }
      const progress = p.life / p.maxLife;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.setAlpha(1 - progress * progress);
      p.sprite.setScale(0.85 + progress * 0.3);
    }
  }

  private updateWorldAnimations(time: number, delta: number, dt: number): void {
    // 2-frame animated Hoenn pond water ripples, swaying wildflowers, and butterfly wing flaps
    this.worldTileTimer += delta;
    if (this.worldTileTimer >= 480) {
      this.worldTileTimer = 0;
      this.worldAnimFrame = (this.worldAnimFrame + 1) % 2;

      this.pondSprite.setTexture(this.worldAnimFrame === 0 ? 'pond-0' : 'pond-1');

      for (const flower of this.flowers) {
        const f = (this.worldAnimFrame + flower.phaseOffset) % 2;
        flower.sprite.setTexture(`${flower.prefix}-${f}`);
      }
    }

    // Drifting pixel clouds
    for (const cloud of this.clouds) {
      cloud.sprite.x -= cloud.speed * dt;
      if (cloud.sprite.x < -48) {
        cloud.sprite.x = WORLD_WIDTH + 48;
      }
    }

    // Twinkling night stars & reflected pond starlight
    for (const star of this.stars) {
      if (this.currentNightness <= 0.05) {
        star.sprite.setAlpha(0);
      } else {
        const twinkle = 0.55 + 0.45 * Math.sin(time * 0.004 + star.phase);
        star.sprite.setAlpha(this.currentNightness * twinkle);
      }
    }
    if (this.currentNightness > 0.1) {
      this.pondStarsSprite.setAlpha(this.currentNightness * (0.45 + 0.25 * Math.sin(time * 0.003)));
    } else {
      this.pondStarsSprite.setAlpha(0);
    }

    // Chimney smoke puffs (bakery brick chimney puffs heartily whenever BAKING!)
    const isBaking = this.currentState.activity === 'BAKING';
    for (const puff of this.smokePuffs) {
      const active = puff.isBakery ? isBaking : true;
      puff.sprite.setVisible(active);
      if (!active) continue;

      puff.age = (puff.age + dt * (puff.isBakery ? 0.44 : 0.24)) % 1;
      const sway = Math.sin(puff.age * Math.PI * 2) * (puff.isBakery ? 7 : 5);
      puff.sprite.x = Math.round(puff.baseX + sway + puff.age * 14);
      puff.sprite.y = Math.round(puff.baseY - puff.age * (puff.isBakery ? 46 : 34));
      puff.sprite.setAlpha((1 - puff.age) * (puff.isBakery ? 0.8 : 0.52));
      puff.sprite.setScale((puff.isBakery ? 0.75 : 0.55) + puff.age * 0.85);
    }

    // Daytime Hoenn butterflies (2-frame flapping)
    const flapFrame = Math.floor(time / 160) % 2;
    const showButterflies = this.currentDayness > 0.35;
    for (const b of this.butterflies) {
      b.sprite.setVisible(showButterflies);
      if (!showButterflies) continue;
      const t = time * 0.0014 + b.phase;
      const nx = b.baseX + Math.cos(t) * b.radiusX;
      const ny = b.baseY + Math.sin(t * 1.8) * b.radiusY;
      b.sprite.setFlipX(nx < b.sprite.x);
      b.sprite.x = nx;
      b.sprite.y = ny;
      b.sprite.setTexture(`${b.prefix}-${flapFrame}`);
      b.sprite.setAlpha(Math.min(1, this.currentDayness * 1.25));
    }

    // Nighttime drifting glowing fireflies
    const showFireflies = this.currentNightness > 0.3;
    for (const f of this.fireflies) {
      f.sprite.setVisible(showFireflies);
      if (!showFireflies) continue;
      const t = time * 0.001 * f.speed + f.phase;
      f.sprite.x = f.baseX + Math.sin(t) * 18;
      f.sprite.y = f.baseY + Math.cos(t * 1.4) * 10;
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.005 + f.phase * 2));
      f.sprite.setAlpha(this.currentNightness * pulse);
    }
  }

  private getEmoteTextureKey(): string {
    if (this.upsetTimer > 0) return 'emote-alert';
    switch (this.currentState.activity) {
      case 'SLEEPING':
        return 'emote-sleep';
      case 'WAKING_UP':
        return 'emote-sun';
      case 'GARDENING':
        return 'emote-garden';
      case 'WALKING':
        return 'emote-walk';
      case 'BAKING':
        return 'emote-bread';
      case 'FETCHING_WATER':
        return 'emote-water';
      case 'EATING':
        return 'emote-eat';
      case 'RESTOCKING':
        return 'emote-restock';
      case 'STROLLING':
        return 'emote-stroll';
      case 'RELAXING':
        return 'emote-relax';
      case 'IDLE':
      default:
        return 'emote-idle';
    }
  }

  private syncLightingAndEmote(): void {
    const emoteKey = this.getEmoteTextureKey();
    if (emoteKey !== this.lastEmoteKey) {
      this.lastEmoteKey = emoteKey;
      this.emoteSprite.setTexture(emoteKey);
      this.emotePopTimer = 280;
    }

    const { hour, minute, activity } = this.currentState;
    const lighting = sampleLighting(hour, minute);
    this.currentNightness = lighting.nightness;
    this.currentDayness = lighting.dayness;

    // Update 4 crisp GBA sky bands
    for (let i = 0; i < this.skyBandRects.length; i++) {
      this.skyBandRects[i].setFillStyle(lighting.skyBands[i], 1);
    }

    // Tint & fade pixel clouds naturally with time of day
    for (const cloud of this.clouds) {
      cloud.sprite.setTint(lighting.cloudTint);
      cloud.sprite.setAlpha(0.2 + lighting.dayness * 0.78);
    }

    // Smooth ambient day/night tint overlay
    this.nightOverlay.setFillStyle(lighting.overlayColor, lighting.overlayAlpha);

    // Warm cottage window glow at dawn/sunset/night
    const cottageGlow = Math.min(0.82, lighting.nightness * 0.85);
    this.cottageGlowLeft.setFillStyle(0xffd460, cottageGlow);
    this.cottageGlowRight.setFillStyle(0xffd460, cottageGlow);
    this.cottageMullions.setAlpha(cottageGlow);
    this.cottageSpill.setFillStyle(0xffcf58, cottageGlow * 0.22);

    // Warm bakery display window & door glow (stays glowing warmly during BAKING/RESTOCKING too)
    const bakeryActive = activity === 'BAKING' || activity === 'RESTOCKING';
    const bakeryGlow = bakeryActive
      ? Math.max(0.36, lighting.nightness * 0.56)
      : lighting.nightness * 0.48;
    this.bakeryGlowWindow.setFillStyle(0xffc44c, bakeryGlow);
    this.bakeryGlowDoor.setFillStyle(0xffd460, Math.min(0.85, bakeryGlow * 1.25));
    this.bakerySpill.setFillStyle(0xffb848, bakeryGlow * 0.28);

    // Cozy village lamp post glow at dusk/night
    const lampAlpha = Math.max(0, (lighting.nightness - 0.15) / 0.85);
    this.lampCore.setFillStyle(0xffe480, lampAlpha * 0.95);
    this.lampGlow.setFillStyle(0xffd868, lampAlpha * 0.28);
  }
}
