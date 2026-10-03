'use client';

interface TextFormattingToolbarProps {
  contentRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
}

export default function TextFormattingToolbar({ contentRef, isSelected }: TextFormattingToolbarProps) {
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  if (!isSelected) return null;

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1 mb-2 flex-wrap">
      <button
        onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded font-bold"
        title="Gras (Ctrl+B)"
      >
        G
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded italic"
        title="Italique (Ctrl+I)"
      >
        I
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded underline"
        title="Souligné (Ctrl+U)"
      >
        U
      </button>

      <div className="border-l border-gray-300 mx-1" />

      <input
        type="color"
        onChange={(e) => applyFormat('foreColor', e.target.value)}
        className="w-8 h-8 cursor-pointer"
        title="Couleur du texte"
      />

      <select
        onChange={(e) => applyFormat('fontSize', e.target.value)}
        defaultValue="3"
        className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        title="Taille du texte"
      >
        <option value="1">Très petit</option>
        <option value="2">Petit</option>
        <option value="3">Normal</option>
        <option value="4">Grand</option>
        <option value="5">Très grand</option>
      </select>
    </div>
  );
}
