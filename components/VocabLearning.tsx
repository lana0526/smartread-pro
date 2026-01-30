'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Article, Vocabulary, QuizQuestion } from '../types';
import { extractDifficultVocabulary, generateVocabQuiz, synthesizeSpeech } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../lib/audioUtils';
import { 
    BookOpen, CheckCircle, ChevronRight, ChevronLeft, GraduationCap, Loader2, PlayCircle, 
    Star, ArrowRight, Lightbulb, Volume2, HelpCircle, AlertCircle, Sparkles, XCircle, ArrowLeft 
} from 'lucide-react';

interface VocabLearningProps {
  article: Article;
  onComplete: (vocab: Vocabulary[]) => void;
  onBack: () => void;
}

type Phase = 'learning' | 'quiz' | 'result';

const VocabLearning: React.FC<VocabLearningProps> = ({ article, onComplete, onBack }) => {
  const [phase, setPhase] = useState<Phase>('learning');
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Learning State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Vocab with metadata
        const list = await extractDifficultVocabulary(article.content);
        setVocabList(list);

        // 2. Pre-generate Quiz
        if (list.length > 0) {
            const quizData = await generateVocabQuiz(list);
            setQuestions(quizData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initData();

    return () => {
        audioContextRef.current?.close();
    };
  }, [article.content]);

  // Audio Handler
  const playWordAudio = async (text: string) => {
    if (!text.trim()) return;

    // Prefer browser native SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-CN';
        utter.rate = 0.95;
        utter.pitch = 1;
        setIsPlayingAudio(true);
        utter.onend = () => setIsPlayingAudio(false);
        utter.onerror = (ev) => {
          console.error('SpeechSynthesis error', ev);
          setIsPlayingAudio(false);
        };
        window.speechSynthesis.speak(utter);
        return;
      } catch (err) {
        console.error('SpeechSynthesis error, fallback to API', err);
        setIsPlayingAudio(false);
      }
    }

    if (isPlayingAudio) return;
    try {
        setIsPlayingAudio(true);
        const base64 = await synthesizeSpeech(text);
        if (!base64) { setIsPlayingAudio(false); return; }

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if(ctx.state === 'suspended') await ctx.resume();

        const buffer = await decodeAudioData(decodeBase64(base64), ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
    } catch (e) {
        console.error('Audio Play Error', e);
        setIsPlayingAudio(false);
    }
  };

  // --- Handlers ---

  const handleNextWord = () => {
    if (currentIndex < vocabList.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        // Go to Quiz Phase
        setPhase('quiz');
    }
  };

  const handleSkipToReading = () => {
      onComplete(vocabList);
  };

  const handleAnswer = (ans: string) => {
      if (isAnswered) return;
      setSelectedAnswer(ans);
      setIsAnswered(true);
      
      const currentQ = questions[quizIndex];
      const isCorrect = ans === currentQ.correctAnswer;
      if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNextQuestion = () => {
      if (quizIndex < questions.length - 1) {
          setQuizIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setIsAnswered(false);
      } else {
          setPhase('result');
      }
  };

  // --- RENDERERS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 font-serif">
        <Loader2 className="animate-spin text-amber-500" size={48} />
        <h2 className="text-xl text-stone-700">正在为你提取重点生词...</h2>
        <p className="text-stone-400 text-sm">AI 正在分析词性、难度并生成例句</p>
      </div>
    );
  }

  if (vocabList.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-full">
            <p className="text-stone-500 mb-4">文中暂无生僻词汇。</p>
            <button onClick={() => onComplete([])} className="px-6 py-2 bg-teal-600 text-white rounded-lg">
                直接开始阅读
            </button>
        </div>
    );
  }

  // === PHASE 1: LEARNING ===
  if (phase === 'learning') {
      const currentVocab = vocabList[currentIndex];
      const progress = Math.round(((currentIndex) / vocabList.length) * 100);

      return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 h-full flex flex-col font-sans relative">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-stone-800 font-serif mb-1">生词学习</h2>
                    <p className="text-stone-500 text-sm">这些词将帮助你更好地理解文章。先学一学，再进入精读环节。</p>
                </div>
                {/* Stepper / Progress */}
                <div className="flex items-center gap-3">
                    <span className="text-xl font-mono font-bold text-amber-600">{currentIndex + 1}</span>
                    <span className="text-stone-300 text-xl">/</span>
                    <span className="text-xl font-mono text-stone-400">{vocabList.length}</span>
                </div>
            </div>

            <div className="flex-1 flex gap-8 overflow-hidden pb-20"> {/* pb-20 for fixed footer */}
                
                {/* Left List (Preview) */}
                <div className="w-64 hidden lg:block overflow-y-auto pr-2 border-r border-stone-100">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 pl-2">词汇列表</h3>
                    <div className="space-y-2">
                        {vocabList.map((v, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-full text-left px-4 py-3 rounded-lg transition flex justify-between items-center ${
                                    currentIndex === idx 
                                    ? 'bg-teal-50 text-teal-900 border border-teal-200 font-bold shadow-sm' 
                                    : 'text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                <span className="font-serif text-lg">{v.word}</span>
                                {currentIndex === idx && <div className="w-2 h-2 rounded-full bg-teal-500"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Card */}
                <div className="flex-1 flex justify-center items-start pt-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col min-h-[500px] animate-fade-in relative">
                        
                        {/* Card Header (Word & Audio) */}
                        <div className="bg-gradient-to-br from-amber-50 to-white p-8 border-b border-stone-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-6xl font-bold text-stone-800 font-serif mb-2 tracking-wide">{currentVocab.word}</h1>
                                    <p className="text-2xl text-stone-500 font-mono pl-1">{currentVocab.pinyin}</p>
                                </div>
                                <button 
                                    onClick={() => playWordAudio(currentVocab.word)}
                                    className="p-4 rounded-full bg-white shadow-md border border-stone-100 text-teal-600 hover:text-teal-700 hover:scale-110 transition active:scale-95"
                                    title="播放发音"
                                >
                                    {isPlayingAudio ? <Volume2 className="animate-pulse" size={32} /> : <PlayCircle size={32} />}
                                </button>
                            </div>
                            
                            {/* Tags */}
                            <div className="flex gap-3 mt-6">
                                {currentVocab.partOfSpeech && (
                                    <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-sm font-medium">
                                        {currentVocab.partOfSpeech}
                                    </span>
                                )}
                                {currentVocab.difficulty && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1">
                                        难度: {[...Array(currentVocab.difficulty)].map((_, i) => <Star key={i} size={12} fill="currentColor"/>)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-8 space-y-8">
                            
                            {/* Definition */}
                            <div>
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <BookOpen size={14} /> 释义
                                </h4>
                                <p className="text-2xl text-stone-800 font-serif leading-relaxed font-medium">
                                    {currentVocab.definition}
                                </p>
                            </div>

                            {/* Example */}
                            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Lightbulb size={14} className="text-amber-500"/> 例句
                                </h4>
                                <p className="text-lg text-stone-700 leading-relaxed">
                                    "{currentVocab.exampleSentence || '暂无例句'}"
                                </p>
                            </div>

                            {/* Context Hint */}
                            {currentVocab.contextHint && (
                                <div className="flex gap-3 items-start p-4 bg-stone-100/50 rounded-xl border border-stone-100">
                                    <HelpCircle size={18} className="text-stone-400 mt-0.5 shrink-0" />
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        <span className="font-bold text-stone-500 mr-1">文章关联:</span> 
                                        {currentVocab.contextHint}
                                    </p>
                                </div>
                            )}

                        </div>
                        
                        {/* Next Button inside Card (Mobile friendly) */}
                         <div className="absolute bottom-6 right-6 lg:hidden">
                            <button 
                                onClick={handleNextWord}
                                className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 text-white rounded-full font-bold shadow-lg active:scale-95 transition"
                            >
                                {currentIndex < vocabList.length - 1 ? '下一个' : '去测验'} <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Fixed Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    
                    {/* Left: Back */}
                    <button onClick={onBack} className="text-stone-400 hover:text-stone-600 font-bold flex items-center gap-2 text-sm px-4 py-2">
                        <ArrowLeft size={16} /> 返回导读
                    </button>

                    {/* Center: Skip (Link style) */}
                    <button onClick={handleSkipToReading} className="text-stone-400 hover:text-teal-600 text-sm underline decoration-stone-300 hover:decoration-teal-600 underline-offset-4 transition hidden md:block">
                        跳过生词，直接进入精读
                    </button>

                    {/* Right: Main Action */}
                    <button 
                        onClick={handleNextWord}
                        className={`
                            flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg shadow-lg transition transform hover:-translate-y-1 active:scale-95
                            ${currentIndex === vocabList.length - 1 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                                : 'bg-stone-800 text-white hover:bg-stone-900'}
                        `}
                    >
                        {currentIndex === vocabList.length - 1 ? (
                            <>进入小测验 <GraduationCap size={20} /></>
                        ) : (
                            <>认识下一个生词 <ArrowRight size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // === PHASE 2: QUIZ ===
  if (phase === 'quiz') {
      const currentQ = questions[quizIndex];
      // Fallback if quiz gen failed
      if (!currentQ) { 
          setPhase('result'); 
          return null; 
      }

      const isChoice = currentQ.type === 'choice';

      return (
        <div className="max-w-3xl mx-auto p-8 h-full flex flex-col justify-center items-center font-sans animate-fade-in">
            <div className="w-full mb-8">
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-2xl font-bold text-stone-800">Check-out 小测验</h2>
                    <span className="font-mono text-stone-400">{quizIndex + 1} / {questions.length}</span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${((quizIndex + 1) / questions.length) * 100}%` }}></div>
                </div>
            </div>

            <div className="bg-white w-full rounded-2xl shadow-xl border border-stone-200 p-10 relative">
                <div className="mb-8">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase mb-4 inline-block tracking-wider">
                        {currentQ.relatedWord ? `考察词汇：${currentQ.relatedWord}` : '综合测试'}
                    </span>
                    <h3 className="text-2xl font-bold text-stone-800 leading-normal">
                        {currentQ.question}
                    </h3>
                </div>

                <div className="space-y-4">
                    {currentQ.type === 'choice' && currentQ.options?.map((opt, idx) => {
                        let stateStyles = "border-stone-200 hover:border-teal-500 hover:bg-teal-50 text-stone-600";
                        if (isAnswered) {
                            if (opt === currentQ.correctAnswer) stateStyles = "border-teal-500 bg-teal-100 text-teal-800";
                            else if (opt === selectedAnswer) stateStyles = "border-red-400 bg-red-50 text-red-800";
                            else stateStyles = "border-stone-100 text-stone-400 opacity-50";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(opt)}
                                disabled={isAnswered}
                                className={`w-full p-5 text-left rounded-xl border-2 text-lg font-medium transition-all duration-200 flex justify-between items-center ${stateStyles}`}
                            >
                                {opt}
                                {isAnswered && opt === currentQ.correctAnswer && <CheckCircle className="text-teal-600" />}
                                {isAnswered && opt === selectedAnswer && opt !== currentQ.correctAnswer && <XCircle className="text-red-500" />}
                            </button>
                        );
                    })}

                    {currentQ.type === 'judge' && (
                         <div className="flex gap-6">
                            {['true', 'false'].map((val) => {
                                const label = val === 'true' ? "正确 (True)" : "错误 (False)";
                                let stateStyles = "border-stone-200 hover:border-teal-500 hover:bg-teal-50 text-stone-600";
                                if (isAnswered) {
                                    if (val === currentQ.correctAnswer) stateStyles = "border-teal-500 bg-teal-100 text-teal-800";
                                    else if (val === selectedAnswer) stateStyles = "border-red-400 bg-red-50 text-red-800";
                                    else stateStyles = "border-stone-100 text-stone-400 opacity-50";
                                }

                                return (
                                    <button
                                        key={val}
                                        onClick={() => handleAnswer(val)}
                                        disabled={isAnswered}
                                        className={`flex-1 p-6 rounded-xl border-2 text-xl font-bold transition-all ${stateStyles}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                         </div>
                    )}
                </div>

                {/* Explanation */}
                {isAnswered && (
                    <div className="mt-8 p-4 bg-stone-50 rounded-lg border border-stone-200 animate-fade-in flex gap-3">
                         <div className="mt-0.5">
                            {selectedAnswer === currentQ.correctAnswer ? (
                                <CheckCircle className="text-teal-500" size={20} />
                            ) : (
                                <AlertCircle className="text-red-400" size={20} />
                            )}
                         </div>
                         <div>
                             <p className="font-bold text-stone-800 mb-1">{selectedAnswer === currentQ.correctAnswer ? "回答正确！" : "答案不正确"}</p>
                             <p className="text-stone-600 text-sm leading-relaxed">{currentQ.explanation}</p>
                         </div>
                    </div>
                )}
            </div>

            {/* Next Q Button */}
            {isAnswered && (
                 <button 
                    onClick={handleNextQuestion}
                    className="mt-8 px-10 py-3 bg-stone-800 text-white rounded-full font-bold shadow-lg hover:scale-105 transition animate-fade-in flex items-center gap-2"
                >
                    {quizIndex < questions.length - 1 ? "下一题" : "查看结果"} <ArrowRight size={20} />
                </button>
            )}
        </div>
      );
  }

  // === PHASE 3: RESULT ===
  if (phase === 'result') {
      const percentage = Math.round((score / questions.length) * 100);
      let message = "继续努力！";
      if (percentage >= 80) message = "太棒了！你掌握得非常好！";
      else if (percentage >= 60) message = "不错，继续加油！";

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
             <div className="bg-white p-12 rounded-3xl shadow-2xl border border-stone-100 text-center max-w-lg w-full">
                <div className="w-24 h-24 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles size={48} />
                </div>
                
                <h2 className="text-3xl font-bold text-stone-800 mb-2">学习完成！</h2>
                <p className="text-stone-500 mb-8">{message}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-stone-50 p-4 rounded-xl">
                        <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">生词学习</div>
                        <div className="text-2xl font-bold text-stone-800">{vocabList.length} 个</div>
                    </div>
                    <div className="bg-stone-50 p-4 rounded-xl">
                        <div className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-1">测验得分</div>
                        <div className="text-2xl font-bold text-teal-600">{score} / {questions.length}</div>
                    </div>
                </div>

                <button 
                    onClick={() => onComplete(vocabList)}
                    className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg shadow-teal-100 transition transform hover:-translate-y-1"
                >
                    开始精读之旅
                </button>
             </div>
        </div>
      );
  }

  return null;
};

export default VocabLearning;
