'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { VillageScene, type VillageSceneState } from '@/game/VillageScene';

interface VillageCanvasProps {
  sceneState: VillageSceneState;
  statusBadge?: string;
}

export default function VillageCanvas({ sceneState, statusBadge }: VillageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<VillageScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new VillageScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 768,
      height: 432,
      pixelArt: true,
      antialias: false,
      backgroundColor: '#1b3b36',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [scene],
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateVillagerState(sceneState);
  }, [sceneState]);

  return (
    <div className="gba-bezel relative w-full p-1.5 sm:p-2">
      {/* Inner recessed GBA screen frame */}
      <div className="pixel-canvas relative w-full overflow-hidden border-2 border-[#121c1a] bg-[#1b3b36]">
        <div ref={containerRef} className="aspect-[16/9] w-full" />

        {/* Pokémon Emerald top-left area-name ribbon banner */}
        {statusBadge && (
          <div className="gba-area-ribbon pointer-events-none absolute left-0 top-3 z-10 flex items-center gap-2 py-1.5 pl-3 pr-4">
            <span className="inline-block h-2 w-2 shrink-0 border border-[#1e2826] bg-[#f8d038]" />
            <span className="font-pixel-display text-[9px] uppercase tracking-wider sm:text-[10px]">
              {statusBadge}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
