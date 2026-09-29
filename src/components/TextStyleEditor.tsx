'use client';

import { useState } from 'react';
import type { TextStyle } from '@/types/cms';

interface TextStyleEditorProps {
  value: string;
  style?: TextStyle;
  onChange: (text: string) => void;
  onStyleChange: (style: TextStyle) => void;
}

export default function TextStyleEditor({
  value,
  style = {},
  onChange,
  onStyleChange,
}: TextStyleEditorProps) {
  const [showStylePanel, setShowStylePanel] = useState(false);

  const handleStyleChange = (key: keyof TextStyle, val: any) => {
    onStyleChange({
      ...style,
      [key]: val,
    });
  };

  const presetFonts = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36];

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border rounded px-3 py-2 min-h-24 font-mono text-sm"
          placeholder="Entrez votre texte..."
        />
      </div>

      <button
        type="button"
        onClick={() => setShowStylePanel(!showStylePanel)}
        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
      >
        {showStylePanel ? '✕ Fermer styles' : '✏️ Ajouter des styles'}
      </button>

      {showStylePanel && (
        <div className="bg-gray-50 border rounded p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Couleur */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Couleur
              </label>
              <input
                type="color"
                value={style.color || '#000000'}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-8 rounded cursor-pointer border"
              />
            </div>

            {/* Taille police */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Taille ({style.fontSize || 16}px)
              </label>
              <select
                value={style.fontSize || 16}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-xs w-full"
              >
                {fontSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>

            {/* Police */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Police
              </label>
              <select
                value={style.fontFamily || 'Arial'}
                onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                className="border rounded px-2 py-1 text-xs w-full"
              >
                {presetFonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Poids police */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Poids
              </label>
              <select
                value={style.fontWeight || 'normal'}
                onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                className="border rounded px-2 py-1 text-xs w-full"
              >
                <option value="normal">Normal</option>
                <option value="500">Semi-bold</option>
                <option value="600">Bold</option>
                <option value="700">Extra bold</option>
              </select>
            </div>

            {/* Alignement */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Alignement
              </label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => handleStyleChange('textAlign', align)}
                    className={`flex-1 px-2 py-1 text-xs rounded border ${
                      style.textAlign === align
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {align === 'left' ? '⬅️' : align === 'center' ? '⬆️' : '➡️'}
                  </button>
                ))}
              </div>
            </div>

            {/* Hauteur ligne */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Hauteur ligne ({style.lineHeight || 1.5})
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={style.lineHeight || 1.5}
                onChange={(e) => handleStyleChange('lineHeight', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-white border rounded p-3 mt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Aperçu:</p>
            <div
              style={{
                color: style.color || '#000000',
                fontSize: `${style.fontSize || 16}px`,
                fontFamily: style.fontFamily || 'Arial',
                fontWeight: style.fontWeight || 'normal',
                textAlign: style.textAlign || 'left',
                lineHeight: style.lineHeight || 1.5,
              }}
            >
              {value || 'Votre texte apparaîtra ici...'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowStylePanel(false)}
            className="w-full mt-2 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm font-semibold"
          >
            ✓ Appliquer le style
          </button>
        </div>
      )}
    </div>
  );
}
