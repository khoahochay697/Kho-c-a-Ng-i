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