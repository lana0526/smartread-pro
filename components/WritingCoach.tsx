'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Article, ChatMessage } from '../types';
import { Bot, User, Send, ChevronDown, ChevronUp, Sparkles, BookOpen, PenTool, Layout, Wand2, ArrowLeft, Feather, Rotate3d, Loader2 } from 'lucide-react';
import { getWritingGuidance } from '../services/geminiService';

interface WritingCoachProps {
  prompt: string;
  tips: string[];
  article: Article;
  onExit: () => void;
  onReset: () => void;
}

const WritingCoach: React.FC<WritingCoachProps> = ({ prompt, tips, article, onExit, onReset }) => {
  const [draft, setDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isArticleExpanded, setIsArticleExpanded] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Initial Trigger for Phase 1 (Auto-start)
  useEffect(() => {
      if (!hasInitialized.current && chatMessages.length === 0) {
          hasInitialized.current = true;
          // Send a hidden system message to trigger the AI's Phase 1 output
          handleSendMessage("[SYSTEM_START]", true); 
      }
  }, []);

  const handleSendMessage = async (textOverride?: string, isHidden: boolean = false) => {
    const query = textOverride || inputQuery;
    if (!query.trim()) return;

    // Add user message to UI only if NOT hidden
    if (!isHidden) {
        const userMsg: ChatMessage = { role: 'user', text: query };
        setChatMessages(prev => [...prev, userMsg]);
    }
    
    if (!textOverride) setInputQuery("");
    setIsTyping(true);

    try {
        // Call AI Service
        // Note: We pass the *visible* history + the current query (even if hidden) to the AI
        const { reply, draftContent } = await getWritingGuidance(
            prompt, 
            draft, 
            query, 
            chatMessages, 
            article.content
        );

        setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
        
        // If AI generated draft content (organized user input), append it to the editor
        if (draftContent) {
            setDraft(prev => {
                const separator = prev.length > 0 && !prev.endsWith('\n') ? '\n' : '';
                return prev + separator + draftContent;
            });
        }
    } catch (e) {
        setChatMessages(prev => [...prev, { role: 'ai', text: "连接似乎断开了，请重试。" }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleQuickAction = (action: 'start' | 'review' | 'vocab') => {
      let query = "";
      if (action === 'start') query = "我还没有思路，我不确定怎么开始。"; // Mapped to trigger Phase 1 or 2 naturally
      if (action === 'review') query = "请帮我点评一下我现在写的内容，有哪些地方可以优化？";
      if (action === 'vocab') query = "针对这个题目，有哪些好词好句或者成语推荐我使用吗？";
      
      handleSendMessage(query);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col animate-fade-in font-sans">
        
        {/* Modern Glassy Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-6 py-3 flex justify-between items-center z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onExit} 
                    className="p-2 -ml-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
                    title="退出写作"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="font-bold text-stone-800 text-lg flex items-center gap-2 font-serif">
                        <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Feather size={16} /></span>
                        AI 写作辅导室
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <div className="hidden md:flex items-center gap-3 text-sm text-stone-500">
                    <span className="px-3 py-1 bg-stone-100 rounded-full border border-stone-200 truncate max-w-xs font-serif">
                        题目：{prompt}
                    </span>
                 </div>
                 <button 
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-stone-500 hover:text-teal-600 text-sm font-medium hover:bg-stone-100 rounded-lg transition"
                 >
                    <Rotate3d size={14} /> <span className="hidden sm:inline">开始新的一篇</span>
                 </button>
            </div>
        </div>

        {/* Main Workspace Split */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left Panel: Context Sidebar */}
            <div className="w-80 md:w-96 bg-white border-r border-stone-200 hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Prompt Card */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl opacity-50 blur group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative bg-white p-5 rounded-xl border border-indigo-50 shadow-sm">
                            <h3 className="text-indigo-900 font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                                <PenTool size={12} /> 写作题目
                            </h3>
                            <p className="text-stone-800 font-serif text-lg leading-relaxed">{prompt}</p>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100/50">
                        <h3 className="text-amber-700 font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={12} /> 灵感锦囊
                        </h3>
                        <ul className="space-y-3">
                            {tips.map((tip, idx) => (
                                <li key={idx} className="text-sm text-stone-700 flex gap-3 leading-relaxed">
                                    <span className="text-amber-400 mt-0.5">•</span> {tip}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Article Accordion */}
                    <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                        <button 
                            onClick={() => setIsArticleExpanded(!isArticleExpanded)}
                            className="w-full flex justify-between items-center p-4 bg-white hover:bg-stone-50 transition text-stone-600 font-bold text-sm"
                        >
                            <span className="flex items-center gap-2"><BookOpen size={14}/> 原文参考</span>
                            {isArticleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {isArticleExpanded && (
                            <div className="p-4 max-h-80 overflow-y-auto bg-stone-50/50 text-stone-600 text-sm leading-7 font-serif whitespace-pre-wrap border-t border-stone-100">
                                {article.content}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Editor & Chat */}
            <div className="flex-1 flex flex-col h-full relative bg-stone-50/50">
                
                {/* Editor Area (Top 60%) */}
                <div className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">
                    <div className="max-w-4xl w-full mx-auto h-full flex flex-col bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden ring-1 ring-black/5 transition-shadow hover:shadow-md">
                        {/* Editor Toolbar */}
                        <div className="px-6 py-3 border-b border-stone-100 flex justify-between items-center bg-white">
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                <Layout size={12} /> 写作画板
                            </span>
                            <div className="px-2 py-1 bg-stone-100 rounded text-xs text-stone-500 font-mono">
                                {draft.length} 字
                            </div>
                        </div>
                        
                        {/* Textarea */}
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="flex-1 w-full p-8 text-xl leading-loose outline-none resize-none font-serif text-stone-800 placeholder-stone-300"
                            placeholder="在这里开始挥洒你的文采..."
                            style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif', textIndent: '2em' }}
                        />
                    </div>
                </div>

                {/* AI Chat Area (Bottom 40%) - Floating Panel Style */}
                <div className="h-[40%] bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] flex flex-col z-20">
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gradient-to-b from-stone-50 to-white">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                {msg.role === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 mt-1">
                                        <Bot size={16} className="text-indigo-600"/>
                                    </div>
                                )}
                                
                                <div className={`px-5 py-3 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                    msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-sm' 
                                    : 'bg-white text-stone-700 border border-stone-100 rounded-bl-sm'
                                }`}>
                                    {msg.text}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0 mt-1">
                                        <User size={16} className="text-stone-500"/>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                             <div className="flex gap-4 justify-start animate-fade-in">
                                 <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100"><Bot size={16} className="text-indigo-600"/></div>
                                 <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-stone-100 flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-150"></span>
                                 </div>
                             </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-stone-100">
                        {/* Quick Actions */}
                        <div className="flex gap-3 mb-4 overflow-x-auto pb-1 no-scrollbar justify-center">
                            {[
                                { id: 'start', label: '我没思路', icon: Layout, color: 'emerald' },
                                { id: 'vocab', label: '推荐词汇', icon: BookOpen, color: 'amber' },
                                { id: 'review', label: '点评润色', icon: Wand2, color: 'indigo' },
                            ].map((action: any) => (
                                <button 
                                    key={action.id}
                                    onClick={() => handleQuickAction(action.id)}
                                    disabled={isTyping || (action.id === 'review' && draft.length < 5)}
                                    className={`
                                        flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5
                                        bg-${action.color}-50 text-${action.color}-700 border border-${action.color}-100
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                                    `}
                                >
                                    <action.icon size={12} /> {action.label}
                                </button>
                            ))}
                        </div>

                        {/* Input Bar */}
                        <div className="max-w-3xl mx-auto flex items-center gap-3 bg-stone-50 rounded-full px-5 py-2.5 border border-stone-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all shadow-inner">
                            <input 
                                type="text"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="和 AI 聊聊你的想法..."
                                className="flex-1 bg-transparent outline-none text-sm text-stone-700 placeholder-stone-400"
                                disabled={isTyping}
                            />
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={!inputQuery.trim() || isTyping}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:bg-stone-300 transition-all shadow-md hover:shadow-lg"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default WritingCoach;