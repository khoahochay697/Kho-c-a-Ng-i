import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Scene, SceneOverlay } from '../types';
import type { VideoConfig } from '../App';
import { UploadIcon, PlayIcon, DownloadIcon, EditIcon, PauseIcon, RewindIcon, MagicIcon, MoveIcon, TrashIcon } from './icons';

interface ImageTimelineEntry {
    url: string;
    startTime: number;
    endTime: number;
}

interface SceneAudioPreviewerProps {
    scene: Scene;
    onUpdate: (updates: Partial<Scene>) => void;
}

const SceneAudioPreviewer: React.FC<SceneAudioPreviewerProps> = ({ scene, onUpdate }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            onUpdate({ backgroundMusicFile: file, backgroundMusicUrl: url, backgroundMusicTrimStart: 0, backgroundMusicTrimEnd: null });
        }
    };
    
    const handleMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
        const duration = e.currentTarget.duration;
        if (isFinite(duration)) {
            onUpdate({
                backgroundMusicDuration: duration,
                backgroundMusicTrimEnd: scene.backgroundMusicTrimEnd === null || (scene.backgroundMusicTrimEnd || 0) > duration ? duration : scene.backgroundMusicTrimEnd
            });
        }
    };

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            const trimEnd = scene.backgroundMusicTrimEnd ?? scene.backgroundMusicDuration ?? 0;
            if (audio.currentTime < (scene.backgroundMusicTrimStart ?? 0) || audio.currentTime >= trimEnd) {
                audio.currentTime = scene.backgroundMusicTrimStart ?? 0;
            }
            audio.play();
        }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        let intervalId: number | null = null;

        const checkTime = () => {
            const trimEnd = scene.backgroundMusicTrimEnd ?? scene.backgroundMusicDuration ?? 0;
            if (audio.currentTime >= trimEnd) audio.pause();
        };

        const onPlay = () => {
             setIsPlaying(true);
             intervalId = window.setInterval(checkTime, 50);
        };
        const onPause = () => {
             setIsPlaying(false);
             if (intervalId) clearInterval(intervalId);
        };
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onPause);
        audio.addEventListener('timeupdate', onTimeUpdate);

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onPause);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            if (intervalId) clearInterval(intervalId);
        };
    }, [scene.backgroundMusicTrimStart, scene.backgroundMusicTrimEnd, scene.backgroundMusicDuration]);

    const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) audioRef.current.currentTime = newTime;
    };


    return (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Nhạc nền cho cảnh</h5>
            <input type="file" accept="audio/*" onChange={handleFileChange} id={`bg-music-upload-${scene.id}`} className="hidden" />
            <label htmlFor={`bg-music-upload-${scene.id}`} className="w-full text-center cursor-pointer flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white text-xs font-bold py-2 px-2 rounded-lg">
                <UploadIcon className="w-4 h-4" /> {scene.backgroundMusicFile ? 'Đổi nhạc' : 'Tải lên'}
            </label>
            {scene.backgroundMusicUrl && (
                 <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-400 truncate">Tệp: {scene.backgroundMusicFile?.name}</p>
                    <audio ref={audioRef} src={scene.backgroundMusicUrl} onLoadedMetadata={handleMetadata} className="hidden" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <label htmlFor={`bgTrimStart-${scene.id}`}>Cắt đầu (giây)</label>
                            <input id={`bgTrimStart-${scene.id}`} type="number" min="0" max={(scene.backgroundMusicDuration ?? 1) - 1} step="0.1" value={scene.backgroundMusicTrimStart ?? 0}
                                onChange={e => onUpdate({ backgroundMusicTrimStart: parseFloat(e.target.value) || 0 })} className="w-full mt-1 bg-slate-900 border border-slate-600 rounded p-1" />
                        </div>
                        <div>
                            <label htmlFor={`bgTrimEnd-${scene.id}`}>Cắt cuối (giây)</label>
                            <input id={`bgTrimEnd-${scene.id}`} type="number" min={(scene.backgroundMusicTrimStart ?? 0) + 1} max={scene.backgroundMusicDuration ?? 0} step="0.1" value={scene.backgroundMusicTrimEnd ?? ''}
                                onChange={e => onUpdate({ backgroundMusicTrimEnd: e.target.value ? parseFloat(e.target.value) : null })} className="w-full mt-1 bg-slate-900 border border-slate-600 rounded p-1" />
                        </div>
                    </div>
                    <div className="pt-1">
                        <div className="flex items-center gap-3">
                            <button onClick={handlePlayPause} className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full">
                                {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                            </button>
                            <div className="flex-grow">
                                <span className="text-xs text-slate-400">Nghe thử: {currentTime.toFixed(1)}s</span>
                                <input type="range" min={scene.backgroundMusicTrimStart ?? 0} max={scene.backgroundMusicTrimEnd ?? scene.backgroundMusicDuration ?? 0} value={currentTime} onChange={handleScrubberChange} step="0.1" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400">Âm lượng: {Math.round((scene.backgroundMusicVolume ?? 0) * 100)}%</label>
                        <input type="range" min="0" max="1" step="0.01" value={scene.backgroundMusicVolume ?? 0} onChange={e => onUpdate({ backgroundMusicVolume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1" />
                    </div>
                </div>
            )}
        </div>
    );
};

const SceneOverlayEditor: React.FC<{ scene: Scene; onUpdate: (updates: Partial<Scene>) => void; }> = ({ scene, onUpdate }) => {
    const handleOverlayFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('video') ? 'video' : 'image';
            onUpdate({
                overlay: {
                    file,
                    url,
                    type,
                    volume: 0.7,
                    x: 10, y: 10, // Default position
                    width: 30, height: 30, // Default size
                }
            });
        }
    };
    
    const handleRemoveOverlay = () => {
        if(scene.overlay?.url) URL.revokeObjectURL(scene.overlay.url);
        onUpdate({ overlay: undefined });
    };
    
    const handleOverlayVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(scene.overlay) {
            const newVolume = parseFloat(e.target.value);
            onUpdate({ overlay: { ...scene.overlay, volume: newVolume } });
        }
    };

    return (
         <div className="mt-4 pt-3 border-t border-slate-700/50">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Lớp phủ (Overlay)</h5>
            <input type="file" accept="image/*,video/*" onChange={handleOverlayFileChange} id={`overlay-upload-${scene.id}`} className="hidden" />
            {!scene.overlay?.url ? (
                <label htmlFor={`overlay-upload-${scene.id}`} className="w-full text-center cursor-pointer flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white text-xs font-bold py-2 px-2 rounded-lg">
                    <UploadIcon className="w-4 h-4" /> Tải lên ảnh/video
                </label>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-start gap-2">
                        {scene.overlay.type === 'image' ? (
                            <img src={scene.overlay.url} className="w-12 h-12 object-cover rounded bg-slate-900 flex-shrink-0" alt="Overlay preview"/>
                        ) : (
                            <video src={scene.overlay.url} className="w-12 h-12 object-cover rounded bg-slate-900 flex-shrink-0" muted loop playsInline autoPlay/>
                        )}
                        <div className="flex-grow min-w-0">
                            <p className="text-xs text-slate-400 truncate">{scene.overlay.file?.name}</p>
                            <button onClick={handleRemoveOverlay} className="text-xs text-red-400 hover:underline">Xóa</button>
                        </div>
                    </div>
                     {scene.overlay.type === 'video' && (
                         <div>
                            <label className="text-xs text-slate-400">Âm lượng lớp phủ: {Math.round(scene.overlay.volume * 100)}%</label>
                            <input type="range" min="0" max="1" step="0.01" value={scene.overlay.volume} onChange={handleOverlayVolumeChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


interface VideoPlayerProps {
    scenes: Scene[];
    audioUrl: string | null;
    trimStart: number;
    trimEnd: number | null;
    playbackRate: number;
    audioVolume: number;
    onOverlayChange: (sceneId: string, overlay: SceneOverlay) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
    scenes, 
    audioUrl, 
    trimStart, 
    trimEnd, 
    playbackRate,
    audioVolume, 
    onOverlayChange
}) => {
    const [playbackState, setPlaybackState] = useState<'paused' | 'playing'>('paused');
    const [imageBuffer, setImageBuffer] = useState<[string | null, string | null]>([null, null]);
    const [activeBufferIndex, setActiveBufferIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const backgroundMusicAudioRef = useRef<HTMLAudioElement>(null);
    const overlayVideoRef = useRef<HTMLVideoElement>(null);
    const lastPlayedMusicUrl = useRef<string | null>(null);
    const intervalRef = useRef<number | null>(null);
    
    const videoPreviewContainerRef = useRef<HTMLDivElement>(null);
    
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
    const dragPlayerOffset = useRef({ x: 0, y: 0 });
    
    const interactionRef = useRef<{
        type: 'drag' | 'resize';
        handle: string;
        startX: number;
        startY: number;
        startRect: { x: number; y: number; width: number; height: number; };
    } | null>(null);

    const handlePlayerDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, a, .resize-handle, .overlay-interactive')) {
            return;
        }
        e.preventDefault();
        setIsDraggingPlayer(true);

        dragPlayerOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };

        const handlePlayerDragMove = (moveEvent: MouseEvent) => {
            setPosition({
                x: moveEvent.clientX - dragPlayerOffset.current.x,
                y: moveEvent.clientY - dragPlayerOffset.current.y,
            });
        };

        const handlePlayerDragEnd = () => {
            setIsDraggingPlayer(false);
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', handlePlayerDragMove);
            document.removeEventListener('mouseup', handlePlayerDragEnd);
        };
        
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handlePlayerDragMove);
        document.addEventListener('mouseup', handlePlayerDragEnd);
    }, [position.x, position.y]);


    const { imageTimeline, sceneStartTimes, totalDuration } = useMemo(() => {
        const timeline: ImageTimelineEntry[] = [];
        const startTimes: number[] = [];
        let cumulativeTime = 0;
        scenes.forEach(scene => {
            startTimes.push(cumulativeTime);
            const selectedImages = scene.images.filter(img => img.status === 'done' && img.isSelected);
            if (selectedImages.length > 0) {
                selectedImages.forEach(image => {
                    timeline.push({
                        url: image.url,
                        startTime: cumulativeTime,
                        endTime: cumulativeTime + image.duration,
                    });
                    cumulativeTime += image.duration;
                });
            }
        });
        return { imageTimeline: timeline, sceneStartTimes: startTimes, totalDuration: cumulativeTime };
    }, [scenes]);
    
    const currentScene = scenes[currentSceneIndex];

    const handleOverlayInteractionStart = (e: React.MouseEvent, type: 'drag' | 'resize', handle = 'drag') => {
        if (!currentScene?.overlay || !videoPreviewContainerRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const containerRect = videoPreviewContainerRef.current.getBoundingClientRect();
        
        interactionRef.current = {
            type,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startRect: {
                x: (currentScene.overlay.x / 100) * containerRect.width,
                y: (currentScene.overlay.y / 100) * containerRect.height,
                width: (currentScene.overlay.width / 100) * containerRect.width,
                height: (currentScene.overlay.height / 100) * containerRect.height,
            }
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!interactionRef.current || !currentScene?.overlay || !videoPreviewContainerRef.current) return;
            
            const dx = moveEvent.clientX - interactionRef.current.startX;
            const dy = moveEvent.clientY - interactionRef.current.startY;
            const { startRect } = interactionRef.current;
            let newRect = { ...startRect };

            if (interactionRef.current.type === 'drag') {
                newRect.x += dx;
                newRect.y += dy;
            } else { // resize
                if (handle.includes('right')) newRect.width += dx;
                if (handle.includes('bottom')) newRect.height += dy;
                if (handle.includes('left')) { newRect.width -= dx; newRect.x += dx; }
                if (handle.includes('top')) { newRect.height -= dy; newRect.y += dy; }
            }
            
            // Clamp dimensions
            if (newRect.width < 20) newRect.width = 20;
            if (newRect.height < 20) newRect.height = 20;

            const containerRect = videoPreviewContainerRef.current.getBoundingClientRect();
            onOverlayChange(currentScene.id, {
                ...currentScene.overlay,
                x: (newRect.x / containerRect.width) * 100,
                y: (newRect.y / containerRect.height) * 100,
                width: (newRect.width / containerRect.width) * 100,
                height: (newRect.height / containerRect.height) * 100,
            });
        };
        
        const handleMouseUp = () => {
            interactionRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const cleanup = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        const firstImageUrl = imageTimeline[0]?.url || null;
        setImageBuffer([firstImageUrl, null]);
        setActiveBufferIndex(0);
        
        if (audioRef.current) {
            audioRef.current.currentTime = trimStart;
        }
        setCurrentTime(trimStart);
        
        return cleanup;
    }, [imageTimeline, trimStart]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        if (backgroundMusicAudioRef.current) backgroundMusicAudioRef.current.playbackRate = playbackRate;
        if (overlayVideoRef.current) overlayVideoRef.current.playbackRate = playbackRate;
    }, [playbackRate]);
    
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = audioVolume;
    }, [audioVolume]);

    useEffect(() => {
        const bgAudio = backgroundMusicAudioRef.current;
        if (!bgAudio) return;
        if (!currentScene) return;

        const musicUrl = currentScene.backgroundMusicUrl || null;

        if (playbackState === 'playing') {
            if (musicUrl && lastPlayedMusicUrl.current !== musicUrl) {
                bgAudio.src = musicUrl;
                lastPlayedMusicUrl.current = musicUrl;
            }

            if (musicUrl) {
                bgAudio.volume = currentScene.backgroundMusicVolume ?? 0.2;
                if(bgAudio.paused) {
                    bgAudio.currentTime = currentScene.backgroundMusicTrimStart ?? 0;
                    bgAudio.play().catch(console.error);
                }
            } else {
                 if(!bgAudio.paused) bgAudio.pause();
                 lastPlayedMusicUrl.current = null;
            }
        } else {
            if(!bgAudio.paused) bgAudio.pause();
        }

    }, [currentSceneIndex, scenes, playbackState]);


    useEffect(() => {
        const bgAudio = backgroundMusicAudioRef.current;
        if (!bgAudio) return;

        const handleTimeUpdate = () => {
            if (!currentScene || !currentScene.backgroundMusicUrl) return;

            const trimStart = currentScene.backgroundMusicTrimStart ?? 0;
            const trimEnd = currentScene.backgroundMusicTrimEnd ?? currentScene.backgroundMusicDuration ?? 0;
            
            if (trimEnd > trimStart && bgAudio.currentTime >= trimEnd) {
                bgAudio.currentTime = trimStart;
                if(bgAudio.paused && playbackState === 'playing') bgAudio.play();
            }
        };
        bgAudio.addEventListener('timeupdate', handleTimeUpdate);
        return () => bgAudio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [currentSceneIndex, scenes, playbackState]);


    useEffect(() => {
        if (playbackState === 'playing' && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            
            intervalRef.current = window.setInterval(() => {
                if (!audioRef.current) return;
                const audioTime = audioRef.current.currentTime;
                setCurrentTime(audioTime);
                const videoTime = audioTime - trimStart;

                const effectiveEndTime = trimEnd !== null ? Math.min(trimEnd, trimStart + totalDuration) : trimStart + totalDuration;

                if (audioTime >= effectiveEndTime || audioRef.current.ended) {
                    setPlaybackState('paused');
                    if(audioRef.current) audioRef.current.currentTime = trimStart;
                    if(backgroundMusicAudioRef.current) backgroundMusicAudioRef.current.pause();
                    if(overlayVideoRef.current) overlayVideoRef.current.pause();
                    setCurrentTime(trimStart);
                    const firstImageUrl = imageTimeline[0]?.url || null;
                    setImageBuffer([firstImageUrl, imageBuffer[1]]);
                    setActiveBufferIndex(0);
                    cleanup();
                    return;
                }
                
                const currentImageInTimeline = imageTimeline.find(img => videoTime >= img.startTime && videoTime < img.endTime);
                if (currentImageInTimeline && currentImageInTimeline.url !== imageBuffer[activeBufferIndex]) {
                    const nextBufferIndex = 1 - activeBufferIndex;
                    const newBuffer = [...imageBuffer] as [string | null, string | null];
                    newBuffer[nextBufferIndex] = currentImageInTimeline.url;
                    setImageBuffer(newBuffer);
                    setActiveBufferIndex(nextBufferIndex);
                }

                const sceneIdx = sceneStartTimes.findIndex((startTime, index) => {
                    const nextStartTime = sceneStartTimes[index + 1] ?? totalDuration;
                    return videoTime >= startTime && videoTime < nextStartTime;
                });
                if (sceneIdx !== -1) {
                    setCurrentSceneIndex(sceneIdx);
                     const overlayVideo = overlayVideoRef.current;
                     if(overlayVideo) {
                        const sceneStartTime = sceneStartTimes[sceneIdx] ?? 0;
                        overlayVideo.currentTime = videoTime - sceneStartTime;
                     }
                }

            }, 100);
        } else if (playbackState === 'paused' && audioRef.current) {
            audioRef.current.pause();
            if (backgroundMusicAudioRef.current) backgroundMusicAudioRef.current.pause();
            if (overlayVideoRef.current) overlayVideoRef.current.pause();
            cleanup();
        }
        
        return cleanup;
    }, [playbackState, trimStart, trimEnd, totalDuration, imageTimeline, sceneStartTimes, activeBufferIndex, imageBuffer]);
    
    useEffect(() => {
        const overlayVideo = overlayVideoRef.current;
        if (!overlayVideo || !currentScene) return;

        if (playbackState === 'playing' && currentScene.overlay?.type === 'video') {
            if(overlayVideo.paused) overlayVideo.play().catch(console.error);
            overlayVideo.volume = currentScene.overlay.volume;
        } else {
            if(!overlayVideo.paused) overlayVideo.pause();
        }
    }, [playbackState, currentScene, currentSceneIndex]);

    const handlePlayPause = () => {
        if (!audioRef.current || !audioUrl) return;
        setPlaybackState(prev => (prev === 'playing' ? 'paused' : 'playing'));
    };
    
    const handleRestart = () => {
        if (!audioRef.current || !audioUrl) return;
        audioRef.current.currentTime = trimStart;
        setCurrentTime(trimStart);
        if (playbackState !== 'playing') {
            setPlaybackState('playing');
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sceneIdx = parseInt(e.target.value, 10);
        if (!audioRef.current || isNaN(sceneIdx)) return;
        
        const seekVideoTime = sceneStartTimes[sceneIdx] ?? 0;
        const seekAudioTime = seekVideoTime + trimStart;

        audioRef.current.currentTime = seekAudioTime;
        setCurrentTime(seekAudioTime);
        setCurrentSceneIndex(sceneIdx);
        
        if (playbackState === 'playing') audioRef.current.play().catch(console.error);
    };

    const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];

    return (
        <div 
            onMouseDown={handlePlayerDragStart}
            className={`p-4 bg-slate-950 rounded-lg cursor-move relative transition-shadow duration-300 ${isDraggingPlayer ? 'shadow-2xl shadow-primary-500/40' : ''}`}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex: 1,
            }}
        >
            <h4 className="text-lg font-semibold mb-3 text-center flex items-center justify-center gap-2">
                <MoveIcon className="w-5 h-5 text-slate-500"/>
                Xem trước Video
            </h4>
            
            <div 
                ref={videoPreviewContainerRef}
                className={`relative bg-black rounded-md flex items-center justify-center overflow-hidden aspect-video`}
            >
                {imageBuffer[0] && <img src={`data:image/png;base64,${imageBuffer[0]}`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${activeBufferIndex === 0 ? 'opacity-100' : 'opacity-0'}`} alt="preview-0" />}
                {imageBuffer[1] && <img src={`data:image/png;base64,${imageBuffer[1]}`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${activeBufferIndex === 1 ? 'opacity-100' : 'opacity-0'}`} alt="preview-1" />}
                {!imageBuffer[0] && !imageBuffer[1] && <p className="text-slate-500">Bắt đầu xem trước</p>}

                {currentScene?.overlay?.url && (
                    <div
                        className="overlay-interactive absolute border-2 border-dashed border-primary-500/70"
                        onMouseDown={(e) => handleOverlayInteractionStart(e, 'drag')}
                        style={{
                            left: `${currentScene.overlay.x}%`,
                            top: `${currentScene.overlay.y}%`,
                            width: `${currentScene.overlay.width}%`,
                            height: `${currentScene.overlay.height}%`,
                            cursor: 'move',
                        }}
                    >
                        {currentScene.overlay.type === 'image' ? (
                            <img src={currentScene.overlay.url} className="w-full h-full object-cover" alt="overlay"/>
                        ) : (
                            <video ref={overlayVideoRef} src={currentScene.overlay.url} className="w-full h-full object-cover" muted={playbackState !== 'playing'} playsInline/>
                        )}
                         {resizeHandles.map(handle => (
                             <div 
                                key={handle} 
                                className={`resize-handle absolute bg-primary-500 rounded-full w-3 h-3 -m-1.5`}
                                onMouseDown={(e) => handleOverlayInteractionStart(e, 'resize', handle)}
                                style={{
                                    top: handle.includes('top') ? '0%' : handle.includes('bottom') ? '100%' : '50%',
                                    left: handle.includes('left') ? '0%' : handle.includes('right') ? '100%' : '50%',
                                    cursor: `${handle.includes('top') ? 'n' : ''}${handle.includes('bottom') ? 's' : ''}${handle.includes('left') ? 'w' : ''}${handle.includes('right') ? 'e' : ''}-resize`,
                                    transform: `translate(${handle.includes('left') ? '-50%' : handle.includes('right') ? '50%' : '0'}, ${handle.includes('top') ? '-50%' : handle.includes('bottom') ? '50%' : '0'})`
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
            
             {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" preload="auto" />}
             <audio ref={backgroundMusicAudioRef} className="hidden" preload="auto" />

            <div className="flex justify-center items-center gap-4 mt-4">
                 <button onClick={handleRestart} disabled={!audioUrl} title="Tua lại" className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-3 rounded-full flex items-center justify-center disabled:bg-slate-700 disabled:text-slate-500 transition-colors">
                    <RewindIcon className="w-5 h-5"/>
                </button>
                <button onClick={handlePlayPause} disabled={!audioUrl} className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-full flex items-center justify-center disabled:bg-slate-700 disabled:text-slate-500 transition-colors">
                    {playbackState === 'playing' ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                </button>
                 <p className="text-sm text-slate-400 w-24 text-center tabular-nums">
                    {`${(Math.max(0, currentTime - trimStart)).toFixed(1)}s / ${totalDuration.toFixed(1)}s`}
                </p>
            </div>
            {scenes.length > 1 && (
                <div className="mt-4 px-2">
                    <label htmlFor="scene-scrubber" className="text-sm text-slate-400 mb-1 block text-center">Tua đến cảnh {currentSceneIndex + 1}</label>
                    <input 
                        id="scene-scrubber"
                        type="range"
                        min="0"
                        max={scenes.length - 1}
                        value={currentSceneIndex}
                        onChange={handleSeek}
                        disabled={!audioUrl}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    />
                </div>
            )}
        </div>
    );
};


interface VideoStepProps {
    apiKey: string | null;
    scenes: Scene[];
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
    videoConfig: VideoConfig;
    setVideoConfig: (config: VideoConfig) => void;
}

export const VideoStep: React.FC<VideoStepProps> = ({ apiKey, scenes, setScenes, videoConfig, setVideoConfig }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportMessage, setExportMessage] = useState('');
    const [videoReady, setVideoReady] = useState(false);
    const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
    const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
    const [audioDuration, setAudioDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    
    const audioPreviewRef = useRef<HTMLAudioElement>(null);
    const [audioPreviewTime, setAudioPreviewTime] = useState(0);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const handleMouseDownOnResizer = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        e.preventDefault();
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        if (leftPanelRef.current) {
            leftPanelRef.current.style.pointerEvents = 'none';
        }

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (isResizing.current && containerRef.current && leftPanelRef.current) {
                const containerRect = containerRef.current.getBoundingClientRect();
                let newLeftWidth = moveEvent.clientX - containerRect.left;

                const minWidth = containerRect.width * 0.3;
                const maxWidth = containerRect.width * 0.7;

                if (newLeftWidth < minWidth) newLeftWidth = minWidth;
                if (newLeftWidth > maxWidth) newLeftWidth = maxWidth;

                leftPanelRef.current.style.width = `${newLeftWidth}px`;
                leftPanelRef.current.style.flexShrink = '0';
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';

            if (leftPanelRef.current) {
                leftPanelRef.current.style.pointerEvents = 'auto';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);

    const speedOptions = [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.25, 1.5, 1.75, 2];
    const canCreateVideo = scenes.flatMap(s => s.images.filter(img => img.status === 'done' && img.isSelected)).length > 0;

    const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoConfig({ ...videoConfig, audioFile: file, audioUrl: url, trimStart: 0, trimEnd: null });
            setAudioPreviewTime(0);
        }
    };
    
    const handleMetadataLoad = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
        const duration = e.currentTarget.duration;
        if (isFinite(duration)) {
             setAudioDuration(duration);
            if(videoConfig.trimEnd === null || videoConfig.trimEnd > duration) {
                setVideoConfig({ ...videoConfig, trimEnd: duration });
            }
        }
    }

    const handleSceneUpdate = (sceneId: string, updates: Partial<Scene>) => {
        setScenes(scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s));
    };

    const handleOverlayChange = (sceneId: string, overlay: SceneOverlay) => {
        handleSceneUpdate(sceneId, { overlay });
    };

    const handleImageDurationChange = (sceneId: string, imageId: string, durationStr: string) => {
        const newDuration = parseFloat(durationStr);

        setScenes(scenes.map(s => {
            if (s.id === sceneId) {
                return {
                    ...s,
                    images: s.images.map(img =>
                        img.id === imageId ? { ...img, duration: isNaN(newDuration) ? 0 : newDuration } : img
                    )
                };
            }
            return s;
        }));
    };
    
    const handleAutoAdjustDurations = () => {
        if (!videoConfig.audioFile || !audioDuration) return;
    
        const trimmedAudioDuration = (videoConfig.trimEnd ?? audioDuration) - videoConfig.trimStart;
        if (trimmedAudioDuration <= 0) return;
    
        const allSelectedImages = scenes.flatMap(s => s.images.filter(img => img.status === 'done' && img.isSelected));
        const totalSelectedImages = allSelectedImages.length;
        if (totalSelectedImages === 0) return;
    
        const BASE_DURATION_PER_IMAGE = 1.0; 
        const MIN_DURATION_PER_IMAGE = 0.2; 
    
        const totalBaseDuration = totalSelectedImages * BASE_DURATION_PER_IMAGE;
    
        if (trimmedAudioDuration <= totalBaseDuration) {
            const evenDuration = parseFloat((trimmedAudioDuration / totalSelectedImages).toFixed(1));
            const finalDuration = Math.max(MIN_DURATION_PER_IMAGE, evenDuration);
    
            setScenes(prevScenes => prevScenes.map(scene => ({
                ...scene,
                images: scene.images.map(img => 
                    img.isSelected && img.status === 'done' ? { ...img, duration: finalDuration } : img
                )
            })));
            return;
        }
    
        const remainingDuration = trimmedAudioDuration - totalBaseDuration;
        
        let totalWords = 0;
        const sceneWordCounts = new Map<string, number>();
        scenes.forEach(scene => {
            if (scene.images.some(img => img.isSelected && img.status === 'done')) {
                const wordCount = scene.description.split(/\s+/).filter(Boolean).length;
                sceneWordCounts.set(scene.id, wordCount);
                totalWords += wordCount;
            }
        });
    
        const additionalTimePerWord = totalWords > 0 ? remainingDuration / totalWords : 0;
    
        setScenes(prevScenes => prevScenes.map(scene => {
            const selectedImagesInScene = scene.images.filter(img => img.isSelected && img.status === 'done');
            if (selectedImagesInScene.length === 0) return scene;
    
            const sceneWordCount = sceneWordCounts.get(scene.id) || 0;
            const additionalDurationForScene = sceneWordCount * additionalTimePerWord;
            const additionalDurationPerImage = additionalDurationForScene / selectedImagesInScene.length;
    
            const newDuration = parseFloat((BASE_DURATION_PER_IMAGE + additionalDurationPerImage).toFixed(1));
            const finalDuration = Math.max(MIN_DURATION_PER_IMAGE, newDuration);
    
            return {
                ...scene,
                images: scene.images.map(img =>
                    img.isSelected && img.status === 'done' ? { ...img, duration: finalDuration } : img
                )
            };
        }));
    };

    const handleAudioScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setAudioPreviewTime(newTime);
        if (audioPreviewRef.current) {
            audioPreviewRef.current.currentTime = newTime;
        }
    };
    
    const handlePreviewPlayPause = () => {
        const audio = audioPreviewRef.current;
        if (!audio) return;

        if (isPreviewPlaying) {
            audio.pause();
        } else {
            if (audio.currentTime < videoConfig.trimStart || audio.currentTime >= (videoConfig.trimEnd ?? audioDuration)) {
                audio.currentTime = videoConfig.trimStart;
            }
            audio.play();
        }
    };

    useEffect(() => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.volume = videoConfig.audioVolume;
        }
    }, [videoConfig.audioVolume]);

    useEffect(() => {
        const audio = audioPreviewRef.current;
        if (!audio) return;

        let intervalId: number | null = null;
        const checkTime = () => {
            const trimEnd = videoConfig.trimEnd ?? audioDuration;
            if (audio.currentTime >= trimEnd) audio.pause();
        };
        const handlePlay = () => {
            setIsPreviewPlaying(true);
            intervalId = window.setInterval(checkTime, 50);
        };
        const handlePause = () => {
            setIsPreviewPlaying(false);
            if (intervalId) clearInterval(intervalId);
        };
        const handleTimeUpdate = () => setAudioPreviewTime(audio.currentTime);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handlePause);
            if (intervalId) clearInterval(intervalId);
        };
    }, [videoConfig.audioUrl, videoConfig.trimEnd, videoConfig.trimStart, audioDuration]);

    useEffect(() => {
        return () => {
            if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
        }
    }, [exportedVideoUrl]);

    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const rate = parseFloat(e.target.value);
        setPlaybackRate(rate);
        if (audioPreviewRef.current) audioPreviewRef.current.playbackRate = rate;
    };

    const handleCreateVideo = async () => {
        if (!canCreateVideo) return;
        const hasNarration = !!videoConfig.audioFile;

        const { imageTimeline, totalDuration, sceneTimings } = (() => {
            const timeline: ImageTimelineEntry[] = [];
            const timings: { id: string, startTime: number, duration: number }[] = [];
            let cumulativeTime = 0;
            scenes.forEach(scene => {
                const sceneStartTime = cumulativeTime;
                let sceneDuration = 0;
                const selectedImages = scene.images.filter(img => img.status === 'done' && img.isSelected);
                if (selectedImages.length > 0) {
                    selectedImages.forEach(image => {
                        const durationOnPlayback = image.duration / playbackRate;
                        timeline.push({
                            url: image.url,
                            startTime: cumulativeTime,
                            endTime: cumulativeTime + durationOnPlayback,
                        });
                        cumulativeTime += durationOnPlayback;
                        sceneDuration += durationOnPlayback;
                    });
                }
                timings.push({ id: scene.id, startTime: sceneStartTime, duration: sceneDuration });
            });
            return { imageTimeline: timeline, totalDuration: cumulativeTime, sceneTimings: timings };
        })();
        
        setIsExporting(true);
        setVideoReady(false);
        setExportedVideoUrl(null);
        setExportProgress(0);
        setExportMessage("Khởi tạo...");
        
        const mediaElements: { [key: string]: HTMLImageElement | HTMLVideoElement } = {};
        const uniqueOverlayUrls = scenes.map(s => s.overlay?.url).filter((url): url is string => !!url);
        const allUrlsToLoad = [...new Set([...imageTimeline.map(img => img.url), ...uniqueOverlayUrls])];

        let loadedMediaCount = 0;
        
        const preloadPromises = allUrlsToLoad.map(url => new Promise<void>((resolve, reject) => {
            const isVideo = scenes.some(s => s.overlay?.url === url && s.overlay.type === 'video');
            const element: HTMLImageElement | HTMLVideoElement = isVideo ? document.createElement('video') : new Image();
            
            const onMediaLoad = () => {
                mediaElements[url] = element;
                loadedMediaCount++;
                setExportMessage(`Đang tải trước media... (${loadedMediaCount}/${allUrlsToLoad.length})`);
                if (isVideo) (element as HTMLVideoElement).pause();
                resolve();
            };
    
            element.addEventListener('load', onMediaLoad);
            element.addEventListener('loadeddata', onMediaLoad);
            element.addEventListener('error', (e) => reject(new Error(`Failed to load media: ${url}`)));

            if (isVideo) {
                (element as HTMLVideoElement).muted = true;
                (element as HTMLVideoElement).preload = 'auto';
            }
            element.src = url.startsWith('blob:') ? url : `data:image/png;base64,${url}`;
        }));

        await Promise.all(preloadPromises);

        setExportMessage("Chuẩn bị stream media...");
        await new Promise(res => setTimeout(res, 200));

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Không thể tạo context 2D");
            canvas.width = 1280;
            canvas.height = 720;
            
            const [videoTrack] = canvas.captureStream(30).getVideoTracks();
            let combinedStream: MediaStream;
            
            const audioCtx = new AudioContext();
            await audioCtx.resume();
            const mediaDest = audioCtx.createMediaStreamDestination();
            let hasAudio = false;

            if (hasNarration && videoConfig.audioFile) {
                hasAudio = true;
                const narrationBuffer = await audioCtx.decodeAudioData(await videoConfig.audioFile.arrayBuffer());
                const narrationSource = audioCtx.createBufferSource();
                narrationSource.buffer = narrationBuffer;
                narrationSource.playbackRate.value = playbackRate;
                
                const narrationGainNode = audioCtx.createGain();
                narrationGainNode.gain.value = videoConfig.audioVolume;
                narrationSource.connect(narrationGainNode);
                narrationGainNode.connect(mediaDest);
                
                const trimDuration = (videoConfig.trimEnd ?? audioDuration) - videoConfig.trimStart;
                narrationSource.start(0, videoConfig.trimStart, Math.min(trimDuration / playbackRate, totalDuration));
            }
            
            const audioPromises = scenes.map(async (scene) => {
                const sceneTiming = sceneTimings.find(t => t.id === scene.id);
                if (!sceneTiming || sceneTiming.duration <= 0) return;

                // Background Music
                if (scene.backgroundMusicFile) {
                    hasAudio = true;
                    const musicBuffer = await audioCtx.decodeAudioData(await scene.backgroundMusicFile.arrayBuffer());
                    const musicSource = audioCtx.createBufferSource();
                    musicSource.buffer = musicBuffer;
                    
                    const bgTrimStart = scene.backgroundMusicTrimStart ?? 0;
                    const bgTrimEnd = scene.backgroundMusicTrimEnd ?? scene.backgroundMusicDuration ?? 0;
                    const bgTrimmedDuration = bgTrimEnd - bgTrimStart;

                    if (bgTrimmedDuration > 0 && sceneTiming.duration > bgTrimmedDuration) musicSource.loop = true;
                    
                    const musicGainNode = audioCtx.createGain();
                    musicGainNode.gain.value = scene.backgroundMusicVolume ?? 0.2;

                    musicSource.connect(musicGainNode).connect(mediaDest);
                    musicSource.start(sceneTiming.startTime, bgTrimStart, sceneTiming.duration);
                }
                // Overlay Video Audio
                if (scene.overlay?.type === 'video' && scene.overlay.file) {
                    hasAudio = true;
                    const overlayBuffer = await audioCtx.decodeAudioData(await scene.overlay.file.arrayBuffer());
                    const overlaySource = audioCtx.createBufferSource();
                    overlaySource.buffer = overlayBuffer;
                    const overlayGain = audioCtx.createGain();
                    overlayGain.gain.value = scene.overlay.volume;
                    overlaySource.connect(overlayGain).connect(mediaDest);
                    overlaySource.start(sceneTiming.startTime, 0, sceneTiming.duration);
                }
            });
            await Promise.all(audioPromises);


            if (hasAudio) {
                const [audioTrack] = mediaDest.stream.getAudioTracks();
                combinedStream = new MediaStream([videoTrack, audioTrack]);
            } else {
                combinedStream = new MediaStream([videoTrack]);
            }

            const getSupportedMimeType = () => {
                const mimeType = 'video/webm';
                if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType };
                throw new Error("Trình duyệt của bạn không hỗ trợ ghi video định dạng WebM.");
            };
            const { mimeType } = getSupportedMimeType();

            const recorder = new MediaRecorder(combinedStream, { mimeType });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            
            recorder.onstop = () => {
                const videoBlob = new Blob(chunks, { type: mimeType });
                const videoUrl = URL.createObjectURL(videoBlob);
                setExportedVideoBlob(videoBlob);
                setExportedVideoUrl(videoUrl);
                setIsExporting(false);
                setVideoReady(true);
            };

            recorder.start();
            
            const startTime = performance.now();
            const totalFrames = Math.round(totalDuration * 30);

            const drawFrame = () => {
                const elapsedTime = (performance.now() - startTime) / 1000;
                
                if (elapsedTime >= totalDuration) {
                    if (recorder.state === 'recording') recorder.stop();
                    setExportProgress(100);
                    setExportMessage("Hoàn tất!");
                    return;
                }
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const drawCenteredImage = (imgEl: CanvasImageSource) => {
                    // FIX: Property 'width' does not exist on type 'VideoFrame'.
                    // Handle all possible types in CanvasImageSource to get their dimensions correctly.
                    const elWidth = 'videoWidth' in imgEl
                        ? imgEl.videoWidth
                        : ('displayWidth' in imgEl ? imgEl.displayWidth : imgEl.width);
                    const elHeight = 'videoHeight' in imgEl
                        ? imgEl.videoHeight
                        : ('displayHeight' in imgEl ? imgEl.displayHeight : imgEl.height);

                    const hRatio = canvas.width / elWidth;
                    const vRatio = canvas.height / elHeight;
                    const ratio = Math.min(hRatio, vRatio);
                    const centerShift_x = (canvas.width - elWidth * ratio) / 2;
                    const centerShift_y = (canvas.height - elHeight * ratio) / 2;
                    ctx.drawImage(imgEl, 0, 0, elWidth, elHeight, centerShift_x, centerShift_y, elWidth * ratio, elHeight * ratio);
                };
                
                let currentSegmentIndex = imageTimeline.findIndex(img => elapsedTime >= img.startTime && elapsedTime < img.endTime);
                if (currentSegmentIndex === -1 && elapsedTime < totalDuration) currentSegmentIndex = imageTimeline.length - 1;

                const currentSegment = imageTimeline[currentSegmentIndex];
                const currentImageEl = currentSegment ? mediaElements[currentSegment.url] as HTMLImageElement : null;

                if (currentSegment && currentImageEl) {
                   drawCenteredImage(currentImageEl);
                }
                
                const currentSceneTiming = sceneTimings.find(t => elapsedTime >= t.startTime && elapsedTime < t.startTime + t.duration);
                const currentScene = scenes.find(s => s.id === currentSceneTiming?.id);
                if (currentScene?.overlay?.url) {
                    const overlayEl = mediaElements[currentScene.overlay.url];
                    if (overlayEl) {
                        if (currentScene.overlay.type === 'video') {
                            const sceneElapsedTime = elapsedTime - (currentSceneTiming?.startTime || 0);
                            (overlayEl as HTMLVideoElement).currentTime = sceneElapsedTime;
                        }
                        const ovX = (currentScene.overlay.x / 100) * canvas.width;
                        const ovY = (currentScene.overlay.y / 100) * canvas.height;
                        const ovW = (currentScene.overlay.width / 100) * canvas.width;
                        const ovH = (currentScene.overlay.height / 100) * canvas.height;
                        ctx.drawImage(overlayEl, ovX, ovY, ovW, ovH);
                    }
                }
                
                const progress = Math.min(100, (elapsedTime / totalDuration) * 100);
                setExportProgress(progress);
                const currentFrame = Math.round(elapsedTime * 30);
                setExportMessage(`Đang render khung hình ${Math.min(currentFrame, totalFrames)}/${totalFrames}...`);
                
                requestAnimationFrame(drawFrame);
            };
            requestAnimationFrame(drawFrame);

        } catch (error) {
            console.error("Video export failed:", error);
            setExportMessage(`Lỗi: ${error instanceof Error ? error.message : String(error)}`);
            setIsExporting(false);
        }
    };
    
    const handleDownload = () => {
        if (!exportedVideoBlob) return;
        try {
            const link = document.createElement('a');
            const url = URL.createObjectURL(exportedVideoBlob);
            link.href = url;
            const extension = exportedVideoBlob.type.includes('mp4') ? 'mp4' : 'webm';
            link.download = `comic_video.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Lỗi khi lưu video:", err);
            alert("Không thể lưu video. Vui lòng thử lại hoặc sử dụng trình duyệt khác.");
        }
    };

    const resetVideoCreation = () => {
        setVideoReady(false); setIsExporting(false); setExportProgress(0); setExportMessage('');
        if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
        setExportedVideoUrl(null); setExportedVideoBlob(null);
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-primary-400 text-center">Bước 4: Tạo Video</h2>
            <p className="text-slate-400 mb-8 text-center max-w-2xl mx-auto">Tải lên giọng kể, thêm nhạc nền cho từng cảnh, điều chỉnh thời gian và xuất video của bạn.</p>

            {videoReady && exportedVideoUrl ? (
                 <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4">Video của bạn đã sẵn sàng!</h3>
                    <p className="text-slate-400 mb-4">Bạn có thể xem lại và tải về sản phẩm cuối cùng.</p>
                    <video src={exportedVideoUrl} controls className="w-full max-w-3xl mx-auto rounded-lg aspect-video bg-black"></video>
                    <div className="flex justify-center gap-4 mt-6">
                         <button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                           <DownloadIcon className="w-5 h-5" /> Tải video về thư mục
                        </button>
                        <button onClick={resetVideoCreation} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                            <EditIcon className="w-5 h-5" /> Chỉnh sửa lại
                        </button>
                    </div>
                </div>
            ) : isExporting ? (
                <div className="text-center p-8">
                    <h3 className="text-xl font-semibold mb-4">Đang xuất video...</h3>
                    <p className="text-slate-400 mb-4 h-6">{exportMessage}</p>
                    <div className="w-full max-w-md mx-auto bg-slate-700 rounded-full h-4">
                        <div className="bg-primary-600 h-4 rounded-full transition-all duration-200" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <p className="mt-2 text-lg font-bold">{Math.round(exportProgress)}%</p>
                </div>
            ) : (
                <>
                <div ref={containerRef} className="flex flex-col lg:flex-row gap-4 items-stretch">
                    <div ref={leftPanelRef} className="lg:w-2/3 flex-shrink-0 space-y-6">
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            <h3 className="text-xl font-semibold mb-4">1. Âm thanh & Tốc độ</h3>
                            
                            <div className="bg-slate-800/50 p-4 rounded-lg">
                                <h4 className="font-semibold text-primary-400 mb-3">Giọng kể chính</h4>
                                <input type="file" accept="audio/*" onChange={handleAudioUpload} id="audio-upload" className="hidden" />
                                <label htmlFor="audio-upload" className="w-full text-center cursor-pointer flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg">
                                   <UploadIcon className="w-5 h-5"/> {videoConfig.audioFile ? 'Thay đổi file giọng kể' : 'Tải lên file giọng kể'}
                                </label>
                                {videoConfig.audioUrl && (
                                    <div className="space-y-4 mt-4">
                                        <p className="text-sm text-slate-300 truncate">Đã tải lên: {videoConfig.audioFile?.name}</p>
                                        <audio ref={audioPreviewRef} src={videoConfig.audioUrl} className="hidden" onLoadedMetadata={handleMetadataLoad}></audio>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <label htmlFor="trimStart">Cắt đầu (giây)</label>
                                                <input id="trimStart" type="number" min="0" max={audioDuration > 1 ? audioDuration - 1 : 0} step="0.1" value={videoConfig.trimStart} 
                                                onChange={e => setVideoConfig({...videoConfig, trimStart: parseFloat(e.target.value) || 0 })} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2"/>
                                            </div>
                                             <div>
                                                <label htmlFor="trimEnd">Cắt cuối (giây)</label>
                                                <input id="trimEnd" type="number" min={videoConfig.trimStart + 1} max={audioDuration} step="0.1" value={videoConfig.trimEnd ?? ''} 
                                                onChange={e => setVideoConfig({...videoConfig, trimEnd: e.target.value ? parseFloat(e.target.value) : null })} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2"/>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <div className="flex items-center gap-4">
                                                <button onClick={handlePreviewPlayPause} className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full">
                                                    {isPreviewPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                                </button>
                                                <div className="flex-grow">
                                                    <label className="text-xs text-slate-400">Nghe thử: {audioPreviewTime.toFixed(1)}s / {(videoConfig.trimEnd ?? audioDuration).toFixed(1)}s</label>
                                                    <input type="range" min={videoConfig.trimStart} max={videoConfig.trimEnd ?? audioDuration} value={audioPreviewTime} onChange={handleAudioScrubberChange} step="0.1" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <label htmlFor="audioVolume" className="text-sm text-slate-400">Âm lượng giọng kể: {Math.round(videoConfig.audioVolume * 100)}%</label>
                                            <input
                                                id="audioVolume"
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={videoConfig.audioVolume}
                                                onChange={e => setVideoConfig({...videoConfig, audioVolume: parseFloat(e.target.value)})}
                                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                             <div className="bg-slate-800/50 p-4 rounded-lg mt-4">
                                <h4 className="font-semibold text-primary-400 mb-3">Tốc độ phát</h4>
                                <select id="playbackRate" value={playbackRate} onChange={handlePlaybackRateChange} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-sm">
                                    {speedOptions.map(speed => (
                                        <option key={speed} value={speed}>
                                            {speed}x {speed === 1 && '(Bình thường)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">2. Cài đặt Cảnh</h3>
                                <button
                                    onClick={handleAutoAdjustDurations}
                                    disabled={!videoConfig.audioFile}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded-lg text-sm flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                                    title="Tự động phân bổ thời gian âm thanh cho các ảnh dựa trên số lượng từ trong mô tả cảnh."
                                >
                                    <MagicIcon className="w-4 h-4" /> Tự động
                                </button>
                            </div>
                            <div className="max-h-[30rem] overflow-y-auto space-y-4 pr-2">
                               {scenes.map((scene, index) => (
                                   <div key={scene.id} className="bg-slate-800/50 p-3 rounded-md">
                                       <p className="font-semibold text-primary-400 truncate mb-3">Cảnh {index + 1}</p>
                                       <div className="space-y-3">
                                          {scene.images.filter(img => img.status === 'done' && img.isSelected).map(img => (
                                              <div key={img.id} className="flex items-center gap-3">
                                                  <img src={`data:image/png;base64,${img.url}`} alt="thumbnail" className="w-14 h-14 rounded object-cover bg-slate-700 flex-shrink-0" />
                                                  <div className="flex-grow text-sm">
                                                        <label htmlFor={`duration-${img.id}`} className="text-xs text-slate-400">Thời gian (giây)</label>
                                                        <input 
                                                            id={`duration-${img.id}`}
                                                            type="number" 
                                                            step="0.1" 
                                                            min="0.1"
                                                            value={img.duration || ''} 
                                                            onChange={e => handleImageDurationChange(scene.id, img.id, e.target.value)} 
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-1 mt-1" 
                                                        />
                                                  </div>
                                              </div>
                                          ))}
                                          {scene.images.filter(img => img.status === 'done' && img.isSelected).length === 0 && (
                                              <div className="h-16 flex items-center justify-center text-xs text-slate-500 text-center">Chọn ảnh ở Bước 3 để đưa vào video</div>
                                          )}
                                       </div>
                                       <SceneAudioPreviewer scene={scene} onUpdate={(updates) => handleSceneUpdate(scene.id, updates)} />
                                       <SceneOverlayEditor scene={scene} onUpdate={(updates) => handleSceneUpdate(scene.id, updates)} />
                                   </div>
                               ))}
                            </div>
                        </div>
                    </div>
                    
                    <div
                        onMouseDown={handleMouseDownOnResizer}
                        className="hidden lg:flex w-2.5 flex-shrink-0 items-center justify-center cursor-col-resize group"
                        title="Kéo để thay đổi kích thước"
                    >
                        <div className="w-1 h-16 bg-slate-600 group-hover:bg-primary-500 rounded-full transition-colors"></div>
                    </div>

                    <div className="flex-grow flex flex-col min-w-0">
                        <VideoPlayer 
                            scenes={scenes} 
                            audioUrl={videoConfig.audioUrl} 
                            trimStart={videoConfig.trimStart} 
                            trimEnd={videoConfig.trimEnd} 
                            playbackRate={playbackRate}
                            audioVolume={videoConfig.audioVolume}
                            onOverlayChange={handleOverlayChange}
                         />
                        <div className="text-center mt-6">
                            <button onClick={handleCreateVideo} disabled={!canCreateVideo} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                               <DownloadIcon className="w-6 h-6 inline-block mr-2"/> Tạo & Tải Video
                            </button>
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
    );
};