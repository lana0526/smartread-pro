'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AppStep, Article, Vocabulary, Note, VideoScript } from '@/types';
import Editor from '@/components/Editor';
import Reader from '@/components/Reader';
import Sidebar from '@/components/Sidebar';
import Workshop from '@/components/Workshop';
import IntroVideo from '@/components/IntroVideo';
import VocabLearning from '@/components/VocabLearning';

export default function EditorPage() {
  const { user } = useUser();
  const [step, setStep] = useState<AppStep>(AppStep.EDITOR);
  const [article, setArticle] = useState<Article | null>(null);
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [noteList, setNoteList] = useState<Note[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [outlineScript, setOutlineScript] = useState<VideoScript | null>(null);
  
  // 🆕 配额记录状态
  const [hasRecorded, setHasRecorded] = useState(false);

  // 🆕 记录使用次数（只记录一次）
  // 关闭配额记录：当前不需要登录与用量计数
  const recordArticleUsage = async () => {};

  const handleEditorComplete = (newArticle: Article) => {
    setArticle(newArticle);
    setStep(AppStep.INTRO_VIDEO);
    // 注意：不在这里记录，等用户真正开始阅读或互动时再记录
  };

  // 🆕 开始阅读时记录
  const handleStartReading = () => {
    setStep(AppStep.READING);
    recordArticleUsage();
  };

  const handleStartVocab = () => {
    setStep(AppStep.VOCAB_LEARNING);
  };

  const handleVocabComplete = (learnedVocab: Vocabulary[]) => {
    setVocabList(prev => [...prev, ...learnedVocab]);
    setStep(AppStep.READING);
  };

  // 🆕 添加词汇时记录
  const handleAddVocab = (vocab: Vocabulary) => {
    setVocabList(prev => [...prev, vocab]);
    recordArticleUsage();
  };

  // 🆕 添加笔记时记录
  const handleAddNote = (note: Note) => {
    setNoteList(prev => [...prev, note]);
    recordArticleUsage();
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNoteList(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleFinishReading = () => {
    setStep(AppStep.WORKSHOP);
    setIsSidebarOpen(false);
  };

  const handleReset = () => {
    setStep(AppStep.EDITOR);
    setArticle(null);
    setVocabList([]);
    setNoteList([]);
    setOutlineScript(null);
    setIsSidebarOpen(true);
    setHasRecorded(false); // 🆕 重置记录状态
  };

  return (
    <>
      {/* 登录提示已移除：当前体验不需要登录 */}
      <div className="flex h-screen w-full bg-stone-50 overflow-hidden text-stone-900">
        <main className="flex-1 flex flex-col transition-all duration-300">
          
          {step === AppStep.EDITOR && (
            <div className="h-full overflow-y-auto">
              <Editor 
                onComplete={handleEditorComplete} 
                initialData={article}
              />
            </div>
          )}

          {step === AppStep.INTRO_VIDEO && article && (
            <div className="h-full overflow-y-auto bg-stone-50">
              <IntroVideo 
                article={article}
                initialScript={outlineScript}
                onScriptGenerated={setOutlineScript}
                onStartReading={handleStartReading}
                onStartVocab={handleStartVocab}
                onSkip={handleStartReading}
                onBack={() => setStep(AppStep.EDITOR)}
              />
            </div>
          )}

          {step === AppStep.VOCAB_LEARNING && article && (
            <div className="h-full overflow-y-auto bg-stone-50">
              <VocabLearning 
                article={article}
                onComplete={handleVocabComplete}
                onBack={() => setStep(AppStep.INTRO_VIDEO)}
              />
            </div>
          )}

          {step === AppStep.READING && article && (
            <div className="flex h-full">
              <div className="flex-1 h-full relative">
                <Reader 
                  article={article} 
                  onAddVocab={handleAddVocab} 
                  onAddNote={handleAddNote}
                  onFinish={handleFinishReading}
                />
              </div>
              {isSidebarOpen && (
                <Sidebar 
                  vocabList={vocabList} 
                  noteList={noteList} 
                  onRemoveVocab={(id) => setVocabList(prev => prev.filter(v => v.id !== id))}
                  onRemoveNote={(id) => setNoteList(prev => prev.filter(n => n.id !== id))}
                  onUpdateNote={handleUpdateNote}
                />
              )}
              
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute bottom-6 right-6 z-30 bg-white p-3 rounded-full shadow-lg border border-stone-200 text-stone-500 hover:text-teal-600 transition"
                title={isSidebarOpen ? "隐藏侧边栏" : "显示学习记录"}
              >
                {isSidebarOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>
                )}
              </button>
            </div>
          )}

          {step === AppStep.WORKSHOP && article && (
            <Workshop 
              article={article} 
              vocabList={vocabList} 
              noteList={noteList} 
              outline={outlineScript}
              onReset={handleReset} 
            />
          )}

        </main>
      </div>
    </>
  );
}
