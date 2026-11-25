import type * as Phaser from 'phaser';

/**
 * Authentic GBA Gen 3 (Pokémon Emerald / Hoenn / Littleroot Town) palette.
 * All textures are authored on a crisp 2x virtual GBA pixel grid (1 logical pixel = 2x2 canvas px).
 */
export const EMERALD_PALETTE = {
  outline: '#182018',
  outlineSoft: '#203028',
  outlineWarm: '#2c1e18',

  // Hoenn Meadow Grass
  grassLight: '#78d868',
  grassBase: '#60c050',
  grassMid: '#4ca840',
  grassDark: '#388834',
  grassDeep: '#28682c',

  // Hoenn Tall Grass
  tallLight: '#70e060',
  tallMid: '#38a048',
  tallDark: '#207038',
  tallShadow: '#184828',

  // Hoenn Trees (Emerald pine/oak)
  treeHighlight: '#90e060',
  treeBright: '#60c048',
  treeMid: '#389040',
  treeShade: '#206838',
  treeDeep: '#184830',
  trunkLight: '#986840',
  trunkMid: '#784828',
  trunkDark: '#50301c',

  // Hoenn Sandy Path
  pathHighlight: '#f0dc9c',
  pathBase: '#dfc080',
  pathShade: '#c49e60',
  pathBorder: '#987444',
  pathEdgeGrass: '#387834',

  // Hoenn Water Pond
  waterHighlight: '#d0f8ff',
  waterRipple: '#88e0ff',
  waterShallow: '#50b8e8',
  waterMid: '#3090d8',
  waterDeep: '#206cb8',
  sandRim: '#e4cc8c',
  sandDark: '#b89458',

  // Cottage (Littleroot Red-Terracotta Roof & Timber/Cream)
  roofRedHi: '#e86c4c',
  roofRedBase: '#c84838',
  roofRedShade: '#983028',
  roofRedDeep: '#6c201c',
  creamHi: '#fffaf0',
  creamBase: '#f4ead0',
  creamShade: '#d8c8a8',
  stoneHi: '#b8c0c0',
  stoneBase: '#8c9498',
  stoneDark: '#606870',
  woodHi: '#a87448',
  woodBase: '#805030',
  woodDark: '#583420',

  // Bakery (Hoenn Slate-Teal Shop Roof & Brick)
  roofTealHi: '#58a8c0',
  roofTealBase: '#38809c',
  roofTealShade: '#286078',
  roofTealDeep: '#1c4458',
  brickHi: '#d06040',
  brickBase: '#a8402c',
  brickDark: '#78281c',
  awningRed: '#d84038',
  awningRedDark: '#a82824',
  awningCream: '#fff8e8',
  awningCreamDark: '#dcd0b8',

  // Glass & Warm Bread
  glassHi: '#c8f0ff',
  glassBase: '#78c0e8',
  glassDark: '#4888b8',
  breadHi: '#ffe088',
  breadBase: '#e8a038',
  breadDark: '#b86c20',
  goldTrim: '#f0c850',

  // Bob the Baker
  white: '#ffffff',
  whiteShade: '#d4dce4',
  whiteDeep: '#a4b0bc',
  skinHi: '#ffd8b0',
  skinBase: '#f4bc8c',
  skinShade: '#d89868',
  cheek: '#f07878',
  hairBase: '#7c4828',
  hairDark: '#502c18',
  tunicHi: '#5094e0',
  tunicBase: '#3474c0',
  tunicDark: '#204c88',
  bootBase: '#6c442c',
  bootDark: '#442818',

  // Flowers & Accents
  flowerRed: '#f05048',
  flowerRedDark: '#b82828',
  flowerYellow: '#f8d840',
  flowerYellowDark: '#c89820',
  flowerBlue: '#58a8f8',
  flowerBlueDark: '#2c6cc0',
  heartPink: '#f46078',
  heartHi: '#ffa0b0',
} as const;

type PaletteMap = Record<string, string>;

const PX = 2; // 1 logical GBA pixel = 2x2 canvas pixels

function pRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  scale = PX,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.round(w * scale), Math.round(h * scale));
}

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  palette: PaletteMap,
  scale = PX,
  offsetX = 0,
  offsetY = 0,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect((offsetX + x) * scale, (offsetY + y) * scale, scale, scale);
    }
  }
}

function makeCanvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
}

export function registerEmeraldTextures(scene: Phaser.Scene): void {
  const P = EMERALD_PALETTE;

  // 1. EMERALD MEADOW GRASS TILES (32x32 = 16x16 @ 2x)
  const drawGrassBase = (ctx: CanvasRenderingContext2D, variant: number) => {
    pRect(ctx, 0, 0, 16, 16, P.grassBase);

    // Subtle Hoenn tiled highlight pattern (soft sunlit grass)
    pRect(ctx, 0, 0, 8, 8, P.grassBase);
    pRect(ctx, 2, 1, 3, 1, P.grassLight);
    pRect(ctx, 10, 9, 3, 1, P.grassLight);
    pRect(ctx, 12, 3, 2, 1, P.grassMid);
    pRect(ctx, 3, 12, 2, 1, P.grassMid);

    if (variant === 0) {
      // Classic gentle V-blade tufts
      pRect(ctx, 3, 4, 1, 2, P.grassDark);
      pRect(ctx, 4, 5, 1, 1, P.grassMid);
      pRect(ctx, 5, 4, 1, 2, P.grassDark);
      pRect(ctx, 4, 3, 1, 1, P.grassLight);

      pRect(ctx, 11, 11, 1, 2, P.grassDark);
      pRect(ctx, 12, 12, 1, 1, P.grassMid);
      pRect(ctx, 13, 11, 1, 2, P.grassDark);
      pRect(ctx, 12, 10, 1, 1, P.grassLight);
    } else if (variant === 1) {
      // Soft meadow blades + tiny clover highlight
      pRect(ctx, 7, 3, 1, 2, P.grassDark);
      pRect(ctx, 8, 4, 1, 1, P.grassMid);
      pRect(ctx, 9, 3, 1, 1, P.grassLight);

      pRect(ctx, 2, 11, 2, 1, P.grassLight);
      pRect(ctx, 3, 10, 1, 1, P.grassLight);
      pRect(ctx, 2, 12, 2, 1, P.grassDark);

      pRect(ctx, 12, 6, 1, 2, P.grassMid);
      pRect(ctx, 13, 7, 1, 1, P.grassDark);
    } else {
      // Dewy grass specks + dual tufts
      pRect(ctx, 5, 8, 1, 2, P.grassDark);
      pRect(ctx, 6, 9, 1, 1, P.grassMid);
      pRect(ctx, 7, 8, 1, 2, P.grassDark);
      pRect(ctx, 6, 7, 1, 1, P.grassLight);

      pRect(ctx, 13, 2, 1, 1, P.grassLight);
      pRect(ctx, 1, 14, 2, 1, P.grassMid);
      pRect(ctx, 10, 14, 1, 1, P.grassDark);
    }
  };

  makeCanvas(scene, 'grass-0', 32, 32, (ctx) => drawGrassBase(ctx, 0));
  makeCanvas(scene, 'grass-1', 32, 32, (ctx) => drawGrassBase(ctx, 1));
  makeCanvas(scene, 'grass-2', 32, 32, (ctx) => drawGrassBase(ctx, 2));

  // 2. CLASSIC HOENN TALL GRASS PATCH (32x32 = 16x16 @ 2x)
  const tallGrassMatrix = [
    '................',
    '..o..o....o..o..',
    '.oLo.oL..oLo.oL.',
    '.oMmoMMo.oMmoMMo',
    'oLMDmDMMoLMDmDMM',
    'oMMDmDDMoMMDmDDM',
    '.oSDDDDDmoSDDDDo',
    '.oSSSDSSooSSSDSo',
    '..o..o....o..o..',
    '.oLo.oL..oLo.oL.',
    '.oMmoMMo.oMmoMMo',
    'oLMDmDMMoLMDmDMM',
    'oMMDmDDMoMMDmDDM',
    '.oSDDDDDmoSDDDDo',
    '.oSSSSSSooSSSSSo',
    '..oooooo..oooooo',
  ];
  const tallGrassPal: PaletteMap = {
    o: P.outlineSoft,
    L: P.tallLight,
    M: P.tallMid,
    m: P.grassBase,
    D: P.tallDark,
    S: P.tallShadow,
  };
  makeCanvas(scene, 'tall-grass', 32, 32, (ctx) => {
    drawMatrix(ctx, tallGrassMatrix, tallGrassPal);
  });

  // 3. 2-FRAME ANIMATED SWAYING HOENN WILDFLOWERS (16x16 = 8x8 @ 2x)
  const makeFlowerPair = (keyPrefix: string, petal: string, petalDark: string, center: string) => {
    const f0 = [
      '..oooo..',
      '.oPCCPo.',
      '.oPCCPo.',
      '..oDDo..',
      '.ogGggo.',
      '..oGgo..',
      '..oSgo..',
      '...oo...',
    ];
    const f1 = [
      '...oooo.',
      '..oPCCPo',
      '..oPCCPo',
      '...oDDo.',
      '.oggGgo.',
      '..ogGo..',
      '..oSgo..',
      '...oo...',
    ];
    const pal: PaletteMap = {
      o: P.outlineSoft,
      P: petal,
      D: petalDark,
      C: center,
      G: P.grassLight,
      g: P.grassDark,
      S: P.tallShadow,
    };
    makeCanvas(scene, `${keyPrefix}-0`, 16, 16, (ctx) => drawMatrix(ctx, f0, pal));
    makeCanvas(scene, `${keyPrefix}-1`, 16, 16, (ctx) => drawMatrix(ctx, f1, pal));
  };

  makeFlowerPair('flower-red', P.flowerRed, P.flowerRedDark, P.flowerYellow);
  makeFlowerPair('flower-yellow', P.flowerYellow, P.flowerYellowDark, P.white);
  makeFlowerPair('flower-blue', P.flowerBlue, P.flowerBlueDark, P.white);

  // 4. SHIMMERING ANIMATED HOENN WATER POND (176x84 = 88x42 @ 2x)
  const drawPond = (ctx: CanvasRenderingContext2D, frame: number) => {
    const W = 88;
    const H = 42;
    const cx = 44;
    const cy = 21;
    const rx = 41;
    const ry = 18.5;

    // Shape distance function with organic Hoenn cove indentation
    const pondDist = (x: number, y: number): number => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      // Subtle cozy bay curve on top-right
      const lobe = Math.sin((x - 10) * 0.14) * 0.06 + Math.cos(y * 0.25) * 0.04;
      return dx * dx + dy * dy + lobe;
    };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = pondDist(x, y);
        if (d > 1.06) continue;
        if (d > 0.96) {
          pRect(ctx, x, y, 1, 1, P.outlineSoft);
        } else if (d > 0.84) {
          // Sandy Hoenn shore rim with subtle shadow at top edge
          const isTopEdge = y < cy;
          pRect(ctx, x, y, 1, 1, isTopEdge ? P.sandDark : P.sandRim);
        } else if (d > 0.77) {
          pRect(ctx, x, y, 1, 1, P.outlineSoft);
        } else if (d > 0.62) {
          // Shallow turquoise rim (deeper at north bank for 3/4 depth illusion)
          pRect(ctx, x, y, 1, 1, y < cy - 5 ? P.waterDeep : P.waterShallow);
        } else if (d > 0.34) {
          pRect(ctx, x, y, 1, 1, P.waterMid);
        } else {
          pRect(ctx, x, y, 1, 1, P.waterDeep);
        }
      }
    }

    // Shore foam edge pixels along south/west shallow rim
    const foamShift = frame === 0 ? 0 : 1;
    for (let x = 20; x <= 68; x += 6) {
      pRect(ctx, x + foamShift, 32, 3, 1, P.waterRipple);
    }
    for (let x = 24; x <= 64; x += 8) {
      pRect(ctx, x - foamShift, 11, 3, 1, P.waterShallow);
    }

    // 2-frame animated bright GBA water-ripple highlights
    const ripples: Array<[number, number, number]> =
      frame === 0
        ? [
            [24, 17, 6],
            [42, 15, 8],
            [58, 19, 6],
            [30, 24, 7],
            [48, 26, 9],
            [62, 24, 5],
            [36, 20, 4],
          ]
        : [
            [26, 17, 5],
            [40, 15, 7],
            [56, 19, 7],
            [32, 24, 6],
            [46, 26, 8],
            [60, 24, 6],
            [38, 20, 5],
          ];

    for (const [rxp, ryp, rw] of ripples) {
      pRect(ctx, rxp, ryp, rw, 1, P.waterRipple);
      pRect(ctx, rxp + 1, ryp, Math.max(2, rw - 3), 1, P.waterHighlight);
    }

    // Cute lily pad + pink lotus blossom on the left side of pond
    const lx = 19;
    const ly = 21 + (frame === 0 ? 0 : 1);
    pRect(ctx, lx - 1, ly, 8, 5, P.outlineSoft);
    pRect(ctx, lx, ly + 1, 6, 3, P.grassDark);
    pRect(ctx, lx + 1, ly + 1, 4, 2, P.grassBase);
    pRect(ctx, lx + 5, ly + 2, 2, 1, P.waterMid); // classic lily pad notch
    // Pink pixel flower on lily pad
    pRect(ctx, lx + 1, ly - 1, 3, 2, P.heartPink);
    pRect(ctx, lx + 2, ly - 1, 1, 1, P.white);

    // Small decorative shore pebbles on sand rim
    pRect(ctx, 13, 26, 2, 1, P.stoneDark);
    pRect(ctx, 73, 16, 2, 1, P.stoneDark);
    pRect(ctx, 68, 33, 2, 1, P.stoneDark);
  };

  makeCanvas(scene, 'pond-0', 176, 84, (ctx) => drawPond(ctx, 0));
  makeCanvas(scene, 'pond-1', 176, 84, (ctx) => drawPond(ctx, 1));

  // Night starlight reflections inside pond
  makeCanvas(scene, 'pond-stars', 176, 84, (ctx) => {
    const pts: Array<[number, number]> = [
      [28, 16],
      [44, 19],
      [56, 15],
      [35, 25],
      [52, 27],
      [64, 21],
    ];
    for (const [x, y] of pts) {
      pRect(ctx, x, y, 2, 1, '#fff6c8');
      pRect(ctx, x, y - 1, 1, 3, '#c8e8ff');
    }
  });

  // 5. DENSE MULTI-LAYERED POKÉMON EMERALD TREES
  // Primary lush rounded Littleroot Emerald Tree (56x72 = 28x36 @ 2x)
  const drawEmeraldTree = (ctx: CanvasRenderingContext2D) => {
    // Ground shadow oval
    pRect(ctx, 5, 31, 18, 4, 'rgba(20, 48, 30, 0.38)');
    pRect(ctx, 7, 30, 14, 5, 'rgba(20, 48, 30, 0.25)');

    // Sturdy trunk with crisp outline
    pRect(ctx, 10, 23, 8, 10, P.outline);
    pRect(ctx, 11, 24, 6, 8, P.trunkMid);
    pRect(ctx, 11, 24, 2, 8, P.trunkLight);
    pRect(ctx, 15, 24, 2, 8, P.trunkDark);
    // Root flare
    pRect(ctx, 9, 31, 10, 2, P.outline);
    pRect(ctx, 10, 31, 8, 1, P.trunkDark);

    // Helper for rounded pixel leaf clusters
    const leafBlob = (cx: number, cy: number, rx: number, ry: number, color: string) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d <= 1.0) pRect(ctx, x, y, 1, 1, color);
        }
      }
    };

    // Outer dark outline silhouette (3-tiered iconic Emerald crown)
    leafBlob(14, 21, 12.5, 6.8, P.outline);
    leafBlob(14, 14, 11.2, 6.8, P.outline);
    leafBlob(14, 8, 8.2, 5.8, P.outline);

    // Deep teal-green under-canopy shadow
    leafBlob(14, 21, 11.4, 5.6, P.treeDeep);
    leafBlob(14, 14.5, 10.1, 5.7, P.treeDeep);
    leafBlob(14, 8.5, 7.1, 4.7, P.treeDeep);

    // Rich teal-emerald shade tier
    leafBlob(13.5, 19.5, 10.8, 4.7, P.treeShade);
    leafBlob(13.5, 13.5, 9.4, 4.8, P.treeShade);
    leafBlob(13.5, 7.8, 6.6, 4.1, P.treeShade);

    // Emerald mid-foliage puffs
    leafBlob(10, 18.5, 5.5, 3.3, P.treeMid);
    leafBlob(18, 18.5, 5.2, 3.1, P.treeMid);
    leafBlob(14, 17.5, 6.2, 3.4, P.treeMid);
    leafBlob(11, 12.5, 5.4, 3.4, P.treeMid);
    leafBlob(17, 12.5, 5.0, 3.2, P.treeMid);
    leafBlob(14, 7.2, 5.8, 3.4, P.treeMid);

    // Bright Emerald canopy highlights
    leafBlob(10, 17.2, 3.5, 2.0, P.treeBright);
    leafBlob(17.5, 17.4, 3.2, 1.9, P.treeBright);
    leafBlob(14, 16.0, 4.0, 2.1, P.treeBright);
    leafBlob(11, 11.2, 3.8, 2.2, P.treeBright);
    leafBlob(16.8, 11.5, 3.1, 1.8, P.treeBright);
    leafBlob(13.5, 6.2, 4.4, 2.4, P.treeBright);

    // Iconic GBA lime-green top sunlit leaf pixels
    pRect(ctx, 11, 4, 4, 2, P.treeHighlight);
    pRect(ctx, 10, 5, 2, 1, P.treeHighlight);
    pRect(ctx, 9, 10, 3, 2, P.treeHighlight);
    pRect(ctx, 15, 10, 2, 1, P.treeHighlight);
    pRect(ctx, 8, 16, 3, 1, P.treeHighlight);
    pRect(ctx, 13, 15, 2, 1, P.treeHighlight);
    pRect(ctx, 17, 16, 2, 1, P.treeHighlight);

    // Crisp inner canopy tier crease pixels (gives that authentic GBA layered puff look!)
    pRect(ctx, 6, 15, 3, 1, P.treeDeep);
    pRect(ctx, 12, 14, 4, 1, P.treeDeep);
    pRect(ctx, 19, 15, 3, 1, P.treeDeep);
    pRect(ctx, 9, 9, 3, 1, P.treeDeep);
    pRect(ctx, 16, 9, 3, 1, P.treeDeep);
  };

  makeCanvas(scene, 'tree-emerald', 56, 72, drawEmeraldTree);

  // Secondary conical Emerald Pine Tree (48x64 = 24x32 @ 2x)
  const drawEmeraldPine = (ctx: CanvasRenderingContext2D) => {
    pRect(ctx, 5, 28, 14, 3, 'rgba(20, 48, 30, 0.35)');

    // Trunk
    pRect(ctx, 9, 22, 6, 8, P.outline);
    pRect(ctx, 10, 23, 4, 6, P.trunkMid);
    pRect(ctx, 10, 23, 1, 6, P.trunkLight);
    pRect(ctx, 13, 23, 1, 6, P.trunkDark);

    // Layered pine tiers
    const tiers: Array<[number, number, number]> = [
      [16, 24, 10], // bottom tier: yTop, yBot, halfW
      [9, 18, 8],   // mid tier
      [2, 11, 5],   // top tier
    ];

    for (const [yTop, yBot, maxHalf] of tiers) {
      const h = yBot - yTop;
      for (let y = yTop; y <= yBot; y++) {
        const t = (y - yTop) / h;
        const hw = Math.max(1, Math.round(1 + t * maxHalf));
        pRect(ctx, 12 - hw - 1, y, (hw + 1) * 2, 1, P.outline);
      }
    }
    for (const [yTop, yBot, maxHalf] of tiers) {
      const h = yBot - yTop;
      for (let y = yTop + 1; y < yBot; y++) {
        const t = (y - yTop) / h;
        const hw = Math.max(1, Math.round(1 + t * (maxHalf - 0.6)));
        pRect(ctx, 12 - hw, y, hw * 2, 1, y >= yBot - 2 ? P.treeDeep : P.treeShade);
        if (hw >= 2) {
          pRect(ctx, 12 - hw + 1, y, Math.max(1, hw * 2 - 3), 1, P.treeMid);
        }
        if (hw >= 3 && y < yBot - 2) {
          pRect(ctx, 12 - hw + 1, y, Math.max(1, hw - 1), 1, P.treeBright);
        }
      }
      // Lime highlight near top-left of each pine tier
      pRect(ctx, 10, yTop + 2, 2, 2, P.treeHighlight);
    }
  };

  makeCanvas(scene, 'tree-emerald-alt', 48, 64, drawEmeraldPine);

  // 6. WHITE WOODEN PICKET FENCE (32x24 = 16x12 @ 2x)
  const fenceMatrix = [
    '..oo..oo..oo..oo',
    '.oWWooWWooWWooWW',
    '.oWStoWStoWStoWS',
    'ooWWooWWooWWooWW',
    'oWWWSWWWWWWWWWSW',
    'oSSSoSSSoSSSoSSS',
    '.oWWooWWooWWooWW',
    'ooWWooWWooWWooWW',
    'oWWWSWWWWWWWWWSW',
    'oSSSoSSSoSSSoSSS',
    '.oSSooSSooSSooSS',
    '.oooo.oo..oo..oo',
  ];
  const fencePal: PaletteMap = {
    o: P.outlineSoft,
    W: P.white,
    S: P.whiteShade,
    t: P.whiteDeep,
  };
  makeCanvas(scene, 'fence-h', 32, 24, (ctx) => {
    pRect(ctx, 1, 10, 14, 2, 'rgba(20, 48, 30, 0.28)');
    drawMatrix(ctx, fenceMatrix, fencePal);
  });

  // 7. LITTLEROOT MAILBOX (20x30 = 10x15 @ 2x)
  const mailboxMatrix = [
    '..oooooo..',
    '.oRRRRRRo.',
    'oRWWWWWRRo',
    'oRWWRRWRRo',
    'oRWWWWWRRo',
    'oRDDDDDRRo',
    '.oooooooo.',
    '...oWWo...',
    '...oWDo...',
    '...oWDo...',
    '...oWDo...',
    '...oWDo...',
    '..oWDDo...',
    '..oooooo..',
    '..........',
  ];
  const mailboxPal: PaletteMap = {
    o: P.outline,
    R: P.roofRedBase,
    W: P.white,
    D: P.whiteShade,
  };
  makeCanvas(scene, 'mailbox', 20, 30, (ctx) => {
    pRect(ctx, 2, 13, 6, 2, 'rgba(20, 48, 30, 0.3)');
    drawMatrix(ctx, mailboxMatrix, mailboxPal);
    // Tiny brass mail flag
    pRect(ctx, 8, 2, 1, 3, P.goldTrim);
  });

  // 8. HOENN ROUTE WOODEN SIGNPOST (36x40 = 18x20 @ 2x)
  makeCanvas(scene, 'route-sign', 36, 40, (ctx) => {
    pRect(ctx, 4, 17, 10, 2, 'rgba(20, 48, 30, 0.32)');
    // Post
    pRect(ctx, 7, 10, 4, 8, P.outline);
    pRect(ctx, 8, 11, 2, 6, P.woodBase);
    pRect(ctx, 8, 11, 1, 6, P.woodHi);
    // Sign board with crisp GBA outline & bevel
    pRect(ctx, 1, 2, 16, 10, P.outline);
    pRect(ctx, 2, 3, 14, 8, P.woodBase);
    pRect(ctx, 2, 3, 14, 1, P.woodHi);
    pRect(ctx, 2, 10, 14, 1, P.woodDark);
    // Cream parchment plaque inset
    pRect(ctx, 3, 4, 12, 6, P.creamBase);
    pRect(ctx, 3, 9, 12, 1, P.creamShade);
    // Pixel lettering rows (evokes classic Littleroot sign text)
    pRect(ctx, 4, 5, 3, 1, P.woodDark);
    pRect(ctx, 8, 5, 5, 1, P.woodDark);
    pRect(ctx, 5, 7, 4, 1, P.woodBase);
    pRect(ctx, 10, 7, 3, 1, P.woodBase);
  });

  // 9. VILLAGE LAMP POST (20x44 = 10x22 @ 2x)
  makeCanvas(scene, 'lamp-post', 20, 44, (ctx) => {
    pRect(ctx, 2, 19, 6, 2, 'rgba(20, 48, 30, 0.32)');
    // Lantern roof
    pRect(ctx, 2, 1, 6, 2, P.outline);
    pRect(ctx, 3, 2, 4, 1, P.stoneDark);
    // Glass lantern housing
    pRect(ctx, 2, 3, 6, 5, P.outline);
    pRect(ctx, 3, 4, 4, 3, P.glassHi);
    pRect(ctx, 4, 4, 2, 2, P.breadHi);
    // Iron post
    pRect(ctx, 4, 8, 2, 11, P.outline);
    pRect(ctx, 4, 8, 1, 11, P.stoneDark);
    // Base pedestal
    pRect(ctx, 3, 17, 4, 3, P.outline);
    pRect(ctx, 4, 18, 2, 1, P.stoneBase);
  });

  // 10. WOODEN PARK BENCH (44x26 = 22x13 @ 2x)
  makeCanvas(scene, 'wood-bench', 44, 26, (ctx) => {
    pRect(ctx, 1, 10, 20, 3, 'rgba(20, 48, 30, 0.28)');
    // Backrest
    pRect(ctx, 1, 1, 20, 5, P.outline);
    pRect(ctx, 2, 2, 18, 3, P.woodHi);
    pRect(ctx, 2, 3, 18, 1, P.woodBase);
    // Seat
    pRect(ctx, 1, 6, 20, 4, P.outline);
    pRect(ctx, 2, 7, 18, 2, P.woodHi);
    pRect(ctx, 2, 8, 18, 1, P.woodDark);
    // Legs
    pRect(ctx, 3, 10, 3, 2, P.outline);
    pRect(ctx, 16, 10, 3, 2, P.outline);
    pRect(ctx, 4, 10, 1, 1, P.stoneDark);
    pRect(ctx, 17, 10, 1, 1, P.stoneDark);
  });

  // 11. BAKERY FLOUR BARREL & BREAD CRATE PROP (22x26 = 11x13 @ 2x)
  makeCanvas(scene, 'bread-barrel', 22, 26, (ctx) => {
    pRect(ctx, 1, 10, 9, 3, 'rgba(20, 48, 30, 0.3)');
    pRect(ctx, 1, 2, 9, 10, P.outline);
    pRect(ctx, 2, 3, 7, 8, P.woodBase);
    pRect(ctx, 3, 3, 2, 8, P.woodHi);
    pRect(ctx, 7, 3, 2, 8, P.woodDark);
    // Iron barrel hoops
    pRect(ctx, 2, 5, 7, 1, P.stoneDark);
    pRect(ctx, 2, 9, 7, 1, P.stoneDark);
    // Top flour rim
    pRect(ctx, 2, 2, 7, 2, P.creamBase);
    pRect(ctx, 3, 2, 4, 1, P.white);
  });

  // 12. BOB'S COTTAGE (HOME) — Littleroot-inspired 2-tone terracotta shingle house (148x124 = 74x62 @ 2x)
  makeCanvas(scene, 'bobs-cottage', 148, 124, (ctx) => {
    // Ground drop shadow
    pRect(ctx, 5, 57, 64, 5, 'rgba(20, 48, 30, 0.32)');

    // Stone chimney (right rear roof)
    pRect(ctx, 51, 3, 10, 20, P.outline);
    pRect(ctx, 52, 4, 8, 18, P.stoneBase);
    pRect(ctx, 52, 4, 3, 18, P.stoneHi);
    pRect(ctx, 58, 4, 2, 18, P.stoneDark);
    // Chimney cap & brick mortar lines
    pRect(ctx, 50, 2, 12, 4, P.outline);
    pRect(ctx, 51, 3, 10, 2, P.stoneHi);
    pRect(ctx, 52, 8, 8, 1, P.stoneDark);
    pRect(ctx, 52, 12, 8, 1, P.stoneDark);
    pRect(ctx, 55, 6, 1, 2, P.stoneDark);
    pRect(ctx, 54, 9, 1, 3, P.stoneDark);

    // Pitched 2-tone terracotta shingle roof (trapezoid with crisp pixel outline)
    for (let ry = 0; ry < 22; ry++) {
      const inset = Math.max(0, 11 - Math.floor(ry * 0.55));
      const xStart = 3 + inset;
      const width = 68 - inset * 2;
      const y = 7 + ry;
      pRect(ctx, xStart - 1, y, width + 2, 1, P.outline);
      if (ry === 0) {
        pRect(ctx, xStart, y, width, 1, P.outline);
      } else if (ry === 1) {
        pRect(ctx, xStart, y, width, 1, P.roofRedHi);
      } else if (ry === 21) {
        pRect(ctx, xStart, y, width, 1, P.roofRedDeep);
      } else {
        // Horizontal shingle courses
        const isCourseEdge = ry % 4 === 0;
        const baseColor = isCourseEdge ? P.roofRedShade : ry < 8 ? P.roofRedHi : P.roofRedBase;
        pRect(ctx, xStart, y, width, 1, baseColor);
        // Individual shingle vertical ticks
        const offset = Math.floor(ry / 4) % 2 === 0 ? 0 : 2;
        for (let sx = xStart + 2 + offset; sx < xStart + width - 2; sx += 4) {
          pRect(ctx, sx, y, 1, 1, isCourseEdge ? P.roofRedDeep : P.roofRedShade);
        }
      }
    }
    // Roof ridge beam & sunlit eaves highlight
    pRect(ctx, 14, 7, 46, 2, P.outline);
    pRect(ctx, 15, 8, 44, 1, P.goldTrim);
    // Roof overhang bottom outline & trim
    pRect(ctx, 2, 29, 70, 2, P.outline);
    pRect(ctx, 3, 29, 68, 1, P.creamShade);

    // Timber & Cream Cottage Walls
    pRect(ctx, 7, 31, 60, 27, P.outline);
    pRect(ctx, 8, 31, 58, 25, P.creamBase);
    // Under-eave cast shadow on wall
    pRect(ctx, 8, 31, 58, 2, P.creamShade);
    pRect(ctx, 8, 33, 58, 1, '#e6d8bc');

    // Decorative Hoenn timber frame beams (left, right, center-trim)
    pRect(ctx, 8, 31, 3, 22, P.woodBase);
    pRect(ctx, 8, 31, 1, 22, P.woodHi);
    pRect(ctx, 10, 31, 1, 22, P.woodDark);
    pRect(ctx, 63, 31, 3, 22, P.woodBase);
    pRect(ctx, 63, 31, 1, 22, P.woodHi);
    pRect(ctx, 65, 31, 1, 22, P.woodDark);

    // Stone masonry base foundation
    pRect(ctx, 7, 52, 60, 6, P.outline);
    pRect(ctx, 8, 53, 58, 4, P.stoneBase);
    pRect(ctx, 8, 53, 58, 1, P.stoneHi);
    for (let sx = 12; sx < 64; sx += 6) {
      pRect(ctx, sx, 53, 1, 4, P.stoneDark);
    }
    pRect(ctx, 8, 55, 58, 1, P.stoneDark);

    // Front Door (centered at x=37)
    pRect(ctx, 30, 38, 14, 19, P.outline);
    pRect(ctx, 31, 39, 12, 17, P.woodBase);
    pRect(ctx, 32, 40, 4, 7, P.woodHi);
    pRect(ctx, 38, 40, 4, 7, P.woodHi);
    pRect(ctx, 32, 48, 4, 6, P.woodDark);
    pRect(ctx, 38, 48, 4, 6, P.woodDark);
    // Brass doorknob
    pRect(ctx, 40, 47, 2, 2, P.goldTrim);
    // Tiny porch pediment over door
    pRect(ctx, 28, 36, 18, 2, P.outline);
    pRect(ctx, 29, 37, 16, 1, P.roofRedBase);

    // Front Door Mat (bottom center)
    pRect(ctx, 31, 57, 12, 4, P.outline);
    pRect(ctx, 32, 58, 10, 2, P.breadBase);
    pRect(ctx, 33, 58, 8, 1, P.breadHi);

    // Left & Right Framed Shuttered Windows with Flower Boxes
    const drawCottageWindow = (wx: number) => {
      // Shutters
      pRect(ctx, wx - 3, 37, 3, 11, P.outline);
      pRect(ctx, wx - 2, 38, 2, 9, P.roofRedBase);
      pRect(ctx, wx + 12, 37, 3, 11, P.outline);
      pRect(ctx, wx + 12, 38, 2, 9, P.roofRedBase);
      // Window frame
      pRect(ctx, wx, 37, 12, 11, P.outline);
      pRect(ctx, wx + 1, 38, 10, 9, P.glassBase);
      // Diagonal glass shine
      pRect(ctx, wx + 2, 39, 3, 2, P.glassHi);
      pRect(ctx, wx + 2, 41, 2, 1, P.glassHi);
      pRect(ctx, wx + 8, 44, 2, 2, P.glassDark);
      // Window cross mullions
      pRect(ctx, wx + 5, 38, 2, 9, P.creamHi);
      pRect(ctx, wx + 1, 42, 10, 1, P.creamHi);
      // Flower box beneath window
      pRect(ctx, wx - 1, 48, 14, 3, P.outline);
      pRect(ctx, wx, 49, 12, 1, P.woodBase);
      // Tiny pixels of red & yellow blooms in box
      pRect(ctx, wx + 1, 47, 2, 2, P.grassDark);
      pRect(ctx, wx + 4, 47, 2, 2, P.grassDark);
      pRect(ctx, wx + 8, 47, 3, 2, P.grassDark);
      pRect(ctx, wx + 1, 47, 1, 1, P.flowerRed);
      pRect(ctx, wx + 5, 47, 1, 1, P.flowerYellow);
      pRect(ctx, wx + 9, 47, 1, 1, P.flowerRed);
    };

    drawCottageWindow(14);
    drawCottageWindow(48);
  });

  // 13. BOB'S BAKERY (BAKERY) — Hoenn Poké Mart / village shop style (160x128 = 80x64 @ 2x)
  makeCanvas(scene, 'bobs-bakery', 160, 128, (ctx) => {
    // Ground shadow
    pRect(ctx, 4, 59, 72, 5, 'rgba(20, 48, 30, 0.34)');

    // Brick Oven Chimney (far right, tall and hearty)
    pRect(ctx, 60, 2, 11, 23, P.outline);
    pRect(ctx, 61, 3, 9, 21, P.brickBase);
    pRect(ctx, 61, 3, 3, 21, P.brickHi);
    pRect(ctx, 68, 3, 2, 21, P.brickDark);
    // Chimney brick rows & cap
    pRect(ctx, 59, 1, 13, 4, P.outline);
    pRect(ctx, 60, 2, 11, 2, P.brickHi);
    for (let by = 7; by < 22; by += 3) {
      pRect(ctx, 61, by, 9, 1, P.brickDark);
    }

    // Pitched Hoenn Slate-Teal Shingle Roof
    for (let ry = 0; ry < 22; ry++) {
      const inset = Math.max(0, 10 - Math.floor(ry * 0.5));
      const xStart = 3 + inset;
      const width = 74 - inset * 2;
      const y = 7 + ry;
      pRect(ctx, xStart - 1, y, width + 2, 1, P.outline);
      if (ry === 0) {
        pRect(ctx, xStart, y, width, 1, P.outline);
      } else if (ry === 1) {
        pRect(ctx, xStart, y, width, 1, P.roofTealHi);
      } else if (ry === 21) {
        pRect(ctx, xStart, y, width, 1, P.roofTealDeep);
      } else {
        const isCourse = ry % 4 === 0;
        pRect(ctx, xStart, y, width, 1, isCourse ? P.roofTealShade : ry < 7 ? P.roofTealHi : P.roofTealBase);
        const offset = Math.floor(ry / 4) % 2 === 0 ? 0 : 2;
        for (let sx = xStart + 2 + offset; sx < xStart + width - 2; sx += 4) {
          pRect(ctx, sx, y, 1, 1, isCourse ? P.roofTealDeep : P.roofTealShade);
        }
      }
    }

    // Center Gable Peak with miniature golden bread emblem (classic Hoenn shop architecture!)
    for (let gy = 0; gy < 12; gy++) {
      const halfW = gy + 2;
      const gx = 40 - halfW;
      const y = 10 + gy;
      pRect(ctx, gx - 1, y, halfW * 2 + 2, 1, P.outline);
      pRect(ctx, gx, y, halfW * 2, 1, P.creamBase);
      pRect(ctx, gx, y, 1, 1, P.roofTealHi);
      pRect(ctx, gx + halfW * 2 - 1, y, 1, 1, P.roofTealHi);
    }
    pRect(ctx, 27, 22, 26, 2, P.outline);
    pRect(ctx, 28, 22, 24, 1, P.goldTrim);
    // Tiny golden loaf badge in the gable peak
    pRect(ctx, 36, 16, 8, 5, P.outline);
    pRect(ctx, 37, 17, 6, 3, P.breadBase);
    pRect(ctx, 38, 17, 4, 1, P.breadHi);
    pRect(ctx, 39, 18, 1, 1, P.breadDark);
    pRect(ctx, 41, 18, 1, 1, P.breadDark);

    // Roof eave trim
    pRect(ctx, 2, 29, 76, 2, P.outline);
    pRect(ctx, 3, 29, 74, 1, P.creamHi);

    // Cream Bakery Storefront Walls
    pRect(ctx, 6, 31, 68, 29, P.outline);
    pRect(ctx, 7, 31, 66, 27, P.creamBase);
    // Corner wood pilasters
    pRect(ctx, 7, 31, 3, 23, P.woodBase);
    pRect(ctx, 7, 31, 1, 23, P.woodHi);
    pRect(ctx, 70, 31, 3, 23, P.woodBase);
    pRect(ctx, 72, 31, 1, 23, P.woodDark);

    // Stone shop foundation
    pRect(ctx, 6, 54, 68, 6, P.outline);
    pRect(ctx, 7, 55, 66, 4, P.stoneBase);
    pRect(ctx, 7, 55, 66, 1, P.stoneHi);
    for (let sx = 11; sx < 71; sx += 6) {
      pRect(ctx, sx, 55, 1, 4, P.stoneDark);
    }

    // Crisp Red & Cream Striped Scalloped Shop Awning across storefront
    pRect(ctx, 5, 29, 70, 9, P.outline);
    for (let i = 0; i < 11; i++) {
      const ax = 6 + i * 6;
      const aw = i === 10 ? 8 : 6;
      const isRed = i % 2 === 0;
      pRect(ctx, ax, 30, aw, 5, isRed ? P.awningRed : P.awningCream);
      pRect(ctx, ax, 35, aw, 2, isRed ? P.awningRedDark : P.awningCreamDark);
      // Scalloped bottom notch
      pRect(ctx, ax + 1, 37, aw - 2, 1, isRed ? P.awningRedDark : P.awningCreamDark);
    }
    // Cast shadow beneath awning
    pRect(ctx, 7, 38, 66, 2, P.creamShade);

    // Hanging Pixel Croissant / Loaf Bracket Sign (left side of storefront)
    pRect(ctx, 10, 40, 15, 2, P.outline); // iron bracket bar
    pRect(ctx, 12, 42, 1, 2, P.outline);
    pRect(ctx, 21, 42, 1, 2, P.outline);
    pRect(ctx, 10, 43, 14, 10, P.outline);
    pRect(ctx, 11, 44, 12, 8, P.woodBase);
    pRect(ctx, 12, 45, 10, 6, P.creamHi);
    // Crisp golden pixel croissant / loaf inside sign
    pRect(ctx, 14, 46, 6, 4, P.breadDark);
    pRect(ctx, 14, 46, 6, 3, P.breadBase);
    pRect(ctx, 15, 46, 4, 1, P.breadHi);
    pRect(ctx, 13, 48, 2, 2, P.breadBase);
    pRect(ctx, 19, 48, 2, 2, P.breadBase);

    // Bakery Shop Front Door (center-left at x=30..44)
    pRect(ctx, 29, 40, 14, 19, P.outline);
    pRect(ctx, 30, 41, 12, 17, P.woodBase);
    // Door top glass pane
    pRect(ctx, 32, 42, 8, 6, P.outline);
    pRect(ctx, 33, 43, 6, 4, P.glassBase);
    pRect(ctx, 34, 43, 2, 2, P.glassHi);
    // Lower door panel + brass handle
    pRect(ctx, 32, 50, 8, 6, P.woodDark);
    pRect(ctx, 33, 51, 6, 4, P.woodHi);
    pRect(ctx, 40, 49, 1, 2, P.goldTrim);
    // Bakery welcome mat
    pRect(ctx, 30, 59, 12, 4, P.outline);
    pRect(ctx, 31, 60, 10, 2, P.roofTealBase);
    pRect(ctx, 32, 60, 8, 1, P.roofTealHi);

    // Wide Bakery Display Window stocked with Golden Loaves (right side x=46..68)
    pRect(ctx, 46, 40, 22, 14, P.outline);
    pRect(ctx, 47, 41, 20, 12, P.glassBase);
    // Warm wooden interior shelf
    pRect(ctx, 47, 49, 20, 4, P.woodDark);
    pRect(ctx, 47, 49, 20, 1, P.woodHi);
    // Glass diagonal sheen
    pRect(ctx, 48, 42, 4, 2, P.glassHi);
    pRect(ctx, 48, 44, 2, 2, P.glassHi);
    pRect(ctx, 62, 42, 3, 2, P.glassHi);
    // Three golden pixel bread loaves & buns on display!
    const drawMiniLoaf = (lx: number, ly: number) => {
      pRect(ctx, lx, ly, 5, 4, P.outlineWarm);
      pRect(ctx, lx + 1, ly + 1, 3, 2, P.breadBase);
      pRect(ctx, lx + 1, ly + 1, 2, 1, P.breadHi);
    };
    drawMiniLoaf(48, 46);
    drawMiniLoaf(54, 46);
    drawMiniLoaf(60, 46);
    // Top shelf croissants/buns
    pRect(ctx, 51, 44, 3, 2, P.breadBase);
    pRect(ctx, 52, 44, 1, 1, P.breadHi);
    pRect(ctx, 58, 44, 3, 2, P.breadBase);
    pRect(ctx, 59, 44, 1, 1, P.breadHi);
    // Window sill
    pRect(ctx, 45, 53, 24, 2, P.outline);
    pRect(ctx, 46, 54, 22, 1, P.creamHi);
  });

  // 14. CLOUDS, SMOKE, BUTTERFLIES, FIREFLIES, AND PARTICLES
  makeCanvas(scene, 'cloud-lg', 68, 24, (ctx) => {
    pRect(ctx, 8, 4, 12, 6, P.white);
    pRect(ctx, 16, 2, 10, 8, P.white);
    pRect(ctx, 3, 6, 28, 4, P.white);
    pRect(ctx, 5, 9, 24, 2, '#d8ecfc');
  });

  makeCanvas(scene, 'cloud-sm', 44, 18, (ctx) => {
    pRect(ctx, 5, 2, 10, 5, P.white);
    pRect(ctx, 2, 4, 17, 3, P.white);
    pRect(ctx, 4, 7, 13, 1, '#d8ecfc');
  });

  makeCanvas(scene, 'smoke-puff', 16, 16, (ctx) => {
    const m = [
      '..oooo..',
      '.oWWWWo.',
      'oWWWWSSo',
      'oWWWSSSo',
      'oWWSSSSo',
      '.oSSSSo.',
      '..oooo..',
      '........',
    ];
    drawMatrix(ctx, m, {
      o: '#88949c',
      W: '#f8f8f4',
      S: '#d8e0e4',
    });
  });

  const makeButterflyPair = (key: string, wing: string, accent: string) => {
    const f0 = [
      'W....W',
      'WWooWW',
      'WAooAW',
      '.W..W.',
      '......',
    ];
    const f1 = [
      '......',
      '.WooW.',
      '.AooA.',
      '..oo..',
      '......',
    ];
    const pal: PaletteMap = { W: wing, A: accent, o: P.outline };
    makeCanvas(scene, `${key}-0`, 12, 10, (ctx) => drawMatrix(ctx, f0, pal));
    makeCanvas(scene, `${key}-1`, 12, 10, (ctx) => drawMatrix(ctx, f1, pal));
  };
  makeButterflyPair('butterfly-yellow', '#ffe048', '#f09020');
  makeButterflyPair('butterfly-cyan', '#78e8ff', '#3898e8');
  makeButterflyPair('butterfly-orange', '#ff9848', '#e04838');

  makeCanvas(scene, 'firefly', 10, 10, (ctx) => {
    pRect(ctx, 1, 1, 3, 3, 'rgba(216, 255, 112, 0.35)');
    pRect(ctx, 2, 0, 1, 5, 'rgba(216, 255, 112, 0.25)');
    pRect(ctx, 0, 2, 5, 1, 'rgba(216, 255, 112, 0.25)');
    pRect(ctx, 2, 2, 1, 1, '#ffffc0');
  });

  makeCanvas(scene, 'particle-zzz', 12, 12, (ctx) => {
    const m = [
      'oooooo',
      'oBBBB.',
      '..oBo.',
      '.oBo..',
      'oBBBB.',
      'oooooo',
    ];
    drawMatrix(ctx, m, { o: P.outline, B: '#98e0ff' });
  });

  makeCanvas(scene, 'particle-sparkle', 10, 10, (ctx) => {
    const m = [
      '..Y..',
      '..W..',
      'YWYMY',
      '..W..',
      '..Y..',
    ];
    drawMatrix(ctx, m, { Y: '#ffd848', W: '#ffffff', M: '#ffaa28' });
  });

  makeCanvas(scene, 'particle-flour', 8, 8, (ctx) => {
    pRect(ctx, 1, 0, 2, 4, '#fffdf4');
    pRect(ctx, 0, 1, 4, 2, '#fffdf4');
    pRect(ctx, 1, 1, 2, 2, '#ffffff');
  });

  makeCanvas(scene, 'particle-note', 12, 12, (ctx) => {
    const m = [
      '..oooo',
      '..oPPo',
      '..oPo.',
      'oooPo.',
      'oPPPo.',
      '.ooo..',
    ];
    drawMatrix(ctx, m, { o: P.outline, P: P.heartPink });
  });

  makeCanvas(scene, 'particle-droplet', 10, 12, (ctx) => {
    const m = [
      '..o..',
      '.oHo.',
      'oHWWo',
      'oWWDo',
      'oWWDo',
      '.ooo.',
    ];
    drawMatrix(ctx, m, {
      o: P.outlineSoft,
      H: P.waterHighlight,
      W: P.waterShallow,
      D: P.waterMid,
    });
  });

  makeCanvas(scene, 'particle-leaf', 10, 10, (ctx) => {
    const m = [
      '..ooo',
      '.oLGo',
      'oLGDo',
      'oGDo.',
      '.oo..',
    ];
    drawMatrix(ctx, m, {
      o: P.outlineSoft,
      L: P.grassLight,
      G: P.grassBase,
      D: P.grassDark,
    });
  });

  makeCanvas(scene, 'particle-crumb', 8, 8, (ctx) => {
    pRect(ctx, 1, 1, 2, 2, P.breadBase);
    pRect(ctx, 1, 1, 1, 1, P.breadHi);
    pRect(ctx, 2, 2, 1, 1, P.breadDark);
  });

  makeCanvas(scene, 'particle-heart', 12, 10, (ctx) => {
    const m = [
      '.oo.oo',
      'oHPooP',
      'oPPPPo',
      '.oPPo.',
      '..oo..',
    ];
    drawMatrix(ctx, m, { o: P.outlineWarm, P: P.heartPink, H: P.heartHi });
  });

  // 15. BOB THE BAKER — GBA GEN 3 OVERWORLD SPRITES (32x44 = 16x22 pixel matrix @ 2x)
  const bobPal: PaletteMap = {
    o: P.outline,
    W: P.white,
    w: P.whiteShade,
    g: P.whiteDeep,
    H: P.hairBase,
    h: P.hairDark,
    S: P.skinHi,
    s: P.skinBase,
    d: P.skinShade,
    c: P.cheek,
    E: P.outline,
    B: P.tunicBase,
    b: P.tunicHi,
    n: P.tunicDark,
    K: P.bootBase,
    k: P.bootDark,
    L: P.breadBase,
    l: P.breadHi,
    r: P.breadDark,
    R: P.flowerRed,
    G: P.grassBase,
    j: P.grassLight,
    f: P.grassDark,
    C: P.waterShallow,
    a: P.waterHighlight,
    u: P.waterDeep,
    T: P.woodBase,
    t: P.woodHi,
    m: P.woodDark,
    p: P.creamBase,
  };

  const makeBob = (key: string, rows: readonly string[]) => {
    makeCanvas(scene, key, 32, 44, (ctx) => drawMatrix(ctx, rows, bobPal));
  };

  // Bob Idle 0 (facing forward, warm smile, crisp baker's toque & apron)
  makeBob('bob-idle-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHSsESSEssHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.oSBBWWWWWWBBSo.',
    '.osBnnWWWWnnBso.',
    '..ooBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
  ]);

  // Bob Idle 1 (gentle breathing settle)
  makeBob('bob-idle-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHSsESSEssHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.osBnnWWWWnnBso.',
    '..ooBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
  ]);

  // Bob Walk Side (facing right — flipped via setFlipX(true) when walking left)
  makeBob('bob-walk-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHHhSSSSSSho..',
    '..oHHSSSSEsSHo..',
    '..oHHsSSSEssHo..',
    '..oHHssSScSsHo..',
    '...oooSsssSoo...',
    '...oBBooWWooBo..',
    '..oBBBbWWWWBBo..',
    '.oSBBBnWWWWBBSo.',
    '.osooBnWWWWBoso.',
    '.....oWWWWBo....',
    '....oBnWWnnBo...',
    '...oKKo..ooKKo..',
    '..okko....okko..',
    '..oooo....oooo..',
    '................',
  ]);

  makeBob('bob-walk-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHHhSSSSSSho..',
    '..oHHSSSSEsSHo..',
    '..oHHsSSSEssHo..',
    '..oHHssSScSsHo..',
    '...oooSsssSoo...',
    '...oBBooWWooBo..',
    '...oBBbWWWWBBo..',
    '...oBBnWWWWBBo..',
    '...oSsnWWWWBBo..',
    '...oooWWWWnBo...',
    '....oBnnWWnBo...',
    '....oKKooKKo....',
    '....okko.kko....',
    '....oooo.ooo....',
  ]);

  makeBob('bob-walk-2', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHHhSSSSSSho..',
    '..oHHSSSSEsSHo..',
    '..oHHsSSSEssHo..',
    '..oHHssSScSsHo..',
    '...oooSsssSoo...',
    '...oBBooWWooBo..',
    '...oBBbWWWWBBSo.',
    '...oBBnWWWWBBso.',
    '...oBBnWWWWBBo..',
    '....ooWWWWnBo...',
    '....oBnnWWnBo...',
    '....oKKo..oKKo..',
    '...okko....okko.',
    '...oooo....oooo.',
    '................',
  ]);

  // Bob Walk Front/Down (for vertical movement on cottage/bakery spurs)
  makeBob('bob-walk-down-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHSsESSEssHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBo..',
    '.osBBWWWWWWBBSo.',
    '..ooBnWWWWnBoso.',
    '...oBnWWWWnBo...',
    '...oKKoWWnnBo...',
    '...okko..oKKo...',
    '...oooo..okko...',
    '.........oooo...',
    '................',
  ]);

  makeBob('bob-walk-down-1', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHSsESSEssHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '..oBBbWWWWbBBSo.',
    '.oSBBWWWWWWBBso.',
    '.osoBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWoKKo...',
    '...oKKo..okko...',
    '...okko..oooo...',
    '...oooo.........',
    '................',
  ]);

  // Bob Walk Back/Up (for walking north toward cottage, bakery, or signpost)
  makeBob('bob-walk-up-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHHhHHHHhHHo..',
    '..oHHHHHHHHHHo..',
    '..oHhHHHHHHhHo..',
    '..oHHHHHHHHHHo..',
    '...ooHHHHHHoo...',
    '..oBBBBBBBBBBoo.',
    '.oSBBbBBBBbBBBo.',
    '.osBBbBBBBbBBSo.',
    '..ooBnBBBBnBoso.',
    '...oBnWWWWnBo...',
    '...oKKoBBnnBo...',
    '...okko..oKKo...',
    '...oooo..okko...',
    '.........oooo...',
    '................',
  ]);

  makeBob('bob-walk-up-1', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHHhHHHHhHHo..',
    '..oHHHHHHHHHHo..',
    '..oHhHHHHHHhHo..',
    '..oHHHHHHHHHHo..',
    '...ooHHHHHHoo...',
    '.ooBBBBBBBBBBo..',
    '.oBBBbBBBBbBBSo.',
    '.oSBBbBBBBbBBso.',
    '.osoBnBBBBnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnBBoKKo...',
    '...oKKo..okko...',
    '...okko..oooo...',
    '...oooo.........',
    '................',
  ]);

  // Bob Gardening 0 & 1 (happy smile tending flowers with a sprouting watering can)
  makeBob('bob-garden-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBoo.',
    '.oSBBbWWWWbBBojo',
    '.osBBWWWWWWBSoGo',
    '..ooBnWWWWooCCfo',
    '...oBnWWWWoCCCo.',
    '...oBnnWWnnooo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
  ]);

  makeBob('bob-garden-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSsESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.osBBWWWWWWBojGo',
    '..ooBnWWWWooCCfo',
    '...oBnWWWWoCCCo.',
    '...oBnnWWnnooo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Fetching Water 0 & 1 (holding a wooden pond bucket brimming with Hoenn blue water)
  makeBob('bob-water-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.osBoaaaaaaCoBso',
    '..oooTCCCCmTooo.',
    '...oBoTTTTmoBo..',
    '...oBnooooonBo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
  ]);

  makeBob('bob-water-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSsESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.osBoCCaaaaCoBso',
    '..oooTCCCCmTooo.',
    '...oBoTTTTmoBo..',
    '...oBnooooonBo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Restocking 0 & 1 (carrying a wooden supply crate & flour sack!)
  makeBob('bob-restock-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oooWWWWWWooo..',
    '.oSBoppppppoBSo.',
    '.osBotTTTTmoBso.',
    '..oooTttttTooo..',
    '...oBotTTmmoBo..',
    '...oBnooooonBo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
  ]);

  makeBob('bob-restock-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSsESSEsSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oooWWWWWWooo..',
    '.oSBoppppppoBSo.',
    '.osBotTTTTmoBso.',
    '..oooTttttTooo..',
    '...oBotTTmmoBo..',
    '...oBnooooonBo..',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Baking 0 & 1 (beaming smile holding a warm golden bread loaf!)
  makeBob('bob-bake-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSESSEsSHo..',
    '..oHScSSSScSHo..',
    '...ooSssssSoo...',
    '..ooooWWWWoooo..',
    '.oSBolllllLoBSo.',
    '.osBoLLLLLroBso.',
    '..oooorrrroooo..',
    '...oBnWWWWnBo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  makeBob('bob-bake-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSsESSEsSHo..',
    '..oHScSSSScSHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBolllllLoBSo.',
    '.osBoLLLLLroBso.',
    '..oooorrrroooo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Eating 0 & 1 (happy closed-arc eyes, nibbling a warm bun)
  makeBob('bob-eat-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSEsSSsESHo..',
    '..oHscSrrScsHo..',
    '...ooSllllSoo...',
    '..oBBoSLLSoBBo..',
    '.oSBBooSsooBBSo.',
    '.osBBWWWWWWBBso.',
    '..ooBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
  ]);

  makeBob('bob-eat-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSEEssEESHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBoSllSoBBo..',
    '.oSBBooLLooBBSo.',
    '.osBBWWWWWWBBso.',
    '..ooBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Sleeping 0 & 1 (peacefully drowsing with closed eyes)
  makeBob('bob-sleep-0', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSSSSSSSSHo..',
    '..oHSEESSEESHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '..oBBbWWWWbBBo..',
    '..oSsnWWWWnsSo..',
    '...ooWWWWWWoo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
  ]);

  makeBob('bob-sleep-1', [
    '................',
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSEESSEESHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '..oBBbWWWWbBBo..',
    '..oSsnWWWWnsSo..',
    '...ooWWWWWWoo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
  ]);

  // Bob Waking Up 0 & 1 (morning arms-up stretch!)
  makeBob('bob-wake-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '.oo.oHHHHHHo.oo.',
    'oSSoHSSSSSSHosSo',
    'oBBooSSESSEooBBo',
    '.oBBoSssssSoBBo.',
    '..oBBooWWooBBo..',
    '...oBbWWWWbBo...',
    '...oBnWWWWnBo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
    '................',
    '................',
  ]);

  // Bob Relaxing (happy `^ ^` eyes)
  makeBob('bob-relax-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '..oHSoSssSoSHo..',
    '..oHSoSssSoSHo..',
    '..oHscSSSScsHo..',
    '...ooSssssSoo...',
    '..oBBooWWooBBo..',
    '.oSBBbWWWWbBBSo.',
    '.osBnnWWWWnnBso.',
    '..ooBnWWWWnBoo..',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
  ]);

  // Bob Upset 0 & 1 (shocked eyes & panicked raised arms when bread is stolen!)
  makeBob('bob-upset-0', [
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '.ooHhSSSSSShHoo.',
    'oSSHSWESSWESHSSo',
    'oBBHSESSSESSHBBo',
    '.oBHScSRRScSHBo.',
    '..oBooSrrSooBo..',
    '...oBbWWWWbBo...',
    '...oBnWWWWnBo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '..oKKo....oKKo..',
    '..okko....okko..',
    '..oooo....oooo..',
    '................',
    '................',
    '................',
  ]);

  makeBob('bob-upset-1', [
    '................',
    '....oooooooo....',
    '...oWWWWWWWWo...',
    '..oWWWWWWWWWwo..',
    '..oWWwWWWWwWwo..',
    '..oWWWWWWWWWwo..',
    '...owggggggwo...',
    '...oHHHHHHHHo...',
    '..oHhSSSSSShHo..',
    '.oSHSWESSWESHSo.',
    '.oBHSESSSESSHBo.',
    '..oHScSRRScSHo..',
    '..oBooSrrSooBo..',
    '...oBbWWWWbBo...',
    '...oBnWWWWnBo...',
    '...oBnnWWnnBo...',
    '...oKKo..oKKo...',
    '...okko..okko...',
    '...oooo..oooo...',
    '................',
    '................',
    '................',
  ]);

  // 16. POKÉMON-STYLE PIXEL EMOTE BOXES (32x32 = 16x16 @ 2x)
  const drawEmoteFrame = (
    ctx: CanvasRenderingContext2D,
    borderInner: string,
    drawIcon: (c: CanvasRenderingContext2D) => void,
  ) => {
    // Classic compact GBA square-rounded pixel speech bubble
    pRect(ctx, 2, 1, 12, 1, P.outline);
    pRect(ctx, 1, 2, 14, 10, P.outline);
    pRect(ctx, 2, 12, 12, 1, P.outline);
    // Pointer tail
    pRect(ctx, 6, 13, 4, 1, P.outline);
    pRect(ctx, 7, 14, 2, 1, P.outline);
    // White interior + subtle GBA bevel
    pRect(ctx, 2, 2, 12, 10, P.white);
    pRect(ctx, 2, 11, 12, 1, borderInner);
    pRect(ctx, 13, 2, 1, 9, borderInner);
    pRect(ctx, 7, 12, 2, 2, P.white);

    drawIcon(ctx);
  };

  // Iconic Pokémon Emerald Red `!` Exclamation Emote Box
  makeCanvas(scene, 'emote-alert', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#f4c0b8', (c) => {
      // Crisp bold red `!`
      pRect(c, 6, 3, 4, 6, P.outline);
      pRect(c, 7, 4, 2, 4, P.flowerRed);
      pRect(c, 7, 4, 1, 2, '#ff8078');
      pRect(c, 6, 9, 4, 3, P.outline);
      pRect(c, 7, 10, 2, 1, P.flowerRed);
    });
  });

  // Sleep `Zz` Emote Box
  makeCanvas(scene, 'emote-sleep', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#c8d8e8', (c) => {
      // Big Z
      pRect(c, 4, 4, 4, 1, P.tunicBase);
      pRect(c, 6, 5, 1, 1, P.tunicBase);
      pRect(c, 5, 6, 1, 1, P.tunicBase);
      pRect(c, 4, 7, 4, 1, P.tunicBase);
      // Small z
      pRect(c, 9, 7, 3, 1, P.tunicHi);
      pRect(c, 10, 8, 1, 1, P.tunicHi);
      pRect(c, 9, 9, 3, 1, P.tunicHi);
    });
  });

  // Waking Up Golden Sun Emote Box
  makeCanvas(scene, 'emote-sun', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#e8dcb8', (c) => {
      pRect(c, 6, 5, 4, 4, P.flowerYellow);
      pRect(c, 7, 6, 2, 2, P.breadHi);
      pRect(c, 7, 3, 2, 1, P.breadBase);
      pRect(c, 7, 10, 2, 1, P.breadBase);
      pRect(c, 4, 6, 1, 2, P.breadBase);
      pRect(c, 11, 6, 1, 2, P.breadBase);
      pRect(c, 5, 4, 1, 1, P.flowerYellow);
      pRect(c, 10, 4, 1, 1, P.flowerYellow);
      pRect(c, 5, 9, 1, 1, P.flowerYellow);
      pRect(c, 10, 9, 1, 1, P.flowerYellow);
    });
  });

  // Baking Golden Bread Loaf Emote Box
  makeCanvas(scene, 'emote-bread', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#e8d8c0', (c) => {
      // Tiny steam wisps
      pRect(c, 5, 3, 1, 2, '#b0c4d0');
      pRect(c, 9, 3, 1, 2, '#b0c4d0');
      // Golden loaf
      pRect(c, 3, 6, 10, 5, P.outlineWarm);
      pRect(c, 4, 6, 8, 4, P.breadBase);
      pRect(c, 5, 6, 6, 1, P.breadHi);
      pRect(c, 6, 7, 1, 2, P.breadDark);
      pRect(c, 9, 7, 1, 2, P.breadDark);
    });
  });

  // Eating Happy Bun + Sparkle Emote Box
  makeCanvas(scene, 'emote-eat', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#e8d8c0', (c) => {
      pRect(c, 4, 6, 7, 4, P.outlineWarm);
      pRect(c, 5, 6, 5, 3, P.breadBase);
      pRect(c, 6, 6, 3, 1, P.breadHi);
      // Sparkle star top-right
      pRect(c, 11, 4, 1, 3, P.flowerYellow);
      pRect(c, 10, 5, 3, 1, P.flowerYellow);
      pRect(c, 11, 5, 1, 1, P.white);
    });
  });

  // Walking Musical Note / Stroll Emote Box
  makeCanvas(scene, 'emote-walk', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#c8e0d0', (c) => {
      pRect(c, 7, 4, 4, 1, P.grassDark);
      pRect(c, 7, 5, 1, 4, P.grassDark);
      pRect(c, 10, 5, 1, 3, P.grassDark);
      pRect(c, 5, 8, 3, 2, P.grassBase);
      pRect(c, 8, 7, 3, 2, P.grassBase);
    });
  });

  // Relaxing Pink Heart Emote Box
  makeCanvas(scene, 'emote-relax', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#f0d0d8', (c) => {
      const heart = [
        '.oo.oo.',
        'oHPooPo',
        'oPPPPPo',
        '.oPPPo.',
        '..oPo..',
        '...o...',
      ];
      drawMatrix(
        c,
        heart,
        { o: P.outlineWarm, P: P.heartPink, H: P.heartHi },
        PX,
        4,
        4,
      );
    });
  });

  // Gardening Sprout & Blossom Emote Box
  makeCanvas(scene, 'emote-garden', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#c4e0c4', (c) => {
      // Blossom petals
      pRect(c, 6, 3, 4, 4, P.outlineSoft);
      pRect(c, 7, 4, 2, 2, P.flowerRed);
      pRect(c, 7, 4, 1, 1, P.flowerYellow);
      // Green stem & twin leaves
      pRect(c, 7, 7, 2, 4, P.grassDark);
      pRect(c, 4, 7, 3, 2, P.grassBase);
      pRect(c, 5, 7, 2, 1, P.grassLight);
      pRect(c, 9, 8, 3, 2, P.grassBase);
      pRect(c, 9, 8, 2, 1, P.grassLight);
    });
  });

  // Fetching Water Shimmering Droplet Emote Box
  makeCanvas(scene, 'emote-water', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#c0dcf0', (c) => {
      // Crisp Hoenn water drop silhouette
      pRect(c, 7, 3, 2, 2, P.outlineSoft);
      pRect(c, 6, 4, 4, 2, P.outlineSoft);
      pRect(c, 5, 6, 6, 4, P.outlineSoft);
      pRect(c, 6, 10, 4, 1, P.outlineSoft);
      // Inner turquoise fill & bright shine
      pRect(c, 7, 4, 2, 2, P.waterShallow);
      pRect(c, 6, 6, 4, 4, P.waterMid);
      pRect(c, 6, 6, 2, 3, P.waterShallow);
      pRect(c, 6, 6, 1, 2, P.waterHighlight);
      pRect(c, 7, 5, 1, 1, P.white);
    });
  });

  // Restocking Flour Crate / Sack Emote Box
  makeCanvas(scene, 'emote-restock', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#e4d4bc', (c) => {
      // Wooden bakery crate with flour top
      pRect(c, 4, 4, 8, 7, P.outlineWarm);
      pRect(c, 5, 5, 6, 5, P.woodBase);
      pRect(c, 5, 5, 6, 1, P.woodHi);
      pRect(c, 5, 7, 6, 1, P.woodDark);
      // Cream flour rim peeking out top
      pRect(c, 5, 3, 6, 2, P.outlineWarm);
      pRect(c, 6, 4, 4, 1, P.creamHi);
      // Diagonal crate brace
      pRect(c, 6, 6, 1, 1, P.goldTrim);
      pRect(c, 7, 7, 1, 1, P.goldTrim);
      pRect(c, 8, 8, 1, 1, P.goldTrim);
    });
  });

  // Strolling Sunset Music Note & Heart Emote Box
  makeCanvas(scene, 'emote-stroll', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#f2d4c8', (c) => {
      // Crisp music note (left)
      pRect(c, 5, 4, 4, 1, P.roofTealShade);
      pRect(c, 5, 5, 1, 4, P.roofTealShade);
      pRect(c, 8, 5, 1, 3, P.roofTealShade);
      pRect(c, 3, 8, 3, 2, P.roofTealHi);
      pRect(c, 6, 7, 3, 2, P.roofTealHi);
      // Tiny sunset heart accent (top-right)
      pRect(c, 10, 4, 1, 1, P.heartPink);
      pRect(c, 12, 4, 1, 1, P.heartPink);
      pRect(c, 10, 5, 3, 1, P.heartPink);
      pRect(c, 11, 6, 1, 1, P.heartPink);
      pRect(c, 10, 4, 1, 1, P.heartHi);
    });
  });

  // Idle `...` Emote Box
  makeCanvas(scene, 'emote-idle', 32, 32, (ctx) => {
    drawEmoteFrame(ctx, '#d4dce0', (c) => {
      pRect(c, 4, 6, 2, 2, P.outlineSoft);
      pRect(c, 7, 6, 2, 2, P.outlineSoft);
      pRect(c, 10, 6, 2, 2, P.outlineSoft);
    });
  });
}
