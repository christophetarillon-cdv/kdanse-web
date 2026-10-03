'use client';

import { useState } from 'react';

export default function CMSEditorToolbar() {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(1);
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const applyBackgroundColor = (color: string, opacity: number = 1) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.toString().length > 0) {
      const rgbColor = hexToRgb(color);
      const rgbaColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
      const html = `<span style="background-color: ${rgbaColor};">${selection.toString()}</span>`;
      document.execCommand('insertHTML', false, html);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const insertLink = () => {
    if (linkUrl.trim() && savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        const text = selection.toString();
        if (text.length > 0) {
          const html = `<a href="${linkUrl}" target="_blank" style="color: #0066cc; text-decoration: underline; cursor: pointer;">${text}</a>`;
          document.execCommand('insertHTML', false, html);
        }
      }
      setSavedSelection(null);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const insertHtml = (html: string) => {
    document.execCommand('insertHTML', false, html);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-300 p-3 flex gap-2 flex-wrap items-center shadow-md max-h-32 overflow-y-auto">

      {/* Texte styles */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 px-1">Texte</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
          className="px-3 py-1 text-xs font-bold bg-gray-100 hover:bg-blue-200 rounded"
          title="Gras (Ctrl+B)"
        >
          G
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
          className="px-3 py-1 text-xs italic bg-gray-100 hover:bg-blue-200 rounded"
          title="Italique (Ctrl+I)"
        >
          I
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
          className="px-3 py-1 text-xs underline bg-gray-100 hover:bg-blue-200 rounded"
          title="Souligné (Ctrl+U)"
        >
          U
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('strikethrough'); }}
          className="px-3 py-1 text-xs line-through bg-gray-100 hover:bg-blue-200 rounded"
          title="Barré"
        >
          S
        </button>
      </div>

      {/* Couleurs */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 px-1">Couleur</span>
        <input
          type="color"
          onChange={(e) => applyFormat('foreColor', e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border"
          title="Couleur du texte"
          defaultValue="#000000"
        />
        <input
          type="color"
          onChange={(e) => applyBackgroundColor(e.target.value, bgOpacity)}
          className="w-8 h-8 cursor-pointer rounded border"
          title="Couleur de fond"
          defaultValue="#ffff00"
        />
        <input
          type="range"
          min="0"
          max="100"
          value={bgOpacity * 100}
          onChange={(e) => setBgOpacity(parseInt(e.target.value) / 100)}
          className="w-20"
          title="Opacité du fond (0 = transparent, 100 = opaque)"
        />
        <span className="text-xs text-gray-600">{Math.round(bgOpacity * 100)}%</span>
      </div>

      {/* Taille et police */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <select
          onChange={(e) => applyFormat('fontSize', e.target.value)}
          defaultValue="3"
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-100 rounded border"
          title="Taille du texte"
        >
          <option value="1">Très petit</option>
          <option value="2">Petit</option>
          <option value="3">Normal</option>
          <option value="4">Grand</option>
          <option value="5">Très grand</option>
          <option value="6">Énorme</option>
          <option value="7">Géant</option>
        </select>
      </div>

      {/* Alignement */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 px-1">Align</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyLeft'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Aligner à gauche"
        >
          ⬅
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyCenter'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Centrer"
        >
          ⬆⬇
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyRight'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Aligner à droite"
        >
          ➡
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('justifyFull'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Justifier"
        >
          ⟺
        </button>
      </div>

      {/* Listes */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <span className="text-xs font-semibold text-gray-600 px-1">Listes</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Liste à puces"
        >
          •••
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('insertOrderedList'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Liste numérotée"
        >
          123
        </button>
      </div>

      {/* Indentation */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('outdent'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Diminuer le retrait"
        >
          ◀ Retrait
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('indent'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Augmenter le retrait"
        >
          Retrait ▶
        </button>
      </div>

      {/* Lien */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              setSavedSelection(selection.getRangeAt(0).cloneRange());
            }
            setShowLinkInput(!showLinkInput);
          }}
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700 font-medium"
          title="Insérer un lien"
        >
          🔗 Lien
        </button>
        {showLinkInput && (
          <div className="flex gap-1 ml-2">
            <input
              type="text"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="px-2 py-1 text-xs border rounded"
              onKeyPress={(e) => { if (e.key === 'Enter') insertLink(); }}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        )}
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('removeLink'); }}
          className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded text-red-700"
          title="Enlever le lien"
        >
          ✕
        </button>
      </div>

      {/* Blocs */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('formatBlock', '<blockquote>'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded"
          title="Blocquote"
        >
          " Citation
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('formatBlock', '<pre>'); }}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-200 rounded font-mono text-xs"
          title="Code"
        >
          &lt;&gt;
        </button>
      </div>

      {/* Réinitialiser */}
      <div className="flex gap-1 items-center bg-white p-2 rounded-lg border border-gray-200">
        <button
          onMouseDown={(e) => { e.preventDefault(); applyFormat('removeFormat'); }}
          className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded text-red-700 font-medium"
          title="Enlever toute mise en forme"
        >
          Réinitialiser
        </button>
      </div>

      <div className="text-xs text-gray-600 ml-auto px-2 py-1 bg-white rounded-lg border border-gray-200">
        💡 Sélectionnez du texte pour le formater
      </div>
    </div>
  );
}
