'use client';

import React, { useEffect, useState } from 'react';
import { Article, Vocabulary, Note, GeneratedExercise, VideoScript } from '../types';
import { generateWorkshopContent, enrichVocabularyList } from '../services/geminiService';
import { 
    Download, CheckCircle, GraduationCap, Rotate3d, Image as ImageIcon, 
    BookOpen, ChevronLeft, ChevronRight, X, ZoomIn, Printer, Sparkles, 
    FileDown, FileText, Loader2, Share2, Mail 
} from 'lucide-react';

interface WorkshopProps {
  article: Article;
  vocabList: Vocabulary[];
  noteList: Note[];
  outline: VideoScript | null;
  onReset: () => void;
}

const Workshop: React.FC<WorkshopProps> = ({ article, vocabList, noteList, outline, onReset }) => {
  const [exercise, setExercise] = useState<GeneratedExercise | null>(null);
  const [enrichedVocab, setEnrichedVocab] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("正在规划练习...");
  // 为缺图的单词生成占位 SVG
  const createPlaceholderImage = (word: string) => {
    const bg = '#e0f2f1';
    const fg = '#0f766e';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="400" height="300" rx="24" fill="${bg}"/>
      <text x="200" y="160" font-size="64" font-family="'KaiTi','STKaiti',serif" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${word.slice(0,4)}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const withPlaceholders = (list: Vocabulary[]) =>
    list.map((v) =>
      v.imageUrl
        ? v
        : {
            ...v,
            imageUrl: createPlaceholderImage(v.word),
          }
    );

  // 生成“原文填空”版本：保持原段落格式，仅将词语替换为填空
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildFullCloze = (paragraphs: string[], vocab: Vocabulary[]) => {
    const blanks = vocab.map((v) => escapeHtml(v.word));
    return paragraphs.map((p) => {
      let html = escapeHtml(p);
      blanks.forEach((w) => {
        if (!w) return;
        const blank = `<input type="text" data-answer="${w}" class="cloze-blank" />`;
        html = html.split(w).join(blank);
      });
      return html;
    });
  };
  // Modal / Zoom State
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const [isModalFlipped, setIsModalFlipped] = useState(false);

  useEffect(() => {
    const initWorkshop = async () => {
      try {
        setLoadingStep("正在生成范文填空练习...");
        const exercisePromise = generateWorkshopContent(article.content, vocabList, noteList);
        
        setLoadingStep("正在为生词自动配图与生成例句...");
        const vocabPromise = enrichVocabularyList(vocabList);

        const [exerciseData, vocabData] = await Promise.all([exercisePromise, vocabPromise]);

        setExercise(exerciseData);
        setEnrichedVocab(withPlaceholders(vocabData));
      } catch (e) {
        console.error("Workshop Init Failed", e);
      } finally {
        setLoading(false);
      }
    };
    initWorkshop();
  }, [article, vocabList, noteList]);

  // Keyboard Navigation for Modal
  useEffect(() => {
    if (focusedCardIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') handleNextCard();
        if (e.key === 'ArrowLeft') handlePrevCard();
        if (e.key === 'Escape') handleCloseModal();
        if (e.key === ' ' || e.key === 'Enter') setIsModalFlipped(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCardIndex, enrichedVocab.length]);

  const handleCardClick = (index: number) => {
    setFocusedCardIndex(index);
    setIsModalFlipped(false);
  };

  const handleCloseModal = () => {
    setFocusedCardIndex(null);
    setIsModalFlipped(false);
  };

  const handleNextCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (focusedCardIndex === null) return;
    setFocusedCardIndex((prev) => (prev! + 1) % enrichedVocab.length);
    setIsModalFlipped(false);
  };

  const handlePrevCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (focusedCardIndex === null) return;
    setFocusedCardIndex((prev) => (prev! - 1 + enrichedVocab.length) % enrichedVocab.length);
    setIsModalFlipped(false);
  };

  // --- Handlers for Share & Email ---

  const handleShare = async () => {
    const shareText = `我在《智读·精练》完成了文章《${article.title}》的深度精读！\n积累了 ${vocabList.length} 个核心生词，记录了 ${noteList.length} 条精读笔记。\n这是我的学习成果，推荐你也来试试 AI 辅助阅读！`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `智读·精练学习报告 - ${article.title}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error("Share failed", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert("学习成果已复制到剪贴板，快去分享给好友吧！");
      } catch (err) {
        alert("分享失败，请手动截图或复制。");
      }
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`《智读·精练》学习成果报告 - ${article.title}`);
    let bodyText = `【智读·精练 AI 学习成果报告】\n\n`;
    bodyText += `文章标题：《${article.title}》\n`;
    bodyText += `完成日期：${new Date().toLocaleString()}\n\n`;
    bodyText += `--- 学习概况 ---\n`;
    bodyText += `● 积累词汇：${vocabList.length} 个\n`;
    bodyText += `● 记录笔记：${noteList.length} 条\n\n`;
    
    if (vocabList.length > 0) {
        bodyText += `--- 重点生词回顾 ---\n`;
        vocabList.forEach((v, i) => {
            bodyText += `${i+1}. ${v.word} [${v.pinyin || ''}]\n   ${v.definition || '暂无释义'}\n\n`;
        });
    }

    if (noteList.length > 0) {
        bodyText += `--- 阅读笔记摘要 ---\n`;
        noteList.forEach((n, i) => {
            bodyText += `【笔记 ${i+1}】\n原文：${n.selectedText}\n解析：${n.aiAnalysis}\n\n`;
        });
    }
    
    bodyText += `\n此报告由 智读·精练 (SmartRead) AI 系统自动生成。`;
    
    const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoLink;
  };

  const handleDownloadNotes = () => {
    if (noteList.length === 0) {
      alert("暂无笔记可导出");
      return;
    }
    
    let content = `《${article.title}》阅读笔记\n`;
    content += `生成时间：${new Date().toLocaleDateString()}\n\n`;
    
    noteList.forEach((note, index) => {
      content += `【笔记 ${index + 1}】\n`;
      content += `原文片段：${note.selectedText}\n`;
      content += `AI 解析：${note.aiAnalysis}\n`;
      if (note.userComment) content += `我的心得：${note.userComment}\n`;
      content += `--------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${article.title}_精读笔记.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 导出导读大纲（使用 IntroVideo 已生成的脚本内容）
  const handleDownloadOutline = () => {
    if (!outline) {
      alert("请先在“文章导读”步骤生成导读大纲，然后返回此处导出。");
      return;
    }
    const now = new Date().toLocaleString();
    let content = `《${article.title}》导读大纲\n生成时间：${now}\n\n`;
    content += `1）开场导入\n${outline.intro}\n\n`;
    content += `2）文章大框架\n${outline.framework}\n\n`;
    content += `3）结构亮点\n${outline.highlights}\n\n`;
    content += `4）情感脉络\n${outline.emotion}\n\n`;
    content += `5）核心主题\n${outline.theme}\n\n`;
    content += `6）迁移延伸\n${outline.transfer}\n\n`;
    content += `提示：以上内容由 AI 生成，可在导读页重放或补充后重新导出。`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${article.title}_导读大纲.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Print Handlers ---

  const handlePrintFlashcards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = enrichedVocab.map(v => `
      <div class="card">
        <div class="img-container">
           ${v.imageUrl ? `<img src="${v.imageUrl}" />` : '<div class="no-img">暂无配图</div>'}
        </div>
        <div class="content">
          <h3>${v.word} <span class="pinyin">${v.pinyin || ''}</span></h3>
          <p class="def"><strong>释义：</strong>${v.definition || '暂无'}</p>
          <p class="ex"><strong>造句：</strong>${v.exampleSentence || '暂无'}</p>
        </div>
      </div>
    `).join('');

    const style = `
      body { font-family: 'Noto Serif SC', serif; padding: 20px; color: #1c1917; }
      h1 { text-align: center; color: #333; margin-bottom: 30px; font-family: serif; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; display: flex; gap: 15px; break-inside: avoid; page-break-inside: avoid; }
      .img-container { width: 100px; height: 100px; flex-shrink: 0; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden; }
      .img-container img { width: 100%; height: 100%; object-fit: cover; }
      .no-img { font-size: 12px; color: #999; }
      .content { flex: 1; }
      h3 { margin: 0 0 8px 0; color: #0f766e; font-size: 20px; }
      .pinyin { font-weight: normal; font-size: 14px; color: #666; margin-left: 8px; font-family: sans-serif; }
      p { margin: 4px 0; font-size: 14px; line-height: 1.4; }
      .def { color: #333; }
      .ex { color: #57534e; font-style: italic; margin-top: 8px; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    `;

    printWindow.document.write(`
      <html>
        <head><title>生词复习表 - ${article.title}</title><style>${style}</style></head>
        <body>
          <h1>生词复习表 - ${article.title}</h1>
          <div class="grid">${cardsHtml}</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintCloze = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const style = `
      body { font-family: 'KaiTi', 'STKaiti', '楷体', 'Noto Serif SC', serif; padding: 40px; line-height: 2.2; color: #1c1917; }
      h1 { text-align: center; margin-bottom: 10px; font-family: serif; }
      h2 { text-align: center; margin-bottom: 30px; font-size: 16px; color: #57534e; font-weight: normal; }
      .content { font-size: 18px; text-align: justify; white-space: pre-wrap; }
      input { border: none; border-bottom: 1px solid #333; width: 100px; display: inline-block; text-align: center; color: transparent; }
      .word-bank { margin-top: 60px; padding: 30px; border: 1px dashed #a8a29e; border-radius: 8px; }
      .tags { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-top: 15px; }
      .tag { padding: 8px 20px; border: 1px solid #d6d3d1; border-radius: 4px; font-size: 16px; }
      @media print {
        input { color: transparent; }
      }
    `;

    const contentHtml = clozeParagraphs
      ? clozeParagraphs
          .map((p) => `<p style="text-indent:2em; line-height:2.2; margin-bottom:18px;">${p}</p>`)
          .join("")
      : exercise?.originalClozeText;
    const title = "范文填空练习 (原文全文)";

    printWindow.document.write(`
      <html>
        <head><title>${title} - ${article.title}</title><style>${style}</style></head>
        <body>
          <h1>${title}</h1>
          <h2>《${article.title}》</h2>
          <div class="content">${contentHtml}</div>
          <div class="word-bank">
            <h3 style="text-align:center; margin:0; color:#444;">词汇参考库</h3>
            <div class="tags">
              ${enrichedVocab.map(v => `<span class="tag">${v.word}</span>`).join('')}
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-pulse space-y-6">
        <div className="relative">
             <div className="w-20 h-20 border-4 border-stone-200 border-t-teal-600 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center text-teal-600">
                <GraduationCap size={24} />
             </div>
        </div>
        <div className="text-center">
            <h2 className="text-2xl font-serif text-teal-900 font-bold mb-2">正在定制您的专属练习</h2>
            <p className="text-teal-600 font-medium">{loadingStep}</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 mb-4">生成失败，请检查网络设置或 Key。</p>
        <button onClick={onReset} className="text-teal-600 underline">返回</button>
      </div>
    );
  }

  const currentCard = focusedCardIndex !== null ? enrichedVocab[focusedCardIndex] : null;
  const clozeParagraphs =
    article.paragraphs && article.paragraphs.length > 0
      ? buildFullCloze(article.paragraphs, vocabList)
      : null;

  return (
    <div className="max-w-7xl mx-auto p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 border-b pb-6 gap-6">
        <div>
            <h1 className="text-4xl font-bold font-serif text-teal-900 mb-1">课后巩固工坊</h1>
            <p className="text-stone-500 text-lg">基于《${article.title}》的个性化深度学习方案</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
            <button 
                onClick={handleShare}
                className="flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-4 py-2.5 rounded-xl hover:bg-teal-100 border border-teal-100 transition shadow-sm font-semibold"
            >
                <Share2 size={18} /> 分享成果
            </button>
            <button 
                onClick={handleEmail}
                className="flex items-center gap-2 text-sm bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl hover:bg-stone-100 border border-stone-200 transition shadow-sm font-semibold"
            >
                <Mail size={18} /> 发送至邮箱
            </button>
            <button 
                onClick={handleDownloadOutline}
                className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl hover:bg-purple-100 border border-purple-100 transition shadow-sm font-semibold"
            >
                <FileText size={18} /> 导出导读大纲
            </button>
            <button 
                onClick={handleDownloadNotes}
                disabled={noteList.length === 0}
                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-100 border border-indigo-100 transition shadow-sm disabled:opacity-50 font-semibold"
            >
                <FileDown size={18} /> 导出笔记 ({noteList.length})
            </button>
            <button onClick={onReset} className="flex items-center gap-2 text-sm text-stone-500 hover:text-teal-600 px-4 py-2.5 bg-white border border-stone-200 rounded-xl transition shadow-sm font-semibold">
                <Rotate3d size={18} /> 精读下一篇
            </button>
        </div>
      </div>

      {/* Section 1: Flashcards (Vocabulary Review) */}
      {enrichedVocab.length > 0 && (
        <div className="mb-14 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3 text-amber-700">
                    <div className="p-2 bg-amber-100 rounded-xl"><GraduationCap size={28} /></div>
                    <h2 className="text-2xl font-bold">一、生词闪卡复习</h2>
                </div>
                <button 
                    onClick={handlePrintFlashcards}
                    className="flex items-center gap-2 text-sm bg-amber-50 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-100 border border-amber-100 transition font-bold"
                >
                    <Printer size={18} /> 打印/下载闪卡
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {enrichedVocab.map((vocab, index) => (
                    <div 
                        key={vocab.id} 
                        onClick={() => handleCardClick(index)}
                        className="relative h-72 w-full cursor-pointer group hover:-translate-y-2 transition-all duration-300"
                    >
                        <div className="w-full h-full bg-white rounded-2xl shadow-md hover:shadow-2xl border border-stone-100 overflow-hidden flex flex-col transition-all">
                            <div className="h-40 w-full bg-stone-50 relative overflow-hidden">
                                 {vocab.imageUrl ? (
                                    <img src={vocab.imageUrl} alt={vocab.word} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                 ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-stone-200">
                                        <ImageIcon size={40} />
                                    </div>
                                 )}
                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                     <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all drop-shadow-lg" size={40} />
                                 </div>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center p-4">
                                 <h3 className="text-2xl font-bold text-stone-800 font-serif mb-1 group-hover:text-amber-700 transition-colors">{vocab.word}</h3>
                                 {vocab.pinyin && <p className="text-stone-400 text-sm font-mono tracking-widest">{vocab.pinyin}</p>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Grid for Exercises */}
      <div className="pb-20">
        {exercise.originalClozeText || clozeParagraphs ? (
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-stone-100 flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3 text-indigo-700">
                        <div className="p-2 bg-indigo-50 rounded-xl"><FileText size={28} /></div>
                        <h2 className="text-3xl font-bold">二、原文填空背诵 (范文)</h2>
                    </div>
                    <button 
                        onClick={handlePrintCloze}
                        className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100"
                    >
                        <Printer size={18} /> 打印范文填空
                    </button>
                </div>
                
                <div className="flex items-center gap-3 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-8">
                    <Sparkles size={20} className="text-indigo-400 shrink-0" />
                    <p className="text-indigo-900 text-[15px] font-medium leading-relaxed">
                        AI 已识别原文中的精妙修辞、核心生词及逻辑转折点并进行了挖空处理。请尝试完整默写，深化对名篇表达逻辑的理解。
                    </p>
                </div>

                <div className="bg-stone-50 p-10 md:p-16 rounded-3xl leading-[3.2] text-xl md:text-2xl font-serif text-stone-800 border border-stone-200 shadow-inner">
                     <div 
                        className="cloze-content original-cloze whitespace-pre-wrap selection:bg-indigo-200 space-y-6" 
                        style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}
                     >
                        {clozeParagraphs
                          ? clozeParagraphs.map((html, idx) => (
                              <p
                                key={idx}
                                className="leading-relaxed tracking-wide"
                                style={{ textIndent: '2em', whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: html }}
                              />
                            ))
                          : (
                            <div dangerouslySetInnerHTML={{ __html: exercise.originalClozeText || '' }} />
                          )
                        }
                     </div>
                </div>

                <div className="mt-10 p-6 bg-white border border-stone-100 rounded-2xl">
                     <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookOpen size={14} /> 备选词汇库 (参考)
                     </h4>
                     <div className="flex flex-wrap gap-3">
                        {enrichedVocab.map(v => (
                            <span key={v.id} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-sm border border-stone-200">
                                {v.word}
                            </span>
                        ))}
                     </div>
                </div>
            </div>
        ) : (
            <div className="text-center p-20 bg-white rounded-3xl border border-dashed border-stone-200">
                 <Loader2 size={40} className="animate-spin text-stone-300 mx-auto mb-4" />
                 <p className="text-stone-400">正在努力生成练习内容...</p>
            </div>
        )}
      </div>

      {/* CARD ZOOM MODAL */}
      {focusedCardIndex !== null && currentCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/95 backdrop-blur-md animate-fade-in p-4" onClick={handleCloseModal}>
            <button onClick={handleCloseModal} className="absolute top-8 right-8 text-white/40 hover:text-white transition p-2 hover:bg-white/10 rounded-full"><X size={32} /></button>
            <button onClick={handlePrevCard} className="absolute left-6 md:left-12 text-white/40 hover:text-white transition p-4 hover:bg-white/10 rounded-full z-[110]"><ChevronLeft size={48} /></button>
            <button onClick={handleNextCard} className="absolute right-6 md:right-12 text-white/40 hover:text-white transition p-4 hover:bg-white/10 rounded-full z-[110]"><ChevronRight size={48} /></button>

            <div onClick={(e) => { e.stopPropagation(); setIsModalFlipped(!isModalFlipped); }} className="relative w-full max-w-2xl aspect-[3/2] cursor-pointer perspective-1000">
                <div className={`relative w-full h-full duration-700 preserve-3d transition-all transform rounded-3xl shadow-2xl ${isModalFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute w-full h-full bg-white rounded-3xl backface-hidden flex flex-col overflow-hidden">
                        <div className="h-2/3 w-full bg-stone-50 relative">
                             {currentCard.imageUrl ? (
                                <img src={currentCard.imageUrl} alt={currentCard.word} className="w-full h-full object-contain" />
                             ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-stone-200"><ImageIcon size={80} /></div>
                             )}
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center bg-white border-t border-stone-100">
                             {currentCard.pinyin && <p className="text-stone-400 text-xl font-mono mb-2 tracking-widest">{currentCard.pinyin}</p>}
                             <h3 className="text-5xl font-bold text-stone-800 font-serif">{currentCard.word}</h3>
                             <div className="mt-6 flex items-center gap-2 text-stone-300 text-sm font-sans">
                                <Rotate3d size={16} /> 点击翻转看解析
                             </div>
                        </div>
                    </div>
                    <div className="absolute w-full h-full bg-amber-50 rounded-3xl backface-hidden rotate-y-180 flex flex-col p-12 border-8 border-white shadow-inner justify-center overflow-y-auto text-center">
                        <div className="mb-10">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2"><BookOpen size={16} /> 核心释义</h4>
                            <p className="text-stone-800 font-bold text-3xl leading-relaxed font-serif">{currentCard.definition || "解析加载中..."}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 text-left max-w-lg mx-auto w-full">
                            <div className="bg-white/80 p-5 rounded-2xl border border-amber-100 shadow-sm">
                                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">文中语境</h4>
                                <p className="text-stone-700 text-lg italic font-serif leading-relaxed">“...{currentCard.context}...”</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .original-cloze input {
            border: none;
            border-bottom: 2px solid #c7d2fe;
            background: rgba(67, 56, 202, 0.03);
            width: 120px;
            text-align: center;
            font-weight: bold;
            color: #4338ca;
            margin: 0 4px;
            border-radius: 4px;
            transition: all 0.2s;
            line-height: 1.5;
            font-family: inherit;
        }
        .original-cloze input:focus {
            outline: none;
            border-bottom-color: #4338ca;
            background: rgba(67, 56, 202, 0.08);
            width: 140px;
        }
      `}</style>
    </div>
  );
};

export default Workshop;
