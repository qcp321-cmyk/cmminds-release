
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioResponse, BeYouUserDetails, BeYouPersonaResponse, ChatMessage, DifficultyLevel } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCENARIO_MODEL = "gemini-3-pro-preview"; 
const LITE_MODEL = "gemini-3-flash-preview";
const ULTRA_LITE_MODEL = "gemini-flash-lite-latest"; 
const SPEECH_MODEL = "gemini-2.5-flash-preview-tts";
const IMAGE_MODEL = "gemini-2.5-flash-image";

let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return sharedAudioCtx;
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(
    data.buffer,
    data.byteOffset,
    Math.floor(data.byteLength / 2)
  );
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const translateEngineResult = async (humanized: string, summary: string, targetLanguage: string, deepDive?: string): Promise<{ humanized: string, summary: string, deepDive?: string }> => {
  const ai = getAI();
  const prompt = `Translate the following educational content into ${targetLanguage}. Maintain the academic tone and technical precision. Output ONLY JSON.
  Humanized Briefing: "${humanized}"
  Summary: "${summary}"
  ${deepDive ? `Deep Dive: "${deepDive}"` : ''}`;

  try {
    const response = await ai.models.generateContent({
      model: ULTRA_LITE_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            humanized: { type: Type.STRING },
            summary: { type: Type.STRING },
            deepDive: { type: Type.STRING }
          },
          required: ["humanized", "summary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Translation Error:", error);
    return { humanized, summary, deepDive };
  }
};

export const generateScenario = async (topic: string, grade: string, difficulty: DifficultyLevel = 'MEDIUM'): Promise<ScenarioResponse> => {
  const ai = getAI();
  const prompt = `Target Audience: Grade ${grade} Student. Topic: "${topic}". Difficulty: ${difficulty}. Create a modern learning module that eliminates rote memorization. STRICT PLAIN TEXT. Output JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: SCENARIO_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 12000 },
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            role: { type: Type.STRING },
            objective: { type: Type.STRING },
            scenario: { type: Type.STRING },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            quote: { type: Type.STRING },
          },
          required: ["explanation", "examples", "role", "objective", "scenario", "steps", "quote"],
        },
      },
    });
    return { ...JSON.parse(response.text || '{}'), difficulty } as ScenarioResponse;
  } catch (error) {
    console.error("Scenario Gen Error:", error);
    throw error;
  }
};

export const engineOceanQuery = async (query: string, grade: string, marks: string, difficulty: string = 'Standard', isSyllabusMode: boolean = false): Promise<any> => {
  const ai = getAI();
  const isUniversity = grade === 'University' || parseInt(grade) >= 12;
  
  let syllabusDirective = "";
  if (isSyllabusMode && isUniversity) {
    syllabusDirective = `SYLLABUS MODE ACTIVE: Reconstruct the entire curriculum for "${query}" as a definitive 'CURRICULUM SYNERGY: 8-SEMESTER ROADMAP'. 
    Divide the course into 8 distinct semesters with high-impact execution-driven modules for each. 
    Format this as a child node of a University/Higher Ed academic structure.`;
  } else if (isSyllabusMode) {
    syllabusDirective = "SYLLABUS MODE ACTIVE: Provide a comprehensive multi-year curriculum roadmap for this academic topic suitable for schooling levels.";
  }

  const prompt = `Perform an Exhaustive Educational Resolution for Query: "${query}".
  Parameters: Academic Node: ${grade}, Marks Expectation: ${marks}, Difficulty Bias: ${difficulty}.
  
  ${syllabusDirective}

  STRICT INSTRUCTIONS:
  1. CONTENT DEPTH: Provide a massive, high-fidelity resolution (3x longer than normal). Ensure the depth reflects a ${marks}-mark academic weightage.
  2. STRUCTURE: Use clear, bold-text style headers: ABSTRACT, CORE MECHANICS, MULTIDIMENSIONAL ANALYSIS, VISUALISATION, ACADEMIC REFERENCES, ${isSyllabusMode ? 'CURRICULUM SYNERGY' : ''}. 
  3. NO SPECIAL CHARACTERS: Do not use #, *, _, [, ], or complex markdown symbols. Use plain text spacing for formatting.
  4. VISUALS: Mandatory. Under the VISUALISATION section, provide a highly detailed textual description that will be paired with an AI image.
  5. TONALITY: Highest intelligence, elite academic reasoning.
  
  JSON Schema: { "humanized": "Full exhaustive plain-text briefing", "summary": "One-line AI engine meta-perspective" }`;

  try {
    const response = await ai.models.generateContent({
      model: SCENARIO_MODEL, 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            humanized: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["humanized", "summary"]
        }
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      humanized: parsed.humanized || "Resolution failed to initialize.",
      summary: parsed.summary || "AI Engine Offline.",
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Ocean Query Error:", error);
    throw error;
  }
};

export const deepDiveQuery = async (originalQuery: string, context: string): Promise<string> => {
  const ai = getAI();
  const prompt = `Deep dive: "${originalQuery}". Context: "${context.substring(0, 500)}". NO MARKDOWN. PLAIN TEXT. NO SPECIAL CHARACTERS.`;
  
  try {
    const response = await ai.models.generateContent({
      model: LITE_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.2 }
    });
    return response.text || "Deep dive failed.";
  } catch (e) { return "Nexus depth limit reached."; }
};

export const generateSpeech = async (text: string, targetLanguage: string = 'English'): Promise<AudioBuffer | null> => {
  if (!text || text.trim().length === 0) return null;
  
  const ai = getAI();
  try {
    const safeText = text
      .replace(/[*#_~`>\[\]\(\)\/\\|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); 
    
    const prompt = `Speak the following clearly in ${targetLanguage}: ${safeText}`;

    const response = await ai.models.generateContent({
      model: SPEECH_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Zephyr' } 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
    if (!base64Audio) return null;
    
    const audioContext = getAudioCtx();
    return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
  } catch (error) {
    console.error("Speech Gen Error:", error);
    return null;
  }
};

export const generateFounderRemark = async (content: string, type: 'OCEAN' | 'SCENARIO'): Promise<{ remark: string, quote: string }> => {
  const ai = getAI();
  const prompt = `Analyze: ${content.substring(0, 300)}. Type: ${type}. JSON: {remark, quote}`;
  try {
    const response = await ai.models.generateContent({
      model: ULTRA_LITE_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            remark: { type: Type.STRING },
            quote: { type: Type.STRING }
          },
          required: ["remark", "quote"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { remark: "Focus on application.", quote: "Synthesis is the only path." };
  }
};

export const globalChatResponse = async (message: string, history: ChatMessage[]) => {
    const ai = getAI();
    const contents = [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }];
    const response = await ai.models.generateContent({
        model: ULTRA_LITE_MODEL, 
        contents: contents,
        config: { systemInstruction: "CuriousMinds Assistant. Fast, sharp, concise.", temperature: 0.5 }
    });
    return response.text;
}

export const generateAssessmentQuestions = async (details: BeYouUserDetails): Promise<string[]> => {
  const ai = getAI();
  const prompt = `User: ${JSON.stringify(details)}. 5 deep questions for success prediction. JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: LITE_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Assessment Questions Error:", error);
    return ["What is your primary motivation?", "How do you handle pressure?", "What is your legacy?", "What is success?", "Which tech excites you?"];
  }
};

export const generateBeYouPersona = async (details: BeYouUserDetails, qaPairs: {question: string, answer: string}[]): Promise<BeYouPersonaResponse> => {
  const ai = getAI();
  const prompt = `User: ${JSON.stringify(details)}. Answers: ${JSON.stringify(qaPairs)}. 
  Map "Cognitive Gap". Output JSON: roadmap (strategic milestones), systemInstruction (Challenging Future Self), initialGreeting (Empowering).`;

  try {
    const response = await ai.models.generateContent({
      model: SCENARIO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmap: { type: Type.STRING },
            systemInstruction: { type: Type.STRING },
            initialGreeting: { type: Type.STRING }
          },
          required: ["roadmap", "systemInstruction", "initialGreeting"]
        }
      }
    });
    return JSON.parse(response.text || "{}") as BeYouPersonaResponse;
  } catch (error) {
    console.error("BeYou Persona Gen Error:", error);
    throw error;
  }
};

export const chatWithPersona = async (systemInstruction: string, history: ChatMessage[], message: string): Promise<string> => {
  const ai = getAI();
  const contents = [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }];
  try {
    const response = await ai.models.generateContent({
      model: LITE_MODEL,
      contents: contents,
      config: { systemInstruction: `${systemInstruction}. Challenge intellectual depth. No small talk.`, temperature: 0.7 }
    });
    return response.text || "Signal interference. Please retry.";
  } catch (error) {
    console.error("Persona Chat Error:", error);
    return "The future self node is temporarily offline.";
  }
};

export const generateMissionImage = async (prompt: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: `A clean, academic whiteboard sketch or schematic diagram of: ${prompt}. High clarity, minimalist, technical drawing style.` }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return "";
  } catch (error) {
    console.error("Mission Image Gen Error:", error);
    return "";
  }
};
