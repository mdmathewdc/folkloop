import * as Phaser from 'phaser';
import type { VillagerActivity, VillagerLocation } from '@/lib/types';

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

const LOCATION_ANCHORS: Record<VillagerLocation, { x: number; y: number }> = {
  HOME: { x: 186, y: 268 },
  VILLAGE: { x: 384, y: 286 },
  BAKERY: { x: 582, y: 268 },
};

export class VillageScene extends Phaser.Scene {
  private bobContainer!: Phaser.GameObjects.Container;
  private bobSprite!: Phaser.GameObjects.Image;
  private statusBubble!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private cottageWindowGlow!: Phaser.GameObjects.Rectangle;
  private bakeryWindowGlow!: Phaser.GameObjects.Rectangle;
  private stars: Phaser.GameObjects.Rectangle[] = [];
  private smokePuffs: Array<{
    sprite: Phaser.GameObjects.Rectangle;
    baseX: number;
    baseY: number;
    age: number;
    isBakery: boolean;
  }> = [];
  private butterflies: Array<{
    sprite: Phaser.GameObjects.Rectangle;
    baseX: number;
    baseY: number;
    phase: number;
  }> = [];

  private currentState: VillageSceneState = {
    activity: 'SLEEPING',
    location: 'HOME',
    hour: 7,
    minute: 0,
    happiness: 75,
    upsetPulse: 0,
  };

  private targetX = LOCATION_ANCHORS.HOME.x;
  private targetY = LOCATION_ANCHORS.HOME.y;
  private walkAnimTimer = 0;
  private walkFrame = 0;
  private lastUpsetPulse = 0;
  private upsetTimer = 0;

  constructor() {
    super('VillageScene');
  }

  public updateVillagerState(next: VillageSceneState): void {
    this.currentState = next;
    const anchor = LOCATION_ANCHORS[next.location] ?? LOCATION_ANCHORS.VILLAGE;
    this.targetX = anchor.x;
    this.targetY = anchor.y;

    if (next.upsetPulse > this.lastUpsetPulse) {
      this.lastUpsetPulse = next.upsetPulse;
      this.upsetTimer = 4500;
    }

    if (this.scene && this.scene.isActive()) {
      this.syncLightingAndBubble();
    }
  }

  preload(): void {
    this.createPixelTextures();
  }

  create(): void {
    this.add.rectangle(WORLD_WIDTH / 2, 58, WORLD_WIDTH, 116, 0xa8d5e5);

    const hills = this.add.graphics();
    hills.fillStyle(0x7fb069, 1);
    hills.fillEllipse(150, 128, 360, 110);
    hills.fillEllipse(440, 122, 420, 120);
    hills.fillEllipse(680, 130, 320, 100);

    for (let y = 112; y < WORLD_HEIGHT; y += 32) {
      for (let x = 0; x < WORLD_WIDTH; x += 32) {
        this.add.image(x + 16, y + 16, 'grass-tile');
      }
    }

    this.drawCobblestonePath();

    const treePositions = [
      [56, 152],
      [112, 134],
      [314, 140],
      [452, 136],
      [708, 152],
      [66, 366],
      [698, 368],
    ];
    for (const [tx, ty] of treePositions) {
      this.add.image(tx, ty, 'pixel-tree').setDepth(ty);
    }

    const flowerPositions = [
      [118, 318],
      [252, 336],
      [340, 348],
      [430, 344],
      [512, 332],
      [636, 324],
      [298, 224],
      [472, 226],
    ];
    for (const [fx, fy] of flowerPositions) {
      this.add.image(fx, fy, 'flower-tuft').setDepth(fy - 10);
    }

    this.add.image(384, 240, 'village-sign').setDepth(240);
    this.add
      .text(384, 212, 'FOLKLOOP', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#5c4033',
        backgroundColor: '#f6efe0cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(245);

    this.add.image(186, 198, 'bobs-cottage').setDepth(210);
    this.cottageWindowGlow = this.add.rectangle(160, 210, 22, 18, 0xffd166, 0.0).setDepth(212);
    this.add
      .text(186, 126, "BOB'S COTTAGE", {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: '#fff8ea',
        backgroundColor: '#5c4033cc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(215);

    this.add.image(582, 196, 'bobs-bakery').setDepth(210);
    this.bakeryWindowGlow = this.add.rectangle(610, 212, 28, 20, 0xffbe55, 0.0).setDepth(212);
    this.add
      .text(582, 122, "BOB'S BAKERY", {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: '#fff8ea',
        backgroundColor: '#8d3b1ecc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(215);

    for (let i = 0; i < 4; i++) {
      this.smokePuffs.push({
        sprite: this.add.rectangle(220, 146, 8, 8, 0xf5efe6, 0.55).setDepth(220),
        baseX: 220,
        baseY: 146,
        age: i * 0.25,
        isBakery: false,
      });
      this.smokePuffs.push({
        sprite: this.add.rectangle(624, 142, 10, 10, 0xfff3d6, 0.65).setDepth(220),
        baseX: 624,
        baseY: 142,
        age: i * 0.25,
        isBakery: true,
      });
    }

    for (let i = 0; i < 3; i++) {
      const bx = 260 + i * 115;
      const by = 290 + (i % 2) * 35;
      this.butterflies.push({
        sprite: this.add
          .rectangle(bx, by, 5, 4, i % 2 === 0 ? 0xffd166 : 0xf4a261, 0.95)
          .setDepth(320),
        baseX: bx,
        baseY: by,
        phase: i * 2.1,
      });
    }

    const startAnchor = LOCATION_ANCHORS[this.currentState.location] ?? LOCATION_ANCHORS.HOME;
    this.targetX = startAnchor.x;
    this.targetY = startAnchor.y;

    this.bobContainer = this.add.container(startAnchor.x, startAnchor.y).setDepth(300);
    const shadow = this.add.ellipse(0, 18, 22, 8, 0x2f3e24, 0.35);
    this.bobSprite = this.add.image(0, 0, 'bob-idle-0');

    const bubbleBg = this.add.rectangle(0, -34, 86, 18, 0xfff8ea, 0.94);
    bubbleBg.setStrokeStyle(2, 0x5c4033);
    this.statusText = this.add
      .text(0, -34, 'Zzz...', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#3d2b1f',
      })
      .setOrigin(0.5);

    this.statusBubble = this.add.container(0, 0, [bubbleBg, this.statusText]);
    this.bobContainer.add([shadow, this.bobSprite, this.statusBubble]);

    for (let i = 0; i < 18; i++) {
      const sx = 24 + ((i * 43) % (WORLD_WIDTH - 48));
      const sy = 14 + ((i * 29) % 72);
      const star = this.add.rectangle(sx, sy, 3, 3, 0xfff8d6, 0).setDepth(410);
      this.stars.push(star);
    }

    this.nightOverlay = this.add
      .rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x1a1f3d, 0)
      .setDepth(400);

    this.syncLightingAndBubble();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.upsetTimer > 0) {
      this.upsetTimer = Math.max(0, this.upsetTimer - delta);
      if (this.upsetTimer === 0) {
        this.syncLightingAndBubble();
      }
    }

    const dx = this.targetX - this.bobContainer.x;
    const dy = this.targetY - this.bobContainer.y;
    const dist = Math.hypot(dx, dy);
    const isMoving = dist > 2;

    if (isMoving) {
      const speed = 115;
      const step = Math.min(dist, speed * dt);
      this.bobContainer.x += (dx / dist) * step;
      this.bobContainer.y += (dy / dist) * step;
      this.bobSprite.setFlipX(dx < -1);
    }

    this.walkAnimTimer += delta;
    if (this.walkAnimTimer >= 260) {
      this.walkAnimTimer = 0;
      this.walkFrame = (this.walkFrame + 1) % 2;

      if (isMoving || this.currentState.activity === 'WALKING') {
        this.bobSprite.setTexture(this.walkFrame === 0 ? 'bob-walk-0' : 'bob-walk-1');
        this.bobSprite.y = this.walkFrame === 0 ? -2 : 0;
      } else if (this.currentState.activity === 'BAKING') {
        this.bobSprite.setTexture(this.walkFrame === 0 ? 'bob-bake-0' : 'bob-bake-1');
        this.bobSprite.y = this.walkFrame === 0 ? -1 : 0;
      } else if (this.currentState.activity === 'SLEEPING') {
        this.bobSprite.setTexture('bob-sleep');
        this.bobSprite.y = 2;
      } else {
        this.bobSprite.setTexture(this.walkFrame === 0 ? 'bob-idle-0' : 'bob-idle-1');
        this.bobSprite.y = 0;
      }
    }

    this.statusBubble.y = Math.sin(_time / 450) * 2.5;

    for (const puff of this.smokePuffs) {
      const active = puff.isBakery ? this.currentState.activity === 'BAKING' : true;
      puff.sprite.setVisible(active);
      if (!active) continue;
      puff.age = (puff.age + dt * (puff.isBakery ? 0.42 : 0.25)) % 1;
      puff.sprite.x = puff.baseX + Math.sin(puff.age * Math.PI * 2) * 6 + puff.age * 10;
      puff.sprite.y = puff.baseY - puff.age * 36;
      puff.sprite.setAlpha((1 - puff.age) * 0.65);
      puff.sprite.setScale(0.7 + puff.age * 0.9);
    }

    const isDay = this.currentState.hour >= 7 && this.currentState.hour < 19;
    for (const b of this.butterflies) {
      b.sprite.setVisible(isDay);
      if (isDay) {
        const t = _time / 700 + b.phase;
        b.sprite.x = b.baseX + Math.cos(t) * 26;
        b.sprite.y = b.baseY + Math.sin(t * 1.7) * 14;
      }
    }
  }

  private syncLightingAndBubble(): void {
    const { hour, activity } = this.currentState;

    if (this.upsetTimer > 0) {
      this.statusText.setText('! MY BREAD!');
      this.statusText.setColor('#b52b2b');
    } else {
      this.statusText.setColor('#3d2b1f');
      switch (activity) {
        case 'SLEEPING':
          this.statusText.setText('Zzz...');
          break;
        case 'WAKING_UP':
          this.statusText.setText('Good morn!');
          break;
        case 'WALKING':
          this.statusText.setText('Walking...');
          break;
        case 'BAKING':
          this.statusText.setText('Baking!');
          break;
        case 'EATING':
          this.statusText.setText('Yum! Lunch');
          break;
        case 'RELAXING':
          this.statusText.setText('Relaxing~');
          break;
        default:
          this.statusText.setText('Tidy up');
      }
    }

    let tint = 0x1a1f3d;
    let alpha = 0;
    let windowGlowAlpha = 0;
    let starAlpha = 0;

    if (hour >= 5 && hour < 7) {
      tint = 0xe76f51;
      alpha = 0.16;
      windowGlowAlpha = 0.5;
      starAlpha = 0.25;
    } else if (hour >= 7 && hour < 17) {
      alpha = 0.0;
      windowGlowAlpha = 0.0;
      starAlpha = 0.0;
    } else if (hour >= 17 && hour < 20) {
      tint = 0xd96b27;
      alpha = 0.22;
      windowGlowAlpha = 0.65;
      starAlpha = 0.35;
    } else {
      tint = 0x151b38;
      alpha = 0.46;
      windowGlowAlpha = 0.85;
      starAlpha = 0.9;
    }

    this.nightOverlay.setFillStyle(tint, alpha);
    this.cottageWindowGlow.setFillStyle(0xffd166, windowGlowAlpha);
    this.bakeryWindowGlow.setFillStyle(
      0xffbe55,
      activity === 'BAKING' ? Math.max(0.45, windowGlowAlpha) : windowGlowAlpha * 0.5,
    );
    for (const star of this.stars) {
      star.setAlpha(starAlpha);
    }
  }

  private drawCobblestonePath(): void {
    const g = this.add.graphics();
    g.fillStyle(0xd8c39e, 1);
    g.fillRoundedRect(172, 266, 424, 34, 14);
    g.fillRoundedRect(174, 244, 28, 34, 6);
    g.fillRoundedRect(568, 244, 28, 34, 6);

    g.fillStyle(0xc4ab82, 1);
    for (let x = 186; x <= 582; x += 22) {
      g.fillRoundedRect(x, 273 + ((x / 22) % 2) * 8, 12, 8, 2);
    }
    g.setDepth(50);
  }

  private createPixelTextures(): void {
    if (this.textures.exists('grass-tile')) return;

    this.makeCanvasTexture('grass-tile', 32, 32, (ctx) => {
      ctx.fillStyle = '#8db56b';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#7fa75d';
      ctx.fillRect(4, 6, 4, 2);
      ctx.fillRect(20, 18, 4, 2);
      ctx.fillRect(10, 26, 2, 2);
      ctx.fillStyle = '#9ec47d';
      ctx.fillRect(24, 6, 2, 2);
      ctx.fillRect(8, 16, 2, 2);
    });

    this.makeCanvasTexture('flower-tuft', 16, 16, (ctx) => {
      ctx.fillStyle = '#4f772d';
      ctx.fillRect(4, 10, 8, 4);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(3, 6, 4, 4);
      ctx.fillStyle = '#f28482';
      ctx.fillRect(9, 7, 4, 4);
      ctx.fillStyle = '#fff8ea';
      ctx.fillRect(6, 4, 3, 3);
    });

    this.makeCanvasTexture('pixel-tree', 48, 64, (ctx) => {
      ctx.fillStyle = 'rgba(40, 60, 30, 0.25)';
      ctx.fillRect(10, 56, 28, 6);
      ctx.fillStyle = '#6f4e37';
      ctx.fillRect(20, 40, 8, 18);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(24, 40, 4, 18);
      ctx.fillStyle = '#3d6b2c';
      ctx.fillRect(8, 22, 32, 22);
      ctx.fillStyle = '#4f772d';
      ctx.fillRect(10, 12, 28, 22);
      ctx.fillStyle = '#6a994e';
      ctx.fillRect(14, 6, 20, 16);
      ctx.fillStyle = '#90a955';
      ctx.fillRect(16, 8, 8, 6);
    });

    this.makeCanvasTexture('village-sign', 32, 40, (ctx) => {
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(14, 10, 4, 28);
      ctx.fillStyle = '#a47148';
      ctx.fillRect(4, 12, 24, 10);
      ctx.fillStyle = '#7f5539';
      ctx.fillRect(4, 20, 24, 2);
    });

    this.makeCanvasTexture('bobs-cottage', 128, 112, (ctx) => {
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(90, 10, 16, 36);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(88, 8, 20, 6);
      ctx.fillStyle = '#b54a28';
      ctx.fillRect(8, 36, 112, 18);
      ctx.fillStyle = '#c85a32';
      ctx.fillRect(16, 24, 96, 16);
      ctx.fillStyle = '#d96b43';
      ctx.fillRect(28, 14, 72, 14);
      ctx.fillStyle = '#f3e5c8';
      ctx.fillRect(16, 54, 96, 50);
      ctx.fillStyle = '#6f4e37';
      ctx.fillRect(16, 54, 6, 50);
      ctx.fillRect(106, 54, 6, 50);
      ctx.fillRect(16, 98, 96, 6);
      ctx.fillStyle = '#7f5539';
      ctx.fillRect(54, 68, 22, 34);
      ctx.fillStyle = '#e09f3e';
      ctx.fillRect(70, 84, 3, 3);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(26, 66, 22, 20);
      ctx.fillStyle = '#8ecae6';
      ctx.fillRect(29, 69, 16, 14);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(36, 69, 2, 14);
      ctx.fillRect(29, 75, 16, 2);
    });

    this.makeCanvasTexture('bobs-bakery', 136, 116, (ctx) => {
      ctx.fillStyle = '#9c4221';
      ctx.fillRect(102, 8, 18, 38);
      ctx.fillStyle = '#7b341e';
      ctx.fillRect(100, 6, 22, 6);
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(8, 34, 120, 20);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(18, 20, 100, 16);
      ctx.fillStyle = '#faedcd';
      ctx.fillRect(14, 54, 108, 54);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(14, 102, 108, 6);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#c85a32' : '#fff8ea';
        ctx.fillRect(16 + i * 11.5, 52, 12, 12);
      }
      ctx.fillStyle = '#7f5539';
      ctx.fillRect(54, 70, 24, 36);
      ctx.fillStyle = '#e09f3e';
      ctx.fillRect(72, 88, 3, 3);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(82, 68, 30, 24);
      ctx.fillStyle = '#bde0fe';
      ctx.fillRect(85, 71, 24, 18);
      ctx.fillStyle = '#e09f3e';
      ctx.fillRect(88, 82, 7, 5);
      ctx.fillRect(98, 82, 7, 5);
      ctx.fillStyle = '#e09f3e';
      ctx.fillRect(24, 70, 20, 14);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(28, 74, 12, 6);
    });

    const drawBob = (
      ctx: CanvasRenderingContext2D,
      opts: { legOffset: number; armsUp?: boolean; sleeping?: boolean; holdingBread?: boolean },
    ) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 2, 12, 8);
      ctx.fillRect(8, 5, 16, 6);
      ctx.fillStyle = '#e6dfd5';
      ctx.fillRect(10, 10, 12, 2);

      ctx.fillStyle = '#f2c59b';
      ctx.fillRect(10, 12, 12, 10);
      ctx.fillStyle = '#2b2118';
      if (opts.sleeping) {
        ctx.fillRect(12, 16, 3, 1);
        ctx.fillRect(17, 16, 3, 1);
      } else {
        ctx.fillRect(12, 15, 2, 2);
        ctx.fillRect(18, 15, 2, 2);
      }
      ctx.fillStyle = '#e07a5f';
      ctx.fillRect(11, 18, 2, 1);
      ctx.fillRect(19, 18, 2, 1);

      ctx.fillStyle = '#457b9d';
      ctx.fillRect(9, 22, 14, 10);
      ctx.fillStyle = '#fff8ea';
      ctx.fillRect(11, 23, 10, 10);

      ctx.fillStyle = '#f2c59b';
      if (opts.armsUp) {
        ctx.fillRect(6, 20, 3, 6);
        ctx.fillRect(23, 20, 3, 6);
      } else {
        ctx.fillRect(6, 23, 3, 6);
        ctx.fillRect(23, 23, 3, 6);
      }

      if (opts.holdingBread) {
        ctx.fillStyle = '#e09f3e';
        ctx.fillRect(22, 18, 8, 5);
        ctx.fillStyle = '#b5651d';
        ctx.fillRect(23, 19, 6, 2);
      }

      ctx.fillStyle = '#5c4033';
      ctx.fillRect(11, 33 + opts.legOffset, 4, 5);
      ctx.fillRect(17, 33 - opts.legOffset, 4, 5);
    };

    this.makeCanvasTexture('bob-idle-0', 32, 40, (ctx) => drawBob(ctx, { legOffset: 0 }));
    this.makeCanvasTexture('bob-idle-1', 32, 40, (ctx) => drawBob(ctx, { legOffset: 0 }));
    this.makeCanvasTexture('bob-walk-0', 32, 40, (ctx) => drawBob(ctx, { legOffset: 2 }));
    this.makeCanvasTexture('bob-walk-1', 32, 40, (ctx) => drawBob(ctx, { legOffset: -2 }));
    this.makeCanvasTexture('bob-bake-0', 32, 40, (ctx) =>
      drawBob(ctx, { legOffset: 0, armsUp: true, holdingBread: true }),
    );
    this.makeCanvasTexture('bob-bake-1', 32, 40, (ctx) =>
      drawBob(ctx, { legOffset: 0, armsUp: false, holdingBread: true }),
    );
    this.makeCanvasTexture('bob-sleep', 32, 40, (ctx) =>
      drawBob(ctx, { legOffset: 0, sleeping: true }),
    );
  }

  private makeCanvasTexture(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const tex = this.textures.createCanvas(key, width, height);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    tex.refresh();
  }
}
