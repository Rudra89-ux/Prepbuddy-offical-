import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const AIService = {
  getGroupInsights: async (messages: string[], exam: string) => {
    const prompt = `Analyze the following discussion within a ${exam} study group and provide 3 key insights or focus areas for the students.
    Discussion:
    ${messages.join('\n')}
    
    Insights should be actionable and specific to ${exam} syllabus.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  },

  generateChallenge: async (exam: 'JEE' | 'NEET', topic: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for high-yield ${topic} concepts for ${exam} students and generate a set of 3 challenging MCQ questions with explanations.
      The questions should be exactly at the current ${exam} difficulty level.`,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse AI challenge", e);
      return [];
    }
  }
};
