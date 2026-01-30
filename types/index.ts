
export interface Vocabulary {
  id: string;
  word: string;
  pinyin?: string;
  definition: string;
  context: string; // The sentence where it appeared
  imageUrl?: string;
  exampleSentence?: string; // A new sentence created by AI
  
  // Rich Metadata for Learning Mode
  partOfSpeech?: string; // e.g., "形容词"
  difficulty?: number;   // 1-3 stars
  contextHint?: string;  // e.g., "文中用来形容..."
}

export interface QuizQuestion {
  id: string;
  type: 'choice' | 'judge';
  question: string;
  options?: string[];
  correctAnswer: string; // For choice: option text; For judge: "true"/"false"
  explanation: string;
  relatedWord: string;
}

export interface VideoScript {
  intro: string;       // 1. 开头 (5s)
  framework: string;   // 2. 文章大框架 (20s)
  highlights: string;  // 3. 结构亮点 (20s)
  emotion: string;     // 4. 情绪路径 (15s)
  theme: string;       // 5. 主旨 (15s)
  transfer: string;    // 6. 迁移 (10-15s)
}

export interface Note {
  id: string;
  selectedText: string;
  aiAnalysis: string;
  userComment?: string;
}

export interface Article {
  title: string;
  content: string;
  paragraphs: string[];
}

export interface GeneratedExercise {
  clozeText: string; // HTML string with inputs (summary version)
  originalClozeText?: string; // HTML string with inputs (original article version)
  writingPrompt: string;
  writingTips: string[];
}

export enum AppStep {
  EDITOR = 'EDITOR',
  INTRO_VIDEO = 'INTRO_VIDEO',
  VOCAB_LEARNING = 'VOCAB_LEARNING',
  READING = 'READING',
  WORKSHOP = 'WORKSHOP'
}

export interface SelectionRange {
  text: string;
  paragraphIndex: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}
