'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Article } from '../types';
import { BookOpen, FileText, ArrowRight, Upload, Loader2, Sparkles, ChevronRight, Wand2 } from 'lucide-react';
import { extractTextFromImage, proofreadText } from '../services/geminiService';

interface EditorProps {
  onComplete: (article: Article) => void;
  initialData?: Article | null;
}

const Editor: React.FC<EditorProps> = ({ onComplete, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [hasFormatted, setHasFormatted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfjsRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    import('pdfjs-dist').then((pdfjs) => {
      if (!mounted) return;
      pdfjsRef.current = pdfjs;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    });
    return () => {
      mounted = false;
    };
  }, []);

  const loadExample = () => {
      setTitle("荷塘月色（节选）");
      setContent("　　这几天心里颇不宁静。今晚在院子里坐着乘凉，忽然想起日日走过的荷塘，在这满月的光里，总该另有一番样子吧。月亮渐渐地升高了，墙外马路上孩子们的欢笑，已经听不见了；妻在屋里拍着闰儿，朦胧地哼着眠歌。我悄悄地披上大衫，带上门出去。\n\n　　沿着荷塘，是一条曲折的小煤屑路。这是一条幽僻的路；白天也少人走，夜晚更加寂寞。荷塘四面，长着许多树，蓊蓊郁郁的。路灯是些没精打采的盏儿，经过这里，更是有些惨淡了。\n\n　　曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。层层的叶子中间，零星地点缀着些白花，有袅娜地开着的，有羞涩地打着朵儿的；正如一粒粒的明珠，又如碧天里的星星，又如刚出浴的美人。微风过处，送来缕缕清香，仿佛远处高楼上渺茫的歌声似的处理。");
      setHasFormatted(true);
  };

  const autoFormatTextRegex = (raw: string): string => {
    // Standardize line breaks and remove existing indentation
    let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^[ \t\u3000]+/gm, '');
    // Standardize Chinese punctuation
    text = text.replace(/([\u4e00-\u9fa5]),/g, '$1，').replace(/,([\u4e00-\u9fa5])/g, '，$1');
    text = text.replace(/([\u4e00-\u9fa5])\./g, '$1。').replace(/([\u4e00-\u9fa5])\?/g, '$1？');
    // Split into paragraphs and add standard full-width double space indentation
    const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    return paragraphs.map(p => `　　${p}`).join('\n\n');
  };

  const handleStart = () => {
    if (!title.trim() || !content.trim()) return;
    const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    onComplete({ title, content, paragraphs });
  };

  const handleSmartFormat = async () => {
      if (!content.trim()) return;
      setIsFormatting(true);
      try {
          const aiFormatted = await proofreadText(content);
          // Post-process with local formatter to guarantee 2-space indentation for every paragraph
          const finalFormatted = autoFormatTextRegex(aiFormatted);
          setContent(finalFormatted);
          setHasFormatted(true);
      } catch (e) {
          alert("AI 排版失败");
      } finally {
          setIsFormatting(false);
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    setProcessStatus('读取中...');
    try {
        if (file.type === 'application/pdf') {
            const pdfjsLib = pdfjsRef.current;
            if (!pdfjsLib) {
              throw new Error('PDF library not ready. Please try again.');
            }
            const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                fullText += (await (await pdf.getPage(i)).getTextContent()).items.map((item: any) => item.str).join('') + '\n\n';
            }
            setContent(autoFormatTextRegex(fullText));
        } else if (file.type.startsWith('image/')) {
             const reader = new FileReader();
             reader.onload = async (e) => {
                const text = await extractTextFromImage((e.target?.result as string).split(',')[1], file.type);
                if (text) setContent(autoFormatTextRegex(text));
                setIsProcessingFile(false);
             };
             reader.readAsDataURL(file);
             return; 
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                setContent(autoFormatTextRegex(e.target?.result as string));
                setIsProcessingFile(false);
            };
            reader.readAsText(file);
            return;
        }
    } catch (error) { alert("读取失败"); } finally { if (!file.type.startsWith('image/')) setIsProcessingFile(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-teal-800 mb-2 font-serif" style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}>智读·精练</h1>
        <p className="text-stone-500">AI 驱动的交互式精读伴侣</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 relative">
        <div className="flex justify-between items-end mb-6">
             <h2 className="text-xl font-bold text-stone-700 font-serif">准备阅读材料</h2>
             <div className="flex items-end gap-3">
                <button 
                    onClick={loadExample}
                    className="flex items-center gap-2 text-sm text-stone-400 hover:text-teal-600 px-3 py-2 transition font-medium"
                >
                    <Wand2 size={16} /> 试试示例
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                {!hasFormatted ? (
                    <>
                        <button onClick={handleSmartFormat} disabled={isFormatting || isProcessingFile} className="flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-4 py-2 rounded-lg hover:bg-teal-100 transition border border-teal-100 font-bold disabled:opacity-50">
                            {isFormatting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isFormatting ? "排版中..." : "AI 智能排版"}
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100 font-semibold disabled:opacity-50">
                            <Upload size={16} /> {isProcessingFile ? processStatus : "导入素材"}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100 font-semibold disabled:opacity-50">
                                <Upload size={16} /> 重新导入
                            </button>
                        </div>
                        <button onClick={handleStart} className="text-xs text-stone-400 hover:text-teal-600 underline underline-offset-4 flex items-center gap-1">
                            直接进入导读 <ChevronRight size={10} />
                        </button>
                    </div>
                )}
             </div>
        </div>
        <div className="mb-6">
          <label className="block text-stone-700 font-semibold mb-2 font-serif">文章标题</label>
          <input type="text" value={title} onChange={(e) => {setTitle(e.target.value); setHasFormatted(false);}} className="w-full text-2xl font-bold p-3 border-b-2 border-teal-100 focus:border-teal-500 outline-none transition-colors" placeholder="请输入标题..." />
        </div>
        <div className="mb-8">
          <label className="block text-stone-700 font-semibold mb-2 flex items-center gap-2"><FileText size={18} /> 文章正文</label>
          <textarea value={content} onChange={(e) => {setContent(e.target.value); setHasFormatted(false);}} className="w-full h-96 p-6 text-xl leading-relaxed text-stone-800 bg-stone-50 rounded-lg border border-stone-200 focus:ring-2 focus:ring-teal-200 outline-none resize-none" style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }} placeholder="粘贴内容或点击导入..." />
        </div>
        <div className="flex justify-end">
          <button onClick={handleStart} disabled={!content.trim()} className="bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-2">
            <BookOpen size={20} /> 开始导读 <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
