export interface ComicImage {
    id: string;
    url: string; // base64 string
    isSelected: boolean;
    status: 'idle' | 'generating' | 'error' | 'done';
    duration: number; // in seconds
}

export interface Scene {
    id: string;
    description: string;
    images: ComicImage[];
}

export interface SavedApiKey {
    id: string;
    name: string;
    value: string;
    status?: 'invalid';
}