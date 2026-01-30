'use client';

import React, { useState } from 'react';
import { Vocabulary, Note } from '../types';
import { Book, PenTool, Trash2, Edit2, Check, X } from 'lucide-react';

interface SidebarProps {
  vocabList: Vocabulary[];
  noteList: Note[];
  onRemoveVocab: (id: string) => void;
  onRemoveNote: (id: string) => void;
  onUpdateNote: (note: Note) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ vocabList, noteList, onRemoveVocab, onRemoveNote, onUpdateNote }) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.aiAnalysis);
  };

  const handleSaveEdit = (originalNote: Note) => {
    onUpdateNote({ ...originalNote, aiAnalysis: editContent });
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  return (
    <div className="w-80 h-full bg-white border-l border-stone-200 flex flex-col shadow-lg z-20">
      <div className="p-4 bg-stone-50 border-b border-stone-200">
        <h3 className="font-bold text-stone-700 flex items-center gap-2">
            <Book size={18} /> 
            学习积累
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Vocabulary Section */}
        <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">生词本 ({vocabList.length})</h4>
            {vocabList.length === 0 && <p className="text-sm text-stone-300 italic">暂无生词</p>}
            <ul className="space-y-3">
                {vocabList.map(v => (
                    <li key={v.id} className="bg-amber-50 p-3 rounded-lg border border-amber-100 relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                {v.pinyin && <div className="text-xs text-stone-500 font-mono mb-0.5">{v.pinyin}</div>}
                                <span className="font-bold text-amber-900 text-lg">{v.word}</span>
                            </div>
                            <button onClick={() => onRemoveVocab(v.id)} className="text-amber-300 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition">
                                <Trash2 size={12} />
                            </button>
                        </div>
                        {v.definition && <p className="text-xs text-amber-800 mt-1 line-clamp-2">{v.definition}</p>}
                    </li>
                ))}
            </ul>
        </div>

        {/* Notes Section */}
        <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">阅读笔记 ({noteList.length})</h4>
             {noteList.length === 0 && <p className="text-sm text-stone-300 italic">暂无笔记</p>}
            <ul className="space-y-3">
                {noteList.map(n => (
                    <li key={n.id} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 relative group">
                         <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-indigo-900 text-sm italic line-clamp-1 flex-1 mr-2">"{n.selectedText}"</span>
                            
                            {editingNoteId !== n.id && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleStartEdit(n)} className="text-indigo-300 hover:text-indigo-600">
                                        <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => onRemoveNote(n.id)} className="text-indigo-300 hover:text-indigo-600">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {editingNoteId === n.id ? (
                            <div className="animate-fade-in">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-indigo-900 min-h-[80px]"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={handleCancelEdit} className="text-stone-400 hover:text-stone-600">
                                        <X size={14} />
                                    </button>
                                    <button onClick={() => handleSaveEdit(n)} className="text-teal-600 hover:text-teal-800">
                                        <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-indigo-700 pl-2 border-l-2 border-indigo-200 line-clamp-4 whitespace-pre-wrap">
                                {n.aiAnalysis}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>

      </div>
    </div>
  );
};

export default Sidebar;