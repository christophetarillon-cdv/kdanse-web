'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
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

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            editor.isActive('bold')
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          <strong>B</strong>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm italic ${
            editor.isActive('italic')
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          I
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1 rounded text-sm line-through ${
            editor.isActive('strike')
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          S
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H1
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H2
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-bold ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          H3
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('bulletList')
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          • Liste
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm ${
            editor.isActive('orderedList')
              ? 'bg-blue-600 text-white'
              : 'bg-white border hover:bg-gray-50'
          }`}
        >
          1. Liste
        </button>

        <div className="border-l border-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().clearNodes().run()}
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
