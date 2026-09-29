'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const handleButtonClick = (e: React.PointerEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
    editor?.view.focus();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleBold().run())}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            editor.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          <strong>B</strong>
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleItalic().run())}
          className={`px-3 py-1 rounded text-sm italic ${
            editor.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          I
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleStrike().run())}
          className={`px-3 py-1 rounded text-sm line-through ${
            editor.isActive('strike') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          S
        </button>

        {/* Couleur */}
        <input
          type="color"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="w-10 h-8 rounded cursor-pointer border"
          title="Couleur du texte"
        />

        <div className="border-l border-gray-300 mx-1" />

        {/* Alignement */}
        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().setTextAlign('left').run())}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
          title="Aligner à gauche"
        >
          ⬅️
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().setTextAlign('center').run())}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
          title="Centrer"
        >
          ⬆️
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().setTextAlign('right').run())}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
          title="Aligner à droite"
        >
          ➡️
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H1
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H2
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H3
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleBulletList().run())}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          • Liste
        </button>

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().toggleOrderedList().run())}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          1. Liste
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onPointerDown={(e) => handleButtonClick(e, () => editor.chain().focus().clearNodes().run())}
          className="px-3 py-1 rounded text-sm bg-white border hover:bg-gray-50"
        >
          Réinitialiser
        </button>
      </div>

      {/* Editor */}
      <div className="prose prose-sm max-w-none p-4 bg-white min-h-64">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
