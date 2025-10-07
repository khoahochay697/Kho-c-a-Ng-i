import type { SavedApiKey } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URI prefix (e.g., "data:image/png;base64,")
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const getMimeTypeFromDataUrl = (dataUrl: string): string => {
    return dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
}

export const markApiKeyAsInvalid = (invalidKeyValue: string) => {
    try {
        const storedKeys = localStorage.getItem('geminiApiKeysList');
        if (storedKeys) {
            let keys: SavedApiKey[] = JSON.parse(storedKeys);
            let keyUpdated = false;
            keys = keys.map(key => {
                if (key.value === invalidKeyValue && key.status !== 'invalid') {
                    keyUpdated = true;
                    return { ...key, status: 'invalid' };
                }
                return key;
            });

            if (keyUpdated) {
                localStorage.setItem('geminiApiKeysList', JSON.stringify(keys));
                window.dispatchEvent(new CustomEvent('apiKeysUpdated'));
            }
        }
    } catch (error) {
        console.error("Failed to mark API key as invalid in storage:", error);
    }
};

export const clearApiKeyStatus = (keyValue: string) => {
    try {
        const storedKeys = localStorage.getItem('geminiApiKeysList');
        if (storedKeys) {
            let keys: SavedApiKey[] = JSON.parse(storedKeys);
            let keyUpdated = false;
            keys = keys.map(key => {
                if (key.value === keyValue && key.status) {
                    keyUpdated = true;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { status, ...rest } = key;
                    return rest;
                }
                return key;
            });

            if (keyUpdated) {
                localStorage.setItem('geminiApiKeysList', JSON.stringify(keys));
                window.dispatchEvent(new CustomEvent('apiKeysUpdated'));
            }
        }
    } catch (error) {
        console.error("Failed to clear API key status in storage:", error);
    }
}

export const parseGeminiError = (error: unknown): string => {
    if (error instanceof Error) {
        const message = error.message;
        // Check for quota/rate limit errors
        if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            return "Bạn đã vượt quá hạn ngạch API (lỗi 429). Điều này thường xảy ra khi dùng hết số lượt yêu cầu miễn phí. Vui lòng đợi một lát rồi thử lại, hoặc sử dụng một API Key khác.";
        }
        // Check for invalid API key errors
        if (message.toLowerCase().includes('api key') || message.includes('403') || message.includes('permission denied')) {
            return "API Key không hợp lệ hoặc đã hết hạn. Vui lòng chọn một key khác ở Bước 1 và thử lại.";
        }
        // Return the original message for other errors, as it might be descriptive.
        return message;
    }
    return "Đã xảy ra một lỗi không xác định.";
};
