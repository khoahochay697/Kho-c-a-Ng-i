
import React, { useState, useRef } from 'react';
import type { Scene, ComicImage } from '../types';
import { splitStoryIntoScenes, generateSceneImage, editImageWithPrompt } from '../services/geminiService';
import { fileToBase64, markApiKeyAsInvalid } from '../services/utils';
import { Spinner } from './Spinner';
import { Modal } from './Modal';
import { NextIcon, MagicIcon, UploadIcon, EditIcon, TrashIcon, RetryIcon, ZoomInIcon } from './icons';
// Note: JSZip would be required for the download all functionality.
// import JSZip from 'jszip'; 

interface SceneStepProps {
    apiKey: string | null;
    referenceImages: string[];
    scenes: Scene[];
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
    onNext: () => void;
}

export const SceneStep: React.FC<SceneStepProps> = ({ apiKey, referenceImages, scenes, setScenes, onNext }) => {
    const [storyText, setStoryText] = useState('');
    const [numScenes, setNumScenes] = useState('');
    const [isSplitting, setIsSplitting] = useState(false);
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingImage, setEditingImage] = useState<{sceneId: string, image: ComicImage} | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<string | null>(null);

    const handleSplitScenes = async () => {
        if (!apiKey || !storyText) {
            setError("Vui lòng nhập nội dung truyện và đảm bảo API key đã được cấu hình.");
            return;
        }
        setIsSplitting(true);
        setError(null);
        try {
            const sceneDescriptions = await splitStoryIntoScenes(apiKey, storyText, numScenes ? parseInt(numScenes) : undefined);
            const newScenes: Scene[] = sceneDescriptions.map((desc, i) => ({
                id: `scene-${Date.now()}-${i}`,
                description: desc,
                images: [],
            }));
            setScenes(newScenes);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (apiKey && (errorMessage.toLowerCase().includes('api key') || errorMessage.includes('403') || errorMessage.includes('permission denied'))) {
                 markApiKeyAsInvalid(apiKey);
                 setError("API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn một key khác ở Bước 1.");
            } else {
                setError("Phân chia cảnh thất bại. Vui lòng thử lại.");
            }
        } finally {
            setIsSplitting(false);
        }
    };
    
    const updateImageStatus = (sceneId: string, imageId: string, newStatus: ComicImage['status'], newUrl?: string) => {
        setScenes(prevScenes => prevScenes.map(scene => {
            if (scene.id === sceneId) {
                return {
                    ...scene,
                    images: scene.images.map(img => {
                        if (img.id === imageId) {
                            const isSelected = newStatus === 'done' ? true : img.isSelected;
                            return { ...img, status: newStatus, url: newUrl ?? img.url, isSelected };
                        }
                        return img;
                    })
                };
            }
            return scene;
        }));
    };

    const runImageGeneration = async (scene: Scene, image: ComicImage, isRetry: boolean) => {
        if (!apiKey || !referenceImages.length) {
            setError("Cần có API key và ít nhất một ảnh tham chiếu để tạo ảnh.");
            updateImageStatus(scene.id, image.id, 'error');
            return;
        }
        if (!isRetry) {
             updateImageStatus(scene.id, image.id, 'generating');
        }
        try {
            const prompt = `Tạo một khung truyện tranh với nhân vật từ ảnh tham chiếu. Bối cảnh: ${scene.description}. Giữ nguyên phong cách và ngoại hình nhân vật.`;
            const newImageBase64 = await generateSceneImage(apiKey, referenceImages, prompt);
            updateImageStatus(scene.id, image.id, 'done', newImageBase64);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
             if (errorMessage.toLowerCase().includes('api key') || errorMessage.includes('403') || errorMessage.includes('permission denied')) {
                markApiKeyAsInvalid(apiKey);
                setError("API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn một key khác ở Bước 1.");
            } else {
                 setError(`Tạo ảnh cho cảnh "${scene.description.substring(0, 20)}..." thất bại.`);
            }
            updateImageStatus(scene.id, image.id, 'error');
        }
    };
    
    const handleBatchGenerate = async () => {
        setIsBatchGenerating(true);
        setError(null);
    
        const placeholders: { sceneId: string, image: ComicImage }[] = [];
        const scenesWithPlaceholders = scenes.map(scene => {
            const shouldGenerate = scene.images.every(img => img.status !== 'done' && img.status !== 'generating');
            if (shouldGenerate) {
                const placeholder: ComicImage = {
                    id: `img-${Date.now()}-${Math.random()}`,
                    url: '',
                    isSelected: true, 
                    status: 'generating',
                    duration: 3,
                };
                placeholders.push({ sceneId: scene.id, image: placeholder });
                // Replace existing images (like error placeholders) with a new generating one
                return { ...scene, images: [placeholder] };
            }
            return scene;
        });
        setScenes(scenesWithPlaceholders);
    
        // Now, iterate sequentially and generate.
        for (const scene of scenes) {
            const placeholderInfo = placeholders.find(p => p.sceneId === scene.id);
            if (placeholderInfo) {
                await runImageGeneration(scene, placeholderInfo.image, false);
            }
        }
    
        setIsBatchGenerating(false);
    };
    
    const handleRetryGenerate = (sceneId: string, imageId: string) => {
        const scene = scenes.find(s => s.id === sceneId);
        const image = scene?.images.find(i => i.id === imageId);
        if (scene && image) {
            updateImageStatus(sceneId, imageId, 'generating');
            runImageGeneration(scene, image, true);
        }
    };

    const handleDeleteImage = (sceneId: string, imageId: string) => {
        setScenes(prevScenes => prevScenes.map(scene => {
            if (scene.id === sceneId) {
                return { ...scene, images: scene.images.filter(img => img.id !== imageId) };
            }
            return scene;
        }));
    };

    const handleToggleSelectImage = (sceneId: string, imageId: string) => {
        setScenes(prevScenes => prevScenes.map(scene => {
            if (scene.id === sceneId) {
                return {
                    ...scene,
                    images: scene.images.map(img => img.id === imageId ? { ...img, isSelected: !img.isSelected } : img)
                };
            }
            return scene;
        }));
    };

    const handleUploadClick = (sceneId: string) => {
        setUploadTarget(sceneId);
        fileInputRef.current?.click();
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && uploadTarget) {
            try {
                 const files = Array.from(e.target.files);
                 const base64Promises = files.map((file: File) => fileToBase64(file));
                 const base64Images = await Promise.all(base64Promises);
                 
                const newImages: ComicImage[] = base64Images.map(base64 => ({
                    id: `img-${Date.now()}-${Math.random()}`,
                    url: base64,
                    isSelected: true,
                    status: 'done',
                    duration: 3, // Default duration
                }));

                setScenes(prevScenes => prevScenes.map(scene => {
                    if (scene.id === uploadTarget) {
                        return { ...scene, images: [...scene.images, ...newImages] };
                    }
                    return scene;
                }));
            } catch (error) {
                setError('Tải ảnh lên thất bại.');
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        setUploadTarget(null);
    };
    
    const openEditModal = (sceneId: string, image: ComicImage) => {
        setEditingImage({ sceneId, image });
        setEditPrompt('');
    };

    const handleEditImage = async () => {
        if (!apiKey || !editingImage || !editPrompt) return;
        setIsEditing(true);
        setError(null);
        try {
            const { sceneId, image } = editingImage;
            const newImageBase64 = await editImageWithPrompt(apiKey, image.url, 'image/png', editPrompt);
            setScenes(prevScenes => prevScenes.map(scene => {
                if (scene.id === sceneId) {
                    return {
                        ...scene,
                        images: scene.images.map(img => img.id === image.id ? { ...img, url: newImageBase64 } : img)
                    };
                }
                return scene;
            }));
            setEditingImage(null);
        } catch (error: unknown) {
             const errorMessage = error instanceof Error ? error.message : String(error);
             if (apiKey && (errorMessage.toLowerCase().includes('api key') || errorMessage.includes('403') || errorMessage.includes('permission denied'))) {
                markApiKeyAsInvalid(apiKey);
                setError("API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn một key khác ở Bước 1.");
            } else {
                setError("Chỉnh sửa ảnh thất bại.");
            }
        } finally {
            setIsEditing(false);
        }
    };
    
    const handleDownloadAll = () => {
        alert("Chức năng này cần thư viện JSZip để hoạt động. Trong bản demo này, vui lòng tải ảnh thủ công.");
    };

    const allScenesHaveAtLeastOneImage = scenes.length > 0 && scenes.every(s => s.images.some(i => i.status === 'done'));

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-primary-400 text-center">Bước 3: Tạo ảnh từ cảnh truyện</h2>
            <p className="text-slate-400 mb-8 text-center max-w-2xl mx-auto">Nhập nội dung truyện của bạn, ứng dụng sẽ tự động phân tích và tạo ra các khung cảnh tương ứng.</p>

            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 mb-8">
                <textarea value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="Nhập nội dung câu chuyện của bạn vào đây..." rows={6} className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 mb-4"></textarea>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="number" value={numScenes} onChange={e => setNumScenes(e.target.value)} placeholder="Số lượng cảnh (tùy chọn)" className="flex-1 p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500" />
                    <button onClick={handleSplitScenes} disabled={isSplitting || !apiKey} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-600">
                        {isSplitting ? <><Spinner /> Đang phân tích...</> : "Phân chia cảnh"}
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg my-6 text-center">{error}</div>}
             <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            {scenes.length > 0 && (
                <div>
                     <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-xl font-semibold">Danh sách cảnh</h3>
                        <div className="flex gap-2">
                             <button onClick={handleDownloadAll} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Tải ảnh đã chọn</button>
                             <button onClick={handleBatchGenerate} disabled={isBatchGenerating || !apiKey} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 disabled:bg-slate-600">
                                {isBatchGenerating ? <><Spinner /> Đang tạo...</> : <><MagicIcon className="w-4 h-4" /> Bắt đầu tạo tất cả ảnh</>}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {scenes.map((scene, index) => (
                            <div key={scene.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <div className="mb-3">
                                    <h4 className="font-bold text-lg text-primary-400">Cảnh {index + 1}</h4>
                                    <p className="text-slate-300 text-sm">{scene.description}</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {scene.images.map(image => (
                                        <div key={image.id} className="relative group aspect-square bg-slate-800 rounded-md flex items-center justify-center">
                                            {image.status === 'generating' && <div className="flex flex-col items-center text-slate-400"><Spinner /> Đang tạo...</div>}
                                            {image.status === 'error' && (
                                                <div className="p-2 text-center">
                                                    <p className="text-red-400 text-xs mb-2">Tạo lỗi</p>
                                                    <button onClick={() => handleRetryGenerate(scene.id, image.id)} className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-full"><RetryIcon className="w-5 h-5"/></button>
                                                </div>
                                            )}
                                            {image.status === 'done' && (
                                                 <>
                                                    <img src={`data:image/png;base64,${image.url}`} alt={`Ảnh cho cảnh ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                                                        <button onClick={() => setViewingImage(image.url)} title="Phóng to" className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><ZoomInIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => openEditModal(scene.id, image)} title="Chỉnh sửa" className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><EditIcon className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDeleteImage(scene.id, image.id)} title="Xóa" className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                    <input type="checkbox" checked={image.isSelected} onChange={() => handleToggleSelectImage(scene.id, image.id)} className="absolute top-2 right-2 form-checkbox h-5 w-5 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500" />
                                                 </>
                                            )}
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => handleUploadClick(scene.id)} 
                                        className="group aspect-square bg-slate-800 rounded-md flex items-center justify-center border-2 border-dashed border-slate-600 hover:border-primary-500 hover:bg-slate-700 transition-all"
                                    >
                                        <div className="text-center text-slate-500 group-hover:text-primary-400">
                                            <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                                            <span className="text-sm font-semibold">Thêm ảnh</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end mt-12">
                <button onClick={onNext} disabled={!allScenesHaveAtLeastOneImage} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Bước 4: Tạo Video <NextIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <Modal isOpen={!!editingImage} onClose={() => setEditingImage(null)} title="Chỉnh sửa ảnh bằng AI" showCloseButton={false}>
                <div className="space-y-4">
                    <p className="text-slate-300">Nhập mô tả để AI tạo lại hình ảnh này.</p>
                    <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-primary-500 focus:border-primary-500"></textarea>
                    <div className="text-right">
                         <button onClick={handleEditImage} disabled={isEditing || !apiKey} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-600">
                           {isEditing ? <><Spinner /> Đang xử lý...</> : "Tạo lại ảnh"}
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={!!viewingImage} onClose={() => setViewingImage(null)} title="Xem ảnh">
                {viewingImage && <img src={`data:image/png;base64,${viewingImage}`} alt="Xem trước ảnh" className="w-full h-auto rounded-lg" />}
            </Modal>
        </div>
    );
};
