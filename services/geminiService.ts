// NOTE: The @google/genai package is not directly available in this environment.
// The code is written assuming it will be run in an environment where this package is installed.
import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAiClient = (apiKey: string): GoogleGenAI => {
    if (!apiKey) {
        throw new Error("API Key is not set.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateImageFromText = async (apiKey: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("Không thể tạo ảnh từ AI.");
    } catch (error) {
        console.error("Lỗi khi tạo ảnh:", error);
        throw error;
    }
};


export const editImageWithPrompt = async (apiKey: string, base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("Không thể chỉnh sửa ảnh bằng AI.");

    } catch (error) {
        console.error("Lỗi khi chỉnh sửa ảnh:", error);
        throw error;
    }
};

export const generateSceneImage = async (apiKey: string, referenceImages: string[], prompt: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        
        const imageParts = referenceImages.map(base64Image => ({
            inlineData: {
                data: base64Image,
                // Assume png/jpeg, a more robust solution might check mime type
                mimeType: 'image/png' 
            }
        }));
        
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [...imageParts, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("Không thể tạo ảnh cho cảnh.");

    } catch (error) {
        console.error("Lỗi khi tạo ảnh cảnh:", error);
        throw error;
    }
};

export const splitStoryIntoScenes = async (apiKey: string, story: string, numScenes?: number): Promise<string[]> => {
    try {
        const ai = getAiClient(apiKey);
        const prompt = `Hãy đọc câu chuyện sau. Chia nó thành ${numScenes ? numScenes : 'vài'} cảnh để vẽ truyện tranh. Với mỗi cảnh, hãy viết một mô tả **trực quan** ngắn gọn, tập trung vào hành động, nhân vật và bối cảnh. **Không** trích dẫn trực tiếp từ câu chuyện. Trả về kết quả dưới dạng một mảng JSON các chuỗi. \n\nVí dụ: ["Một chàng trai tóc xanh đang đứng trên đỉnh đồi, nhìn về phía hoàng hôn.", "Chàng trai đó đang chiến đấu với một con rồng lửa trong một hang động tối."]\n\nCâu chuyện: "${story}"`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                        description: "Mô tả trực quan của một cảnh để vẽ."
                    }
                }
            }
        });
        
        const jsonString = response.text.trim();
        const scenes = JSON.parse(jsonString);
        if (Array.isArray(scenes) && scenes.every(s => typeof s === 'string')) {
            return scenes;
        }
        throw new Error("Phản hồi từ AI không đúng định dạng mảng chuỗi.");

    } catch (error) {
        console.error("Lỗi khi phân chia cảnh:", error);
        // Fallback to simple split if AI fails
        const sentences = story.match(/[^.!?]+[.!?]+/g) || [];
        const desiredScenes = numScenes || Math.max(1, Math.ceil(sentences.length / 3));
        const scenes: string[] = [];
        const sentencesPerScene = Math.ceil(sentences.length / desiredScenes);
        for (let i = 0; i < sentences.length; i += sentencesPerScene) {
            scenes.push(sentences.slice(i, i + sentencesPerScene).join(' ').trim());
        }
        return scenes.filter(s => s.length > 0);
    }
};