'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Article, Vocabulary, Note } from '../types';
import {
  Play,
  Pause,
  BookMarked,
  MessageSquarePlus,
  Sparkles,
  Volume2,
  Loader2,
  RotateCcw,
  Settings,
  StopCircle,
  GripHorizontal,
  X,
} from 'lucide-react';
import { analyzeSelection, synthesizeSpeech, getPinyin, generateTeacherScript, speakWithBrowserTTS } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../lib/audioUtils';

interface ReaderProps {
  article: Article;
  onAddVocab: (v: Vocabulary) => void;
  onAddNote: (n: Note) => void;
  onFinish: () => void;
}

const Reader: React.FC<ReaderProps> = ({ article, onAddVocab, onAddNote, onFinish }) => {
  // Player State (Paragraph reading)
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [autoRestart, setAutoRestart] = useState(false);

  // Selection & Analysis State
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [selectionPinyin, setSelectionPinyin] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingVocab, setIsSavingVocab] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Word/Selection Audio State
  const [isReadingSelection, setIsReadingSelection] = useState(false);
  const [isLoadingSelectionAudio, setIsLoadingSelectionAudio] = useState(false);
  const selectionAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Analysis Audio State
  const [isReadingAnalysis, setIsReadingAnalysis] = useState(false);
  const [isLoadingAnalysisAudio, setIsLoadingAnalysisAudio] = useState(false);
  const analysisAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analysisAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Timing Refs for Pause/Resume
  const pausedOffsetRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Animation Refs
  const requestRef = useRef<number | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioSource();
      stopAnalysisAudio();
      stopSelectionAudio();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag Event Listeners
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPopoverPos({
        x: e.clientX - dragStartOffsetRef.current.x,
        y: e.clientY - dragStartOffsetRef.current.y,
      });
    };

    const handleWindowMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  // Trigger Pinyin when selection changes
  useEffect(() => {
    if (!selection?.text) return;
    const fetchPinyin = async () => {
      try {
        const p = await getPinyin(selection.text);
        setSelectionPinyin(p);
      } catch (e) {
        console.error('getPinyin error', e);
      }
    };
    fetchPinyin();
  }, [selection?.text]);

  // --- Audio Engine ---
  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // 记录完成精读并进入练习，触发配额计数
  const handleFinishReading = async () => {
    try {
      await fetch('/api/usage/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('record usage failed', error);
    }
    onFinish();
  };

  const stopAudioSource = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // ignore
      }
      audioSourceRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  };

  const stopAnalysisAudio = () => {
    if (analysisAudioSourceRef.current) {
      try {
        analysisAudioSourceRef.current.stop();
      } catch {
        // ignore
      }
      analysisAudioSourceRef.current = null;
    }
    setIsReadingAnalysis(false);
  };

  const stopSelectionAudio = () => {
    if (selectionAudioSourceRef.current) {
      try {
        selectionAudioSourceRef.current.stop();
      } catch {
        // ignore
      }
      selectionAudioSourceRef.current = null;
    }
    setIsReadingSelection(false);
  };

  const animate = () => {
    if (audioContextRef.current && durationRef.current > 0) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / durationRef.current, 1);
      setPlaybackProgress(progress);

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPlaybackProgress(1);
        pausedOffsetRef.current = 0;
      }
    }
  };

  const playBufferedAudio = (offset: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    stopAudioSource();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    source.start(0, offset);
    audioSourceRef.current = source;

    setIsPlaying(true);
    requestRef.current = requestAnimationFrame(animate);
  };

  const handleTogglePlay = async (index: number, text: string) => {
    const ctx = await initAudioContext();

    if (activeParagraphIndex !== index) {
      stopAudioSource();
      setActiveParagraphIndex(index);
      setIsPlaying(false);
      setPlaybackProgress(0);
      pausedOffsetRef.current = 0;
      audioBufferRef.current = null;
      setIsLoadingAudio(true);

      const base64Audio = await synthesizeSpeech(text);
      if (!base64Audio) {
        setIsLoadingAudio(false);
        setActiveParagraphIndex(null);
        alert('音频生成失败，请稍后重试。');
        return;
      }

      try {
        const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
        audioBufferRef.current = audioBuffer;
        durationRef.current = audioBuffer.duration;
      } catch (e) {
        console.error('Decode error', e);
        setIsLoadingAudio(false);
        setActiveParagraphIndex(null);
        return;
      }

      setIsLoadingAudio(false);
      playBufferedAudio(0);
      return;
    }

    if (isPlaying) {
      stopAudioSource();
      setIsPlaying(false);
      pausedOffsetRef.current = ctx.currentTime - startTimeRef.current;
    } else {
      const offset = autoRestart ? 0 : pausedOffsetRef.current;
      const effectiveOffset = playbackProgress >= 1 ? 0 : offset;
      playBufferedAudio(effectiveOffset);
    }
  };

  const handleManualRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeParagraphIndex === null) return;
    pausedOffsetRef.current = 0;
    playBufferedAudio(0);
  };

  // Read selected text (TTS)
  const handleReadSelection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selection?.text) return;
    const ctx = await initAudioContext();

    if (isReadingSelection) {
      stopSelectionAudio();
      return;
    }

    stopSelectionAudio();
    setIsLoadingSelectionAudio(true);

    try {
      const base64 = await synthesizeSpeech(selection.text);
      if (!base64) {
        const ok = speakWithBrowserTTS(selection.text);
        if (!ok) alert("朗读失败：浏览器不支持语音合成。");
      return;
      }

      const buffer = await decodeAudioData(decodeBase64(base64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsReadingSelection(false);
      source.start();
      selectionAudioSourceRef.current = source;
      setIsReadingSelection(true);
    } catch (err) {
      console.error('Read selection error', err);
      alert('朗读失败，请稍后重试。');
    } finally {
      setIsLoadingSelectionAudio(false);
    }
  };

  const handleToggleAnalysisAudio = async () => {
    if (!analysisResult || !selection) return;
    const ctx = await initAudioContext();

    if (isReadingAnalysis) {
      stopAnalysisAudio();
      return;
    }

    setIsLoadingAnalysisAudio(true);

    try {
      let audioBuffer = analysisAudioBufferRef.current;

      if (!audioBuffer) {
        const teacherScript = await generateTeacherScript(analysisResult, selection.text);
        const base64Audio = await synthesizeSpeech(teacherScript);
        if (!base64Audio) throw new Error('TTS Failed');
        audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
        analysisAudioBufferRef.current = audioBuffer;
      }

      stopAnalysisAudio();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsReadingAnalysis(false);
      source.start();
      analysisAudioSourceRef.current = source;
      setIsReadingAnalysis(true);
    } catch (e) {
      console.error('Analysis TTS error:', e);
      alert('讲解音频生成失败，请稍后重试。');
    } finally {
      setIsLoadingAnalysisAudio(false);
    }
  };

  const handleMouseUp = () => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) return;

    const text = windowSelection.toString().trim();
    if (text.length < 1) return;

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const popoverWidth = 480;
    let x = Math.max(10, Math.min(rect.left, window.innerWidth - popoverWidth - 20));
    let y = rect.bottom + 10;
    if (y + 300 > window.innerHeight) {
      y = Math.max(10, rect.top - 400);
    }

    setSelection({ text, rect });
    setPopoverPos({ x, y });
    setSelectionPinyin(null);

    stopAnalysisAudio();
    stopSelectionAudio();
    setAnalysisResult(null);
    analysisAudioBufferRef.current = null;
  };

  const handleClosePopover = () => {
    stopAnalysisAudio();
    stopSelectionAudio();
    setSelection(null);
    setSelectionPinyin(null);
    setAnalysisResult(null);
    analysisAudioBufferRef.current = null;
  };

  const handleStartDrag = (e: React.MouseEvent) => {
    if (!selection) return;
    setIsDragging(true);
    dragStartOffsetRef.current = {
      x: e.clientX - popoverPos.x,
      y: e.clientY - popoverPos.y,
    };
    e.preventDefault();
  };

  const renderParagraphContent = (text: string, index: number) => {
    if (activeParagraphIndex !== index) return text;
    if (isLoadingAudio && !audioBufferRef.current) return text;

    const limit = Math.floor(text.length * playbackProgress);
    return text.split('').map((char, i) => (
      <span
        key={i}
        className={`transition-colors duration-75 ${
          i < limit ? 'text-teal-700 font-medium bg-teal-50/50' : 'text-stone-800'
        }`}
      >
        {char}
      </span>
    ));
  };

  const handleAnalyze = async () => {
    if (!selection) return;
    setIsAnalyzing(true);
    stopAnalysisAudio();
    setAnalysisResult(null);
    analysisAudioBufferRef.current = null;

    try {
      const result = await analyzeSelection(selection.text, article.content);
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveVocab = async () => {
    if (!selection) return;
    setIsSavingVocab(true);
    try {
      const pinyin = selectionPinyin || (await getPinyin(selection.text));
      const newVocab: Vocabulary = {
        id: Date.now().toString(),
        word: selection.text,
        pinyin,
        definition: '',
        context: selection.text,
      };
      onAddVocab(newVocab);
    } finally {
      setIsSavingVocab(false);
    }
  };

  const handleSaveNote = () => {
    if (!selection || !analysisResult) return;
    const newNote: Note = {
      id: Date.now().toString(),
      selectedText: selection.text,
      aiAnalysis: analysisResult,
    };
    onAddNote(newNote);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto relative">
      {/* Header */}
      <div className="flex justify-between items-center py-4 px-6 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h2
              className="text-xl font-bold text-stone-800"
              style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}
            >
              {article.title}
            </h2>
            <p className="text-xs text-stone-500">选中句子可进行 AI 解析与朗读</p>
          </div>

          <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full">
            <Settings size={14} className="text-stone-400" />
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-stone-600">自动从头播放</span>
              <input
                type="checkbox"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                className="accent-teal-600 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <button
          onClick={handleFinishReading}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 transition"
        >
          完成精读进入专属练习定制
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pb-32 scroll-smooth" onMouseUp={handleMouseUp}>
        <div className="max-w-3xl mx-auto space-y-8">
          {article.paragraphs.map((para, index) => {
            const isActive = activeParagraphIndex === index;
            return (
              <div
                key={index}
                className={`group relative p-6 rounded-2xl transition-all duration-500 border-l-4 ${
                  isActive
                    ? 'bg-white border-l-teal-500 shadow-xl ring-1 ring-teal-100 scale-[1.01]'
                    : 'bg-white border-l-transparent border-y border-r border-transparent hover:border-stone-100 hover:shadow-sm'
                }`}
              >
                <div className="absolute -left-14 top-6 flex flex-col gap-2 items-center">
                  <button
                    onClick={() => handleTogglePlay(index, para)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 shadow-sm ${
                      isActive
                        ? 'bg-teal-500 text-white scale-110 shadow-teal-200'
                        : 'bg-white text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-teal-500 hover:text-white'
                    }`}
                    disabled={isLoadingAudio && isActive}
                  >
                    {isActive && isLoadingAudio ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isActive && isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} className="ml-0.5" fill="currentColor" />
                    )}
                  </button>

                  {isActive && !isLoadingAudio && (
                    <button
                      onClick={handleManualRestart}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-teal-100 hover:text-teal-600 transition-all animate-fade-in"
                      title="从头播放"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>

                <p
                  className={`text-xl md:text-2xl leading-loose tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-stone-900' : 'text-stone-700'
                  }`}
                  style={{
                    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
                    whiteSpace: 'pre-wrap',
                    textIndent: '2em',
                  }}
                >
                  {renderParagraphContent(para, index)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Popover */}
      {selection && (
        <div
          className={`fixed z-50 bg-white rounded-xl shadow-2xl border border-stone-200 w-[30rem] overflow-hidden flex flex-col max-h-[600px] transition-opacity duration-200 ${
            isDragging ? 'opacity-90 shadow-none scale-[1.01]' : 'shadow-2xl'
          }`}
          style={{ top: popoverPos.y, left: popoverPos.x }}
        >
          <div
            className="p-3 bg-teal-50 border-b border-teal-100 flex justify-between items-center shrink-0 cursor-move select-none"
            onMouseDown={handleStartDrag}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1 py-1">
              <GripHorizontal size={16} className="text-teal-300 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                {selectionPinyin && (
                  <span className="text-[10px] font-mono font-medium text-teal-400 leading-none mb-0.5 tracking-wider animate-fade-in">
                    {selectionPinyin}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-teal-900 truncate text-base leading-tight"
                    style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}
                  >
                    {selection.text}
                  </span>

                  <button
                    onClick={handleReadSelection}
                    disabled={isLoadingSelectionAudio}
                    className={`p-1 rounded-full transition-colors ${
                      isReadingSelection
                        ? 'bg-teal-200 text-teal-700'
                        : 'text-teal-400 hover:bg-teal-100 hover:text-teal-600'
                    }`}
                    title="朗读选中内容"
                  >
                    {isLoadingSelectionAudio ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isReadingSelection ? (
                      <StopCircle size={14} fill="currentColor" />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-center ml-2">
              <button
                onClick={handleSaveVocab}
                disabled={isSavingVocab}
                className="flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded text-xs hover:bg-amber-200 font-bold border border-amber-200 whitespace-nowrap disabled:opacity-50"
              >
                {isSavingVocab ? <Loader2 size={12} className="animate-spin" /> : <BookMarked size={12} />}
                {isSavingVocab ? '...' : '加入生词'}
              </button>

              {!analysisResult ? (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isSavingVocab}
                  className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI 解析
                </button>
              ) : (
                <button
                  onClick={handleToggleAnalysisAudio}
                  disabled={isLoadingAnalysisAudio}
                  className={`flex items-center justify-center gap-1 px-3 py-1 rounded text-xs border whitespace-nowrap transition-colors ${
                    isReadingAnalysis
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                  }`}
                  title="收听/停止讲解"
                >
                  {isLoadingAnalysisAudio ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isReadingAnalysis ? (
                    <StopCircle size={12} />
                  ) : (
                    <Volume2 size={12} />
                  )}
                  {isReadingAnalysis ? '停止' : 'AI 讲解'}
                </button>
              )}

              <button
                onClick={handleClosePopover}
                className="ml-2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-100"
                title="关闭"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 select-text">
            {isAnalyzing ? (
              <div className="space-y-2 animate-pulse mb-4">
                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-5/6"></div>
              </div>
            ) : analysisResult ? (
              <div className="mb-2">
                <div className="text-sm leading-relaxed whitespace-pre-line text-stone-700 mb-3">{analysisResult}</div>
                <div className="flex gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-xs font-bold border border-indigo-100"
                  >
                    <MessageSquarePlus size={14} /> 保存笔记
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-stone-400 text-center italic py-10">选中文字后点击 “AI 解析” 获取讲解</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reader;
