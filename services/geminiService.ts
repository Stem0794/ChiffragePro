import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY;

export const generateQuoteItems = async (projectDescription: string, rates: Record<string, number>) => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const ratesString = Object.entries(rates).map(([role, price]) => `- ${role}: ${price}€/day`).join('\n');

  const prompt = `
    Based on the following project description, create a structured quote.
    
    Here are the available Roles and their Daily Rates (TJM):
    ${ratesString}

    Project Description: "${projectDescription}"
    
    Instructions:
    1. Organize the work into logical Sections (e.g., "1. Conception", "2. Development", "3. Deployment").
    2. For each Section, list specific Line Items (features or tasks).
    3. For each Line Item, estimate the time (in days) required for EACH appropriate role.
       (e.g., A "Login Page" might need 0.5 days of UX Designer and 1.5 days of Developer).
    
    Keep descriptions professional and concise (in French).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Section title (e.g. '1. Conception')" },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        description: { type: Type.STRING, description: "Task description" },
                        details: {
                          type: Type.OBJECT,
                          description: "Map of Role Name to Days",
                          // Since schema for map values isn't strictly typed in Type.OBJECT easily for dynamic keys, 
                          // we rely on the prompt instructions. However, we can try to structure it or just parse whatever valid JSON comes out.
                          nullable: false
                        }
                      },
                      required: ["description", "details"],
                    }
                  }
                },
                required: ["title", "items"],
              },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text || typeof text !== 'string') return [];
    
    const data = JSON.parse(text);
    return data.sections || [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};