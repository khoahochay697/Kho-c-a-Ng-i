import React, { useState, useRef } from 'react';
import { generateImageFromText, editImageWithPrompt } from '../services/geminiService';
import { fileToBase64, markApiKeyAsInvalid, parseGeminiError } from '../services/utils';
import { Spinner } from './Spinner';
import { Modal } from './Modal';
import { UploadIcon, MagicIcon, NextIcon, EditIcon, TrashIcon, ZoomInIcon, DownloadIcon } from './icons';
import type { ComicImage } from '../types';


interface CharacterStepProps {
    apiKey: string | null;
    referenceImages: string[];
    setReferenceImages: (images: string[]) => void;
    onNext: () => void;
}

export const CharacterStep: React.FC<CharacterStepProps> = ({ apiKey, referenceImages, setReferenceImages, onNext }) => {
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [generatedImages, setGeneratedImages] = useState<ComicImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingImage, setEditingImage] = useState<ComicImage | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);

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
        
        const newImagePlaceholder: ComicImage = {
            id: `gen-img-${Date.now()}`,
            url: '',
            isSelected: false,
            status: 'generating',
            duration: 3,
        };
        setGeneratedImages(prev => [...prev, newImagePlaceholder]);

        try {
            const imageBytes = await generateImageFromText(apiKey, `A full-body character reference sheet for a comic book character. Description: ${characterPrompt}. Style: clean lines, simple colors, white background.`);
            setGeneratedImages(prev => prev.map(img => 
                img.id === newImagePlaceholder.id ? { ...img, url: imageBytes, status: 'done' } : img
            ));
        } catch (err: unknown) {
            const friendlyError = parseGeminiError(err);
            if (apiKey && friendlyError.toLowerCase().includes('api key')) {
                 markApiKeyAsInvalid(apiKey);
            }
            setError(friendlyError);
            setGeneratedImages(prev => prev.map(img => 
                img.id === newImagePlaceholder.id ? { ...img, status: 'error' } : img
            ));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const addGeneratedToReferences = (imageToAdd: ComicImage) => {
        if(imageToAdd.url && !referenceImages.includes(imageToAdd.url)){
            setReferenceImages([...referenceImages, imageToAdd.url]);
        }
    }
    
    const removeReferenceImage = (index: number) => {
        setReferenceImages(referenceImages.filter((_, i) => i !== index));
    }

    const handleDeleteGeneratedImage = (id: string) => {
        setGeneratedImages(prev => prev.filter(img => img.id !== id));
    };

    const handleToggleSelectImage = (id: string) => {
        setGeneratedImages(prev => prev.map(img => 
            img.id === id ? { ...img, isSelected: !img.isSelected } : img
        ));
    };

    const openEditModal = (image: ComicImage) => {
        setEditingImage(image);
        setEditPrompt('');
    };

    const handleEditImage = async () => {
        if (!apiKey || !editingImage || !editPrompt) return;
        setIsEditing(true);
        setError(null);
        try {
            const { id, url } = editingImage;
            const newImageBase64 = await editImageWithPrompt(apiKey, url, 'image/png', editPrompt);
            setGeneratedImages(prev => prev.map(img => 
                img.id === id ? { ...img, url: newImageBase64 } : img
            ));
            setEditingImage(null);
        } catch (error: unknown) {
            const friendlyError = parseGeminiError(error);
             if (apiKey && friendlyError.toLowerCase().includes('api key')) {
                markApiKeyAsInvalid(apiKey);
            }
            setError(friendlyError);
        } finally {
            setIsEditing(false);
        }
    };
    
    const handleDownloadSelected = () => {
        const selectedImages = generatedImages.filter(img => img.isSelected && img.status === 'done');
        if (selectedImages.length === 0) {
            alert("Vui lòng chọn ít nhất một ảnh đã tạo để tải xuống.");
            return;
        }
        alert(`Chức năng này cần thư viện JSZip để hoạt động. Trong bản demo này, vui lòng tải ảnh thủ công. Bạn đã chọn ${selectedImages.length} ảnh.`);
        // Note: JSZip implementation would go here.
    };

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

            {generatedImages.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Ảnh đã tạo bằng AI</h3>
                        <button onClick={handleDownloadSelected} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <DownloadIcon className="w-4 h-4" /> Tải ảnh đã chọn
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {generatedImages.map(image => (
                            <div key={image.id} className="relative group aspect-square bg-slate-800 rounded-md flex items-center justify-center border-2 border-transparent data-[status=generating]:border-primary-500 data-[status=generating]:animate-pulse data-[status=error]:border-red-500" data-status={image.status}>
                                {image.status === 'generating' && <div className="flex flex-col items-center text-slate-400"><Spinner /> Đang tạo...</div>}
                                {image.status === 'error' && (
                                    <div className="p-2 text-center">
                                        <p className="text-red-400 text-xs mb-2">Tạo lỗi</p>
                                        <button onClick={() => handleDeleteGeneratedImage(image.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full" title="Xóa"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                )}
                                {image.status === 'done' && (
                                    <>
                                        <img src={`data:image/png;base64,${image.url}`} alt="Generated Character" className="w-full h-full object-cover rounded-md" />
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-1">
                                            <div className="flex gap-1">
                                                <button onClick={() => setViewingImage(image.url)} title="Phóng to" className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><ZoomInIcon className="w-4 h-4"/></button>
                                                <button onClick={() => openEditModal(image)} title="Chỉnh sửa" className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteGeneratedImage(image.id)} title="Xóa" className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                            <button onClick={() => addGeneratedToReferences(image)} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-1 px-3 text-xs rounded-md w-full max-w-[90%]">Thêm vào tham chiếu</button>
                                        </div>
                                        <input type="checkbox" checked={image.isSelected} onChange={() => handleToggleSelectImage(image.id)} className="absolute top-2 right-2 form-checkbox h-5 w-5 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500" />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {referenceImages.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-center">Bộ ảnh tham chiếu (dùng cho bước 3)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {referenceImages.map((img, index) => (
                            <div key={index} className="relative group">
                                <img src={`data:image/png;base64,${img}`} alt={`Reference ${index + 1}`} className="rounded-lg aspect-square object-cover" />
                                <button onClick={() => removeReferenceImage(index)} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa khỏi bộ tham chiếu">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex justify-end mt-12">
                <button onClick={onNext} disabled={referenceImages.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Tiếp tục <NextIcon className="w-5 h-5"/>
                </button>
            </div>

            <Modal isOpen={!!editingImage} onClose={() => setEditingImage(null)} title="Chỉnh sửa ảnh bằng AI" showCloseButton={false}>
                <div className="space-y-4">
                    {editingImage && <img src={`data:image/png;base64,${editingImage.url}`} alt="Editing preview" className="rounded-lg max-h-64 mx-auto" />}
                    <p className="text-slate-300">Nhập mô tả để AI tạo lại hình ảnh này.</p>
                    <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={3} placeholder="Ví dụ: thêm một chiếc mũ màu đỏ" className="w-full p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-primary-500 focus:border-primary-500"></textarea>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setEditingImage(null)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
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
