import React, { useState, useRef } from 'react';
import { generateImageFromText } from '../services/geminiService';
import { fileToBase64, markApiKeyAsInvalid, parseGeminiError } from '../services/utils';
import { Spinner } from './Spinner';
import { UploadIcon, MagicIcon, NextIcon } from './icons';

interface CharacterStepProps {
    apiKey: string | null;
    referenceImages: string[];
    setReferenceImages: (images: string[]) => void;
    onNext: () => void;
}

export const CharacterStep: React.FC<CharacterStepProps> = ({ apiKey, referenceImages, setReferenceImages, onNext }) => {
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const base64Promises = files.map((file: File) => fileToBase64(file));
            try {
                const base64Images = await Promise.all(base64Promises);
                setReferenceImages([...referenceImages, ...base64Images]);
            } catch (err) {
                setError("Không thể tải tệp lên. Vui lòng thử lại.");
            }
        }
    };

    const handleGenerateClick = async () => {
        if (!apiKey || !characterPrompt) {
            setError("Vui lòng nhập mô tả nhân vật và đảm bảo API key đã được cấu hình.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const imageBytes = await generateImageFromText(apiKey, `A full-body character reference sheet for a comic book character. Description: ${characterPrompt}. Style: clean lines, simple colors, white background.`);
            setGeneratedImage(imageBytes);
        } catch (err: unknown) {
            const friendlyError = parseGeminiError(err);
            if (apiKey && friendlyError.toLowerCase().includes('api key')) {
                 markApiKeyAsInvalid(apiKey);
            }
            setError(friendlyError);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const addGeneratedToReferences = () => {
        if(generatedImage){
            setReferenceImages([...referenceImages, generatedImage]);
            setGeneratedImage(null);
        }
    }
    
    const removeReferenceImage = (index: number) => {
        setReferenceImages(referenceImages.filter((_, i) => i !== index));
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-primary-400 text-center">Bước 2: Tạo nhân vật tham chiếu</h2>
            <p className="text-slate-400 mb-8 text-center max-w-2xl mx-auto">Tải lên hoặc dùng AI để tạo hình ảnh nhân vật chính. Những ảnh này sẽ được dùng để giữ sự nhất quán trong các cảnh truyện.</p>
            
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-center">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4 text-center">Tải lên ảnh có sẵn</h3>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-600 rounded-lg hover:bg-slate-800 hover:border-primary-500 transition-colors">
                        <UploadIcon className="w-10 h-10 text-slate-500 mb-2" />
                        <span className="text-slate-400">Nhấp để chọn nhiều ảnh</span>
                    </button>
                </div>

                {/* AI Generation Section */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-xl font-semibold mb-4 text-center">Tạo nhân vật bằng AI</h3>
                    <textarea value={characterPrompt} onChange={e => setCharacterPrompt(e.target.value)} placeholder="Mô tả nhân vật (vd: chàng trai tóc xanh, mặc áo khoác phi công, mắt màu hổ phách...)" rows={3} className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 mb-4"></textarea>
                    <button onClick={handleGenerateClick} disabled={isLoading || !apiKey} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed">
                        {isLoading ? <><Spinner /> Đang tạo...</> : <><MagicIcon className="w-5 h-5" /> Tạo nhân vật</>}
                    </button>
                </div>
            </div>

            {(generatedImage || referenceImages.length > 0) && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-center">Ảnh tham chiếu</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {referenceImages.map((img, index) => (
                            <div key={index} className="relative group">
                                <img src={`data:image/png;base64,${img}`} alt={`Reference ${index + 1}`} className="rounded-lg aspect-square object-cover" />
                                <button onClick={() => removeReferenceImage(index)} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                            </div>
                        ))}
                        {generatedImage && (
                            <div className="border-2 border-dashed border-primary-500 rounded-lg p-2 flex flex-col items-center justify-center gap-2">
                                <img src={`data:image/png;base64,${generatedImage}`} alt="Generated Character" className="rounded-lg aspect-square object-cover" />
                                <button onClick={addGeneratedToReferences} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 text-sm rounded-md w-full">Thêm vào bộ tham chiếu</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="flex justify-end mt-12">
                <button onClick={onNext} disabled={referenceImages.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Tiếp tục <NextIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};