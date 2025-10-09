export interface ComicImage {
    id: string;
    url: string; // base64 string
    isSelected: boolean;
    status: 'idle' | 'generating' | 'error' | 'done';
    duration: number; // in seconds
}

export interface SceneOverlay {
    file: File | null;
    url: string | null;
    type: 'image' | 'video';
    volume: number; // 0 to 1
    // Position and size as percentages of the container
    x: number; // 0 to 100
    y: number; // 0 to 100
    width: number; // percentage
    height: number; // percentage
}

export interface Scene {
    id: string;
    description: string;
    images: ComicImage[];
    backgroundMusicFile?: File | null;
    backgroundMusicUrl?: string | null;
    backgroundMusicVolume?: number;
    backgroundMusicTrimStart?: number;
    backgroundMusicTrimEnd?: number | null;
    backgroundMusicDuration?: number;
    overlay?: SceneOverlay;
}

export interface SavedApiKey {
    id: string;
    name: string;
    value: string;
    status?: 'invalid';
}