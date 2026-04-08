import { GoogleGenAI } from "@google/genai";
import { UserProfile, PerformanceRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getMentorInsight(profile: UserProfile, recentPerformance: any[]) {
  const prompt = `
    You are an elite JEE/NEET mentor. Your tone is sharp, professional, and highly motivating (not soft).
    User Profile:
    - Exam: ${profile.exam}
    - Completed Lectures: ${profile.completedLectures.length}
    
    Recent Performance Data:
    ${JSON.stringify(recentPerformance)}
    
    Provide 3 actionable, high-impact insights for the user to improve. 
    Focus on:
    1. Study consistency.
    2. Subject balance.
    3. Learning progress.
    
    Return the response in JSON format:
    {
      "insights": [
        { "title": "string", "description": "string", "type": "weakness" | "speed" | "competitive" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("Mentor insight error:", error);
    return { insights: [] };
  }
}

export async function solveDoubt(image?: string, text?: string) {
  const prompt = `
    You are a top-tier JEE/NEET doubt solver. 
    Analyze the following question and provide a step-by-step elite solution.
    Question: ${text || "See attached image"}
  `;

  try {
    const contents: any = { parts: [{ text: prompt }] };
    if (image) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/png",
          data: image.split(',')[1]
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents
    });
    return response.text;
  } catch (error) {
    console.error("Doubt solving error:", error);
    return "I'm having trouble analyzing this right now. Please try again.";
  }
}
