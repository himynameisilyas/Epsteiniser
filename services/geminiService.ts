
import { GoogleGenAI, Type } from "@google/genai";
import { RedactionResult } from "../types";

export const detectPeople = async (base64Image: string): Promise<RedactionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            text: "Detect every face in this image. Return their bounding boxes in a normalized [ymin, xmin, ymax, xmax] format (values from 0 to 1000). Focus specifically on the head and facial area. Only return valid JSON."
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          boxes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                box_2d: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax]"
                },
                label: { type: Type.STRING }
              },
              required: ["box_2d"]
            }
          }
        },
        required: ["boxes"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as RedactionResult;
};
