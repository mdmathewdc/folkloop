'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { VillageScene, type VillageSceneState } from '@/game/VillageScene';

interface VillageCanvasProps {
  sceneState: VillageSceneState;
}

export default function VillageCanvas({ sceneState }: VillageCanvasProps) {
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
      backgroundColor: '#a8d5e5',
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
    <div className="pixel-canvas relative w-full overflow-hidden rounded-2xl border-4 border-wood bg-[#a8d5e5] shadow-cozy">
      <div ref={containerRef} className="aspect-[16/9] w-full" />
    </div>
  );
}
