import React, { useState } from 'react';
import { ApiKeyStep } from './components/ApiKeyStep';
import { CharacterStep } from './components/CharacterStep';
import { SceneStep } from './components/SceneStep';
import { VideoStep } from './components/VideoStep';
import { Stepper } from './components/Stepper';
import type { Scene, VideoSegment } from './types';

export interface VideoConfig {
    audioFile: File | null;
    audioUrl: string | null;
    trimStart: number;
    trimEnd: number | null;
    audioVolume: number;
    intro?: VideoSegment;
    outro?: VideoSegment;
}

const App: React.FC = () => {
    const [unlockedStep, setUnlockedStep] = useState(1);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [videoConfig, setVideoConfig] = useState<VideoConfig>({
        audioFile: null,
        audioUrl: null,
        trimStart: 0,
        trimEnd: null,
        audioVolume: 1,
        intro: undefined,
        outro: undefined,
    });

    const handleKeySelection = (selectedKey: string | null) => {
        setApiKey(selectedKey);
        if (selectedKey) {
            setUnlockedStep(prev => Math.max(prev, 2));
        }
    };

    const handleCharacterStepComplete = () => {
        if (referenceImages.length > 0) {
            setUnlockedStep(prev => Math.max(prev, 3));
        }
    };

    const handleSceneStepComplete = () => {
        if (scenes.length > 0 && scenes.every(s => s.images.some(i => i.status === 'done'))) {
            setUnlockedStep(prev => Math.max(prev, 4));
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
                        Trình tạo truyện tranh AI
                    </h1>
                    <p className="mt-4 text-lg text-slate-400">
                        Biến ý tưởng của bạn thành truyện tranh và video sống động.
                    </p>
                </header>
                
                <main>
                    <Stepper currentStep={unlockedStep} />
                    <div className="mt-8 space-y-8">
                        <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-10 border border-slate-700">
                           <ApiKeyStep onKeySelect={handleKeySelection} activeKeyValue={apiKey} />
                        </div>

                        {unlockedStep >= 2 && (
                             <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-10 border border-slate-700">
                                <CharacterStep apiKey={apiKey} referenceImages={referenceImages} setReferenceImages={setReferenceImages} onNext={handleCharacterStepComplete} />
                            </div>
                        )}

                        {unlockedStep >= 3 && (
                            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-10 border border-slate-700">
                                <SceneStep apiKey={apiKey} referenceImages={referenceImages} scenes={scenes} setScenes={setScenes} onNext={handleSceneStepComplete} />
                            </div>
                        )}

                        {unlockedStep >= 4 && (
                            <div className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-10 border border-slate-700">
                                <VideoStep apiKey={apiKey} scenes={scenes} setScenes={setScenes} videoConfig={videoConfig} setVideoConfig={setVideoConfig} />
                            </div>
                        )}
                    </div>
                </main>
                 <footer className="text-center mt-12 text-slate-500">
                    <p>Được phát triển với React, Tailwind CSS và Gemini API.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;