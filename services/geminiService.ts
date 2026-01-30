import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Vocabulary, Note, GeneratedExercise, ChatMessage, QuizQuestion, VideoScript } from "../types";

// Helper to get a fresh AI client instance
const getAiClient = () =>
  new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "" });

// 1. Analyze Selected Text
export const analyzeSelection = async (
  text: string,
  fullContext: string,
  gradeLevel: "primary" | "middle" = "middle"
): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return "API Key missing.";
  const ai = getAiClient();

  const prompt = `
    Task: Provide a concise literature analysis of the selected text in Chinese.
    
    Selected Text: "${text}"
    Context: ${fullContext.substring(0, 1000)}...

    Guidelines:
    1. NO Fluff: do not use intro phrases. Start directly.
    2. Structure:
       - Meaning: Explanation (1-2 sentences).
       - Expression: Technique/Emotion analysis.
    3. Style: Suitable for ${gradeLevel === "primary" ? "primary" : "middle"} school.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Unable to generate analysis. Please try again.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Analysis service is temporarily unavailable.";
  }
};

// 1.2 Convert Analysis to Teacher Script
export const generateTeacherScript = async (analysisText: string, originalText: string): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return analysisText;
  const ai = getAiClient();

  const prompt = `
      Task: Rewrite this literature analysis into a spoken teacher's explanation.
      Original: "${originalText}"
      Analysis: "${analysisText}"
      Tone: Gentle, educational. No brackets. Limit to 300 Chinese characters.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || analysisText;
  } catch (error) {
    return analysisText;
  }
};

// 1.2.1 Convert Outline Point to Teacher Lecture
export const generateOutlineExplanation = async (
  sectionTitle: string,
  sectionContent: string,
  articleTitle: string
): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return sectionContent;
  const ai = getAiClient();

  const prompt = `
    Role: A kind literature teacher.
    Task: Expand this outline point from a reading guide into a spoken "lecture" (3-5 sentences).
    Article: ${articleTitle}
    Section: ${sectionTitle}
    Original Content: "${sectionContent}"
    Instruction: Make it engaging, educational, and explain the significance. Limit to 400 characters.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || sectionContent;
  } catch (error) {
    return sectionContent;
  }
};

// 1.3 Proofread and Smart Format Text
export const proofreadText = async (text: string): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return text;
  const ai = getAiClient();

  const prompt = `
    Role: Professional Chinese Text Editor.
    Task: Standardize the provided Chinese text formatting.
    Text: "${text}"

    Strict rules:
    1. Return ONLY the formatted text. No explanations.
    2. Do not rewrite or summarize the content.
    3. Formatting:
       - Each paragraph starts with two full-width spaces.
       - Use full-width Chinese punctuation.
       - Merge broken lines mid-sentence.
       - Separate paragraphs with a blank line.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || text;
  } catch (error) {
    return text;
  }
};

// 1.4 Extract Difficult Vocabulary
export const extractDifficultVocabulary = async (text: string): Promise<Vocabulary[]> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return [];
  const ai = getAiClient();

  const prompt = `Identify 6-8 challenging vocabulary words from: "${text.substring(0, 1500)}..." Output JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  difficulty: { type: Type.NUMBER },
                  exampleSentence: { type: Type.STRING },
                  contextHint: { type: Type.STRING },
                  context: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const textResult = response.text;
    if (!textResult) return [];

    const data = JSON.parse(textResult);
    const rawList = data.words || [];
    return rawList.map((item: any, index: number) => ({
      id: `auto-vocab-${Date.now()}-${index}`,
      word: item.word,
      pinyin: item.pinyin,
      definition: item.definition,
      partOfSpeech: item.partOfSpeech,
      difficulty: item.difficulty,
      exampleSentence: item.exampleSentence,
      contextHint: item.contextHint,
      context: item.context || item.word,
    }));
  } catch (error) {
    return [];
  }
};

// 1.4.1 Generate Vocabulary Quiz
export const generateVocabQuiz = async (vocabList: Vocabulary[]): Promise<QuizQuestion[]> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return [];
  if (vocabList.length === 0) return [];
  const ai = getAiClient();

  const words = vocabList.map((v) => v.word).join(", ");
  const prompt = `Create a 4-6 question quiz (JSON) for these words: ${words}. Include multiple choice and true/false questions.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["choice", "judge"] },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  relatedWord: { type: Type.STRING },
                },
                required: ["id", "type", "question", "correctAnswer", "explanation"],
              },
            },
          },
        },
      },
    });

    const textResult = response.text;
    if (!textResult) return [];
    const data = JSON.parse(textResult);
    return data.questions || [];
  } catch (e) {
    return [];
  }
};

// 1.5 Video Script Generation
export const generateVideoScript = async (articleContent: string): Promise<VideoScript | null> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return null;
  const ai = getAiClient();

  const prompt = `
    You are an expert Chinese literature designer. Analyze the article structure and provide a 6-dimensional guided reading outline.
    
    Article Content: "${articleContent.substring(0, 2000)}..."

    JSON Object only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intro: { type: Type.STRING, description: "Lead-in" },
            framework: { type: Type.STRING, description: "Article structure" },
            highlights: { type: Type.STRING, description: "Key highlights" },
            emotion: { type: Type.STRING, description: "Emotional arc" },
            theme: { type: Type.STRING, description: "Core theme" },
            transfer: { type: Type.STRING, description: "Transfer/extension" },
          },
          required: ["intro", "framework", "highlights", "emotion", "theme", "transfer"],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) return null;
    const data = JSON.parse(textResult);
    const fallback = "Processing, please try again later.";
    return {
      intro: data.intro || fallback,
      framework: data.framework || fallback,
      highlights: data.highlights || fallback,
      emotion: data.emotion || fallback,
      theme: data.theme || fallback,
      transfer: data.transfer || fallback,
    };
  } catch (error) {
    console.error("Video Script Gen Error:", error);
    return null;
  }
};

// 1.6 Get Pinyin
export const getPinyin = async (text: string): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return text;
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide pinyin for this text. Return pinyin only: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

// 1.7 Extract Text From Image
export const extractTextFromImage = async (base64: string, mimeType: string): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return "";
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: "Please extract Chinese text from this image. Return text only with no explanation." },
          ],
        },
      ],
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};

export const speakWithBrowserTTS = (text: string) => {
  if (typeof window === "undefined") return false;
  const t = text?.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!t) return false;

  const synth = window.speechSynthesis;
  if (!synth) return false;

  // 停止当前播放，避免叠音
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(t);
  utter.lang = "zh-CN"; // 你是中文学习产品，明确指定
  utter.rate = 0.95;
  utter.pitch = 1.0;

  synth.speak(utter);
  return true;
};


// 1.8 Synthesize Speech
export const synthesizeSpeech = async (text: string): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return null;
  if (!text) return null;

  // 1) normalize + remove zero-width chars
  const safeText = text
  .replace(/[\u200B-\u200D\uFEFF]/g, "")
  .replace(/\s+/g, " ")
  .trim();

  if (!safeText) return null;

  // ✅ 短文本：让前端走浏览器 TTS（最稳）
  if (safeText.length <= 12) {
    return null;
  }

  // 2) Make short snippets more "sentence-like"
  const isCJK = /[\u4E00-\u9FFF]/.test(safeText);
  const endsWithPunc = /[。！？.!?…]$/.test(safeText);

  // 对中文词语/短句：更激进地补标点（否则很容易不出 AUDIO）
  const audioPrompt =
    !endsWithPunc && safeText.length < 12
      ? `${safeText}${isCJK ? "。" : "."}`
      : safeText;

  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: audioPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      console.warn("synthesizeSpeech: No candidate returned.", { safeText, audioPrompt });
      return null;
    }

    if (candidate.finishReason === "SAFETY") {
      console.warn("synthesizeSpeech: Blocked by safety filter.", { safeText, audioPrompt });
      return null;
    }

    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      // AUDIO inlineData
      if (part.inlineData?.data) return part.inlineData.data;
    }

    // If we got here: model responded, but did not include AUDIO
    console.warn("synthesizeSpeech: No audio inlineData found.", {
      finishReason: candidate.finishReason,
      safeText,
      audioPrompt,
      partsSummary: parts.map((p: any) => ({
        hasText: !!p.text,
        hasInlineData: !!p.inlineData,
        inlineMime: p.inlineData?.mimeType,
      })),
    });

    return null;
  } catch (error) {
    console.error("synthesizeSpeech: Error during generation", error, { safeText, audioPrompt });
    return null;
  }
};

// 1.9 Generate Workshop Content
export const generateWorkshopContent = async (
  content: string,
  vocabList: Vocabulary[],
  noteList: Note[]
): Promise<GeneratedExercise> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY)
    return { clozeText: "", writingPrompt: "", writingTips: [] };
  const ai = getAiClient();
  const prompt = `
        Based on the article, vocab list, and reading notes, create a language exercise.
        Article: ${content.substring(0, 2000)}
        Vocab: ${vocabList.map((v) => v.word).join(", ")}
        Notes: ${noteList.map((n) => n.selectedText).join(", ")}
        
        Requirements:
        1. clozeText: short summary with 3-5 blanks. Blank format: <input type="text" data-answer="answer" />
        2. originalClozeText: same text with blanks at key vocab/expressions (at least 5).
        3. writingPrompt: one writing prompt based on the article theme.
        4. writingTips: 3 writing tips.
        
        Return JSON.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clozeText: { type: Type.STRING },
            originalClozeText: { type: Type.STRING },
            writingPrompt: { type: Type.STRING },
            writingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["clozeText", "originalClozeText", "writingPrompt", "writingTips"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { clozeText: "", originalClozeText: "", writingPrompt: "", writingTips: [] };
  }
};

// 1.10 Enrich Vocabulary List
export const enrichVocabularyList = async (vocabList: Vocabulary[]): Promise<Vocabulary[]> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return vocabList;
  if (vocabList.length === 0) return vocabList;
  const ai = getAiClient();
  const words = vocabList.map((v) => v.word).join(", ");
  const prompt = `Provide detailed definition, pinyin, part of speech, difficulty (1-3), and example sentence for: ${words}. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enriched: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  difficulty: { type: Type.NUMBER },
                  exampleSentence: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });
    const data = JSON.parse(response.text || "{}");
    const enriched = data.enriched || [];

    return vocabList.map((v) => {
      const extra = enriched.find((e: any) => e.word === v.word);
      return { ...v, ...extra };
    });
  } catch (e) {
    return vocabList;
  }
};

// 1.11 Get Writing Guidance
export const getWritingGuidance = async (
  prompt: string,
  draft: string,
  query: string,
  history: ChatMessage[],
  articleContext: string
): Promise<{ reply: string; draftContent?: string }> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return { reply: "API Key missing." };
  const ai = getAiClient();

  const msg = `History: ${JSON.stringify(history)} \nStudent query/content: ${query}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: msg,
      config: {
        systemInstruction: `
You are a Chinese writing tutor helping a student with the prompt: ${prompt}.
Reference article (truncated): ${articleContext.substring(0, 500)}
Current draft: ${draft}
Goal: encourage, guide, or help refine the draft.
If you rewrite content for the student, return it in the JSON field draftContent.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Reply to the student (comfort/guide/suggest)" },
            draftContent: { type: Type.STRING, description: "Suggested text to add to the draft (optional)" },
          },
          required: ["reply"],
        },
      },
    });
    return JSON.parse(response.text || '{"reply": "Please try again later."}');
  } catch (e) {
    return { reply: "Connection is unstable, please try again later." };
  }
};

// 1.12 Generate Article Cover Image
export const generateArticleCoverImage = async (title: string, content: string): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) return null;
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `Create a 16:9 cover image for article "${title}". Style: Chinese aesthetic or modern illustration. Content hint: ${content.substring(
              0,
              300
            )}`,
          },
        ],
      },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) return null;

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
