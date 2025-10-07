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
        const prompt = `Nhiệm vụ của bạn là hoạt động như một công cụ phân cảnh cho họa sĩ truyện tranh. Đọc câu chuyện được cung cấp và chia nó thành ${numScenes ? numScenes : 'vài'} cảnh chính. Đối với MỖI cảnh, hãy tạo một mô tả **chỉ để vẽ**, không phải là văn bản tường thuật. Mô tả này phải ngắn gọn, tập trung vào các yếu tố HÌNH ẢNH: hành động, biểu cảm của nhân vật, và bối cảnh xung quanh. TUYỆT ĐỐI KHÔNG sao chép hoặc diễn giải lại các câu từ câu chuyện gốc. Chỉ trả về một mảng JSON hợp lệ chứa các chuỗi mô tả này. \n\nVí dụ đầu ra đúng: ["Cô bé quàng khăn đỏ đang đi bộ trên con đường mòn trong một khu rừng rậm rạp.", "Một con sói gian ác đang nấp sau một cái cây, nhìn cô bé.", "Cô bé gõ cửa một ngôi nhà nhỏ bằng gỗ."]\n\nCâu chuyện: "${story}"`;
        
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
        // Throw the original error instead of falling back to a simple split.
        // This allows the UI to catch it and display a proper error message (e.g., about an invalid API key).
        throw error;
    }
};