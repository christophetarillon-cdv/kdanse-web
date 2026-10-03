'use client';

import { useState } from 'react';
import type { CMSBlock } from '@/types/cms';

interface BlockPropertiesToolbarProps {
  block: CMSBlock | null;
  onUpdate: (updates: Partial<CMSBlock>) => void;
}

export default function BlockPropertiesToolbar({ block, onUpdate }: BlockPropertiesToolbarProps) {
  const [bgColor, setBgColor] = useState(block?.backgroundColor || '#ffffff');
  const [bgOpacity, setBgOpacity] = useState(block?.backgroundOpacity ?? 1);

  const handleColorChange = (color: string) => {
    setBgColor(color);
    if (block) {
      onUpdate({ backgroundColor: color, backgroundOpacity: bgOpacity });
    }
  };

  const handleOpacityChange = (opacity: number) => {
    setBgOpacity(opacity);
    if (block) {
      onUpdate({ backgroundColor: bgColor, backgroundOpacity: opacity });
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-300 p-3 flex gap-4 items-center shadow-md">
      <span className="text-xs font-semibold text-gray-700">Propriétés du bloc:</span>

      <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600">Couleur fond:</span>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border"
          title="Couleur de fond du bloc"
        />

        <div className="border-l border-gray-300 h-6 mx-2" />

        <span className="text-xs font-semibold text-gray-600">Opacité:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={bgOpacity * 100}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
          className="w-24"
          title="Opacité du fond (0 = transparent, 100 = opaque)"
        />
        <span className="text-xs text-gray-600 w-8">{Math.round(bgOpacity * 100)}%</span>
      </div>
    </div>
  );
}
