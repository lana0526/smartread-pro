'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Article, VideoScript } from '../types';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  SkipForward,
  ArrowLeft,
  GraduationCap,
  FileText,
  Sparkles,
  Volume2,
  StopCircle,
  Target,
  Library,
  Zap,
  Heart,
  Lightbulb,
  Rocket,
  ChevronDown,
  List,
} from 'lucide-react';
import {
  generateVideoScript,
  generateArticleCoverImage,
  generateOutlineExplanation,
  synthesizeSpeech,
} from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../lib/audioUtils';

interface IntroVideoProps {
  article: Article;
  onStartReading: () => void;
  onStartVocab: () => void;
  onSkip: () => void;
  onBack: () => void;
  initialScript?: VideoScript | null;
  onScriptGenerated?: (script: VideoScript) => void;
}

type VideoIntroStatus = 'idle' | 'scripting' | 'ready' | 'error';

const IntroVideo: React.FC<IntroVideoProps> = ({
  article,
  onStartReading,
  onStartVocab,
  onSkip,
  onBack,
  initialScript,
  onScriptGenerated,
}) => {
  const [status, setStatus] = useState<VideoIntroStatus>('idle');
  const [scriptData, setScriptData] = useState<VideoScript | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Sidebar States
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['intro'])); // default open

  // Audio State
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    try {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      setPlayingKey(null);
    }
  };

  // Auto-generate cover image on mount / article change
  useEffect(() => {
    if (initialScript) {
      setScriptData(initialScript);
      setStatus('ready');
      setIsSidebarExpanded(true);
    }

    const loadCover = async () => {
      try {
        const img = await generateArticleCoverImage(article.title, article.content);
        if (img) setCoverImage(img);
      } catch (e) {
        console.error('Cover image error', e);
      }
    };

    loadCover();

    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article]);

  const toggleSection = (key: string) => {
    const next = new Set(openSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenSections(next);
  };

  const handlePlaySection = async (
    e: React.MouseEvent,
    key: string,
    title: string,
    content: string
  ) => {
    e.stopPropagation(); // Don't toggle accordion when clicking play

    if (playingKey === key) {
      // 如果正在播放同一段，改为暂停/停止
      stopAudio();
      setPlayingKey(null);
      return;
    }

    stopAudio();
    setLoadingAudioKey(key);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const teacherLecture = await generateOutlineExplanation(title, content, article.title);
      const base64Audio = await synthesizeSpeech(teacherLecture);

      if (!base64Audio) {
        setStatus('error');
        setErrorMessage('音频生成失败，请稍后再试。');
        return;
      }

      const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlayingKey(null);

      source.start();
      audioSourceRef.current = source;
      setPlayingKey(key);
    } catch (err) {
      console.error('Outline lecture error', err);
      alert('音频生成失败，请稍后重试。');
    } finally {
      setLoadingAudioKey(null);
    }
  };

  const handleGenerateClick = async () => {
    setStatus('scripting');
    setErrorMessage(null);
    setCurrentStep('正在分析文章结构...');

    try {
      let currentScript = scriptData;

      if (!currentScript) {
        currentScript = await generateVideoScript(article.content);
        if (!currentScript) {
          setStatus('error');
          setErrorMessage('脚本生成失败，请检查 API Key 或稍后再试。');
          return;
        }
        setScriptData(currentScript);
        onScriptGenerated?.(currentScript);
      } else {
        onScriptGenerated?.(currentScript);
      }

      setCurrentStep('正在梳理导读大纲...');
      await new Promise((resolve) => setTimeout(resolve, 800));

      setStatus('ready');
      setIsSidebarExpanded(true); // auto-expand sidebar when ready
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('生成失败，请重试。');
    }
  };

  // 合并整篇导读用于整体收听
  const outlineFullText = scriptData
    ? [
        scriptData.intro,
        scriptData.framework,
        scriptData.highlights,
        scriptData.emotion,
        scriptData.theme,
        scriptData.transfer,
      ]
        .filter(Boolean)
        .join('\n\n')
    : '';

  const controlText =
    status === 'idle'
      ? '点击「生成导读大纲」开始。'
      : status === 'scripting'
      ? '正在生成导读内容，请稍候...'
      : status === 'ready'
      ? '导读已就绪：可收听讲解，或直接开始生词/精读。'
      : '生成失败：请重试。';

  return (
    <div
      className="max-w-7xl mx-auto px-4 py-6 min-h-full flex flex-col animate-fade-in text-stone-800"
      style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}
    >
      {/* Navigation */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-stone-500 hover:text-stone-800 transition px-3 py-1.5 rounded-lg hover:bg-stone-100 font-sans text-sm"
        >
          <ArrowLeft size={16} />
          <span>返回编辑器</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="text-left space-y-2">
            <h1 className="text-3xl font-bold text-stone-800">文章导读</h1>
            <p className="text-stone-500 text-lg font-sans">AI 正在为您解析《{article.title}》。 </p>
          </div>

          {/* Visual Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden relative flex flex-col">
            <div className="w-full bg-stone-900 relative flex items-center justify-center aspect-video group overflow-hidden">
              {/* Background Image Layer */}
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Article Cover"
                  className="absolute inset-0 w-full h-full object-cover animate-fade-in transition-transform duration-10000 group-hover:scale-105 opacity-80"
                />
              ) : (
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-black"></div>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>

              {/* IDLE */}
              {status === 'idle' && (
                <div className="text-center space-y-4 p-8 relative z-10 animate-fade-in">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto text-white border border-white/20 shadow-2xl">
                    <Sparkles size={32} className="text-amber-400" />
                  </div>
                  <p className="text-white text-xl font-sans font-medium drop-shadow-md">
                    准备就绪，点击下方按钮开始导读
                  </p>
                </div>
              )}

              {/* SCRIPTING */}
              {status === 'scripting' && (
                <div className="text-center space-y-6 p-8 w-full max-w-md animate-fade-in relative z-10">
                  <Loader2 size={48} className="mx-auto text-teal-400 animate-spin" />
                  <div className="space-y-2">
                    <h3 className="text-white font-bold text-xl drop-shadow-md font-sans">
                      AI 正在深度拆解文章...
                    </h3>
                    <p className="text-stone-300 font-mono text-sm drop-shadow">{currentStep}</p>
                  </div>
                </div>
              )}

              {/* READY */}
              {status === 'ready' && (
                <div className="text-center space-y-6 p-8 w-full h-full flex flex-col justify-center items-center animate-fade-in relative z-10">
                  <div className="border border-white/30 p-10 rounded-2xl bg-black/40 backdrop-blur-xl shadow-2xl transform hover:scale-105 transition duration-500">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg tracking-widest leading-tight">
                      {article.title}
                    </h2>
                    <div className="w-20 h-1.5 bg-teal-500 mx-auto mb-6 rounded-full"></div>
                    <p className="text-teal-50 text-xl font-sans tracking-wide font-medium opacity-90">
                      导读大纲已生成
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {status === 'error' && (
                <div className="text-center space-y-4 p-8 bg-red-900/40 rounded-xl border border-red-500/30 max-w-md relative z-10 backdrop-blur-md">
                  <AlertCircle size={48} className="text-red-500 mx-auto" />
                  <h3 className="text-red-400 font-bold text-lg">分析中断</h3>
                  <p className="text-stone-200 text-sm">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Control Bar */}
            <div className="p-6 bg-white border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="text-stone-600 font-sans">{controlText}</div>

              <div className="flex gap-3 w-full sm:w-auto font-sans">
                {status === 'idle' && (
                  <button
                    onClick={handleGenerateClick}
                    className="w-full sm:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-100 flex items-center justify-center gap-2 transition transform active:scale-95"
                  >
                    <Sparkles size={18} /> 生成导读大纲
                  </button>
                )}

                {status === 'ready' && (
                  <>
                    <button
                      onClick={onStartVocab}
                      className="flex-1 sm:flex-none px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-100 flex items-center justify-center gap-2 transition transform active:scale-95"
                    >
                      <GraduationCap size={20} /> 学习生词
                    </button>
                    <button
                      onClick={onStartReading}
                      className="flex-1 sm:flex-none px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-100 flex items-center justify-center gap-2 transition transform active:scale-95"
                    >
                      开始精读 <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {status === 'error' && (
                  <button
                    onClick={handleGenerateClick}
                    className="px-8 py-3 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold flex items-center gap-2"
                  >
                    <RefreshCw size={18} /> 重试
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-stone-400 text-sm hover:text-stone-800 flex items-center justify-center gap-1 mx-auto font-sans transition"
            >
              <SkipForward size={14} /> 跳过导读环节
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0">
          {status === 'ready' && scriptData ? (
            <div className="flex flex-col gap-4 animate-fade-in h-full min-h-0">
              {!isSidebarExpanded ? (
                /* Summary Card */
                <div
                  onClick={() => setIsSidebarExpanded(true)}
                  className="bg-white rounded-2xl shadow-xl border border-teal-100 p-8 cursor-pointer group hover:border-teal-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 group-hover:scale-110 transition duration-300">
                      <FileText size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-800">导读大纲已生成</h3>
                      <div className="flex items-center gap-2 text-stone-400 text-sm font-sans mt-1">
                        <List size={14} />
                        <span>包含 6 个核心维度 · 预计阅读 3 分钟</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-teal-600 font-bold font-sans group-hover:gap-2 transition-all">
                    <span>查看完整大纲</span>
                    <ChevronRight size={20} />
                  </div>
                </div>
              ) : (
                /* Detailed Accordion List */
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Library size={18} className="text-teal-600" />
                        导读详细大纲
                      </h3>
                      {outlineFullText && (
                        <button
                          onClick={(e) => handlePlaySection(e, 'full', '导读大纲', outlineFullText)}
                          className="flex items-center gap-1 text-teal-600 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-100 transition"
                          disabled={loadingAudioKey === 'full'}
                        >
                          {loadingAudioKey === 'full' ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : playingKey === 'full' ? (
                            <StopCircle size={14} />
                          ) : (
                            <Volume2 size={14} />
                          )}
                          整体收听
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setIsSidebarExpanded(false)}
                      className="text-stone-400 hover:text-stone-600 text-xs font-sans px-2 py-1 hover:bg-stone-50 rounded-md transition"
                    >
                      收起大纲
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-8">
                    <DetailedCard
                      id="intro"
                      title="1. 开头引导"
                      icon={Target}
                      content={scriptData.intro}
                      isOpen={openSections.has('intro')}
                      onToggle={() => toggleSection('intro')}
                      colorClass="indigo"
                    />

                    <DetailedCard
                      id="framework"
                      title="2. 文章大结构"
                      icon={Library}
                      content={scriptData.framework}
                      isOpen={openSections.has('framework')}
                      onToggle={() => toggleSection('framework')}
                      colorClass="blue"
                    />

                    <DetailedCard
                      id="highlights"
                      title="3. 结构亮点"
                      icon={Zap}
                      content={scriptData.highlights}
                      isOpen={openSections.has('highlights')}
                      onToggle={() => toggleSection('highlights')}
                      colorClass="amber"
                    />

                    <DetailedCard
                      id="emotion"
                      title="4. 情绪路径"
                      icon={Heart}
                      content={scriptData.emotion}
                      isOpen={openSections.has('emotion')}
                      onToggle={() => toggleSection('emotion')}
                      colorClass="rose"
                    />

                    <DetailedCard
                      id="theme"
                      title="5. 核心主旨"
                      icon={Lightbulb}
                      content={scriptData.theme}
                      isOpen={openSections.has('theme')}
                      onToggle={() => toggleSection('theme')}
                      colorClass="teal"
                    />

                    <DetailedCard
                      id="transfer"
                      title="6. 迁移思考"
                      icon={Rocket}
                      content={scriptData.transfer}
                      isOpen={openSections.has('transfer')}
                      onToggle={() => toggleSection('transfer')}
                      colorClass="purple"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Initial Sidebar State */
            <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 border-2 border-dashed border-stone-200">
                {status === 'scripting' ? (
                  <Loader2 size={32} className="animate-spin text-teal-400" />
                ) : (
                  <List size={32} />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">导读分析区</h3>
                <p className="text-stone-400 text-sm font-sans px-4">
                  {status === 'scripting'
                    ? 'AI 正在提取文章的各个维度，请耐心等待...'
                    : '生成大纲后，这里将为您逐条拆解文章结构，并提供 AI 老师的语音讲解。'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type DetailedCardColor = 'indigo' | 'blue' | 'amber' | 'rose' | 'teal' | 'purple';

interface DetailedCardProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
  colorClass: DetailedCardColor;
}

const DetailedCard: React.FC<DetailedCardProps> = ({
  id,
  title,
  icon: Icon,
  content,
  isOpen,
  onToggle,
  colorClass,
}) => {
  const colors: Record<DetailedCardColor, string> = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700 icon-bg-indigo-100',
    blue: 'bg-blue-50 border-blue-100 text-blue-700 icon-bg-blue-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 icon-bg-amber-100',
    rose: 'bg-rose-50 border-rose-100 text-rose-700 icon-bg-rose-100',
    teal: 'bg-teal-50 border-teal-100 text-teal-700 icon-bg-teal-100',
    purple: 'bg-purple-50 border-purple-100 text-purple-700 icon-bg-purple-100',
  };

  const currentStyles = colors[colorClass] || colors.indigo;
  const parts = currentStyles.split(' ');
  const bg = parts[0];
  const border = parts[1];
  const text = parts[2];
  const iconBg = parts[3].replace('icon-bg-', 'bg-');

  return (
    <div
      id={id}
      className={`rounded-2xl border transition-all duration-500 ease-in-out ${
        isOpen ? `${bg} ${border} shadow-lg ring-1 ring-white/50` : 'bg-white border-stone-100 hover:border-stone-200'
      }`}
    >
      <div onClick={onToggle} className="flex items-center justify-between p-4 cursor-pointer group select-none">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              isOpen ? iconBg : 'bg-stone-50'
            } ${isOpen ? text : 'text-stone-400'} group-hover:scale-110`}
          >
            <Icon size={18} />
          </div>
          <span className={`font-bold transition-colors duration-300 ${isOpen ? text : 'text-stone-700'}`}>
            {title}
          </span>
        </div>
        <ChevronDown size={18} className={`text-stone-300 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Smooth Height Expansion */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[3000px] opacity-100 pb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pt-1">
          <div className="h-px w-full bg-white/60 mb-4 rounded-full"></div>
          <p className={`text-[15px] leading-relaxed font-serif whitespace-pre-wrap ${text} opacity-90 transition-opacity duration-700 delay-100`}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntroVideo;
