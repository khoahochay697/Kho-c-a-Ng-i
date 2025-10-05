import React, { useState, useEffect } from 'react';
import { SavedApiKey } from '../types';
import { KeyIcon, PlusIcon, TrashIcon, ExclamationCircleIcon } from './icons';
import { clearApiKeyStatus } from '../services/utils';


interface ApiKeyStepProps {
    onKeySelect: (key: string | null) => void;
    activeKeyValue: string | null;
}

export const ApiKeyStep: React.FC<ApiKeyStepProps> = ({ onKeySelect, activeKeyValue }) => {
    const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
    const [isAddingKey, setIsAddingKey] = useState(false);
    const [instructionsVisible, setInstructionsVisible] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    
    const loadKeysFromStorage = () => {
         try {
            const storedKeys = localStorage.getItem('geminiApiKeysList');
            if (storedKeys) {
                const parsedKeys = JSON.parse(storedKeys);
                setSavedKeys(parsedKeys);
                if (parsedKeys.length === 0 && !isAddingKey) {
                    setIsAddingKey(true);
                }
            } else {
                setIsAddingKey(true);
            }
        } catch (error) {
            console.error("Failed to parse API keys from storage:", error);
            setSavedKeys([]);
            setIsAddingKey(true);
        }
    };

    useEffect(() => {
        loadKeysFromStorage();
        
        window.addEventListener('apiKeysUpdated', loadKeysFromStorage);

        return () => {
            window.removeEventListener('apiKeysUpdated', loadKeysFromStorage);
        };
    }, []);

    const saveKeysToStorage = (keys: SavedApiKey[]) => {
        localStorage.setItem('geminiApiKeysList', JSON.stringify(keys));
    };

    const handleAddKey = () => {
        if (newKeyName.trim() && newKeyValue.trim()) {
            const newKey: SavedApiKey = {
                id: `key-${Date.now()}`,
                name: newKeyName.trim(),
                value: newKeyValue.trim(),
            };
            const updatedKeys = [...savedKeys, newKey];
            setSavedKeys(updatedKeys);
            saveKeysToStorage(updatedKeys);
            setIsAddingKey(false);
            setNewKeyName('');
            setNewKeyValue('');
        }
    };

    const handleDeleteKey = (id: string) => {
        const keyToDelete = savedKeys.find(key => key.id === id);
        if (keyToDelete?.value === activeKeyValue) {
            onKeySelect(null);
        }
        const updatedKeys = savedKeys.filter(key => key.id !== id);
        setSavedKeys(updatedKeys);
        saveKeysToStorage(updatedKeys);
        if (updatedKeys.length === 0) {
            setIsAddingKey(true);
        }
    };

    const handleUseKey = (key: SavedApiKey) => {
        if (key.status === 'invalid') {
            clearApiKeyStatus(key.value);
        }
        onKeySelect(key.value);
    };

    const handleCancelAdd = () => {
        setIsAddingKey(false);
        setNewKeyName('');
        setNewKeyValue('');
    };

    return (
        <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold mb-4 text-primary-400">Bước 1: Cung cấp API Key</h2>
            <p className="text-slate-400 mb-8 max-w-lg">Chọn một API Key từ danh sách của bạn để bắt đầu. Nếu một key bị lỗi, bạn có thể chọn một key khác để tiếp tục.</p>

            <div className="w-full max-w-xl space-y-3 mb-6">
                {savedKeys.length > 0 ? (
                    savedKeys.map(key => (
                         <div 
                            key={key.id} 
                            onClick={() => handleUseKey(key)}
                            className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${activeKeyValue === key.value ? 'bg-primary-900/50 border-primary-600' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeKeyValue === key.value ? 'border-primary-500 bg-primary-500' : 'border-slate-500'}`}>
                                {activeKeyValue === key.value && <div className="w-3 h-3 rounded-full bg-white"></div>}
                            </div>
                            <div className="flex-grow text-left">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-100 truncate" title={key.name}>{key.name}</p>
                                    {key.status === 'invalid' && (
                                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full" title="Key này có thể đã hết hạn hoặc không hợp lệ.">
                                            <ExclamationCircleIcon className="w-4 h-4" />
                                            Không hợp lệ
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 font-mono">...{key.value.slice(-4)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteKey(key.id); }} className="bg-red-600/50 hover:bg-red-600 text-white p-2 rounded-lg flex-shrink-0" title={`Xóa key ${key.name}`}>
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                ) : (
                    !isAddingKey && (
                        <div className="text-center py-6 px-4 bg-slate-900/50 rounded-lg border border-slate-700">
                            <p className="text-slate-400">Bạn chưa có API key nào được lưu.</p>
                            <p className="text-slate-500 text-sm">Hãy thêm một key để bắt đầu.</p>
                        </div>
                    )
                )}
            </div>

            {isAddingKey ? (
                <div className="w-full max-w-xl p-6 bg-slate-900/50 rounded-lg border border-slate-700 space-y-4 mb-6 transition-all duration-300">
                     <h3 className="text-lg font-semibold text-left text-primary-400">Thêm API Key mới</h3>
                     <div className="text-left">
                        <label htmlFor="keyName" className="block text-sm font-medium text-slate-400 mb-1">Tên Key</label>
                        <input
                            id="keyName"
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Ví dụ: Key cá nhân"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                     <div className="text-left">
                        <label htmlFor="keyValue" className="block text-sm font-medium text-slate-400 mb-1">Giá trị API Key</label>
                        <input
                            id="keyValue"
                            type="password"
                            value={newKeyValue}
                            onChange={(e) => setNewKeyValue(e.target.value)}
                            placeholder="Dán API Key của bạn vào đây"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        {savedKeys.length > 0 && (
                            <button onClick={handleCancelAdd} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg">
                               Hủy
                            </button>
                        )}
                        <button onClick={handleAddKey} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">
                           Lưu Key
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => setIsAddingKey(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105">
                        <PlusIcon className="w-5 h-5" /> Thêm API Key
                    </button>
                </div>
            )}

            <div className="w-full max-w-xl mt-8">
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg">
                    <button
                        onClick={() => setInstructionsVisible(!instructionsVisible)}
                        className="w-full cursor-pointer p-4 font-semibold text-primary-400 flex justify-between items-center text-left"
                        aria-expanded={instructionsVisible}
                        aria-controls="api-key-instructions"
                    >
                        <span>Làm thế nào để lấy API Key Gemini?</span>
                        <svg className={`w-5 h-5 transition-transform duration-300 ${instructionsVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {instructionsVisible && (
                        <div id="api-key-instructions" className="p-4 border-t border-slate-700 text-left text-slate-300 space-y-4">
                            <p>Để lấy API Key, bạn hãy làm theo các bước sau:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Truy cập trang <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Google AI Studio</a>.</li>
                                <li>Đăng nhập bằng tài khoản Google của bạn.</li>
                                <li>Nhấp vào nút "Get API key" ở góc trên bên trái.</li>
                                <li>Chọn "Create API key in new project".</li>
                                <li>Sao chép API Key được tạo và dán vào ứng dụng.</li>
                            </ol>
                            <p>Lưu ý: Hãy bảo mật API Key của bạn và không chia sẻ công khai.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};