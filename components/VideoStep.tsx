
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Scene } from '../types';
import type { VideoConfig } from '../App';
import { UploadIcon, PlayIcon, DownloadIcon, EditIcon, PauseIcon, RewindIcon, MagicIcon } from './icons';

interface ImageTimelineEntry {
    url: string;
    startTime: number;
    endTime: number;
}

interface VideoPlayerProps {
    scenes: Scene[];
    audioUrl: string | null;
    trimStart: number;
    trimEnd: number | null;
    playbackRate: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, audioUrl, trimStart, trimEnd, playbackRate }) => {
    const [playbackState, setPlaybackState] = useState<'paused' | 'playing'>('paused');
    const [imageBuffer, setImageBuffer] = useState<[string | null, string | null]>([null, null]);
    const [activeBufferIndex, setActiveBufferIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const intervalRef = useRef<number | null>(null);

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
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

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
                    if(audioRef.current) {
                        audioRef.current.currentTime = trimStart;
                    }
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
                }

            }, 100);
        } else if (playbackState === 'paused' && audioRef.current) {
            audioRef.current.pause();
            cleanup();
        }
        
        return cleanup;
    }, [playbackState, trimStart, trimEnd, totalDuration, imageTimeline, sceneStartTimes, activeBufferIndex, imageBuffer]);


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

        if (playbackState === 'playing') {
             audioRef.current.play().catch(console.error);
        }
    };

    return (
        <div className={`p-4 bg-slate-950 rounded-lg h-full flex flex-col`}>
            <h4 className="text-lg font-semibold mb-3 text-center">Xem trước Video</h4>
            <div className={`relative aspect-video bg-black rounded-md flex items-center justify-center mb-4 flex-grow overflow-hidden`}>
                {imageBuffer[0] && <img src={`data:image/png;base64,${imageBuffer[0]}`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${activeBufferIndex === 0 ? 'opacity-100' : 'opacity-0'}`} alt="preview-0" />}
                {imageBuffer[1] && <img src={`data:image/png;base64,${imageBuffer[1]}`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-in-out ${activeBufferIndex === 1 ? 'opacity-100' : 'opacity-0'}`} alt="preview-1" />}
                {!imageBuffer[0] && !imageBuffer[1] && <p className="text-slate-500">Bắt đầu xem trước</p>}
            </div>
             {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" preload="auto" />}
            <div className="flex justify-center items-center gap-4">
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
    scenes: Scene[];
    setScenes: (scenes: Scene[]) => void;
    videoConfig: VideoConfig;
    setVideoConfig: (config: VideoConfig) => void;
}

export const VideoStep: React.FC<VideoStepProps> = ({ scenes, setScenes, videoConfig, setVideoConfig }) => {
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

    const speedOptions = [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.25, 1.5, 1.75, 2];

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
    
        const BASE_DURATION_PER_IMAGE = 1.0; // Giây
        const MIN_DURATION_PER_IMAGE = 0.2; // Giây
    
        const totalBaseDuration = totalSelectedImages * BASE_DURATION_PER_IMAGE;
    
        // Nếu tổng thời gian âm thanh quá ngắn, chia đều
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
    
        // Phân bổ thời gian còn lại dựa trên số từ
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
        const audio = audioPreviewRef.current;
        if (!audio) return;

        let intervalId: number | null = null;

        const checkTime = () => {
            const trimEnd = videoConfig.trimEnd ?? audioDuration;
            if (audio.currentTime >= trimEnd) {
                audio.pause();
            }
        };

        const handlePlay = () => {
            setIsPreviewPlaying(true);
            intervalId = window.setInterval(checkTime, 50);
        };

        const handlePause = () => {
            setIsPreviewPlaying(false);
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleTimeUpdate = () => {
            setAudioPreviewTime(audio.currentTime);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handlePause);
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [videoConfig.audioUrl, videoConfig.trimEnd, videoConfig.trimStart, audioDuration]);
    
    useEffect(() => {
        return () => {
            if (exportedVideoUrl) {
                URL.revokeObjectURL(exportedVideoUrl);
            }
        }
    }, [exportedVideoUrl]);

    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const rate = parseFloat(e.target.value);
        setPlaybackRate(rate);
        if (audioPreviewRef.current) {
            audioPreviewRef.current.playbackRate = rate;
        }
    };

    const handleCreateVideo = async () => {
        if (!videoConfig.audioFile) return;

        const { imageTimeline, totalDuration } = (() => {
            const timeline: ImageTimelineEntry[] = [];
            let cumulativeTime = 0;
            scenes.forEach(scene => {
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
                    });
                }
            });
            return { imageTimeline: timeline, totalDuration: cumulativeTime };
        })();
        
        setIsExporting(true);
        setVideoReady(false);
        setExportedVideoUrl(null);
        setExportProgress(0);
        setExportMessage("Khởi tạo...");
        
        const totalImages = imageTimeline.length;
        let loadedImages = 0;

        const imageElements: { [key: string]: HTMLImageElement } = {};
        await Promise.all(
            [...new Set(imageTimeline.map(img => img.url))].map(url => new Promise<void>((resolve, reject) => {
                const imageEl = new Image();
                imageEl.src = `data:image/png;base64,${url}`;
                imageEl.onload = () => {
                    imageElements[url] = imageEl;
                    loadedImages++;
                    setExportMessage(`Đang tải trước hình ảnh... (${loadedImages}/${[...new Set(imageTimeline.map(img => img.url))].length})`);
                    resolve();
                };
                imageEl.onerror = reject;
            }))
        );

        setExportMessage("Chuẩn bị stream media...");
        await new Promise(res => setTimeout(res, 200));

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Không thể tạo context 2D");
            canvas.width = 1280;
            canvas.height = 720;

            const audioCtx = new AudioContext();
            const audioBuffer = await audioCtx.decodeAudioData(await videoConfig.audioFile.arrayBuffer());
            const audioSource = audioCtx.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.playbackRate.value = playbackRate;

            const mediaDest = audioCtx.createMediaStreamDestination();
            audioSource.connect(mediaDest);
            const [audioTrack] = mediaDest.stream.getAudioTracks();

            const FPS = 30;
            const videoStream = canvas.captureStream(FPS);
            const [videoTrack] = videoStream.getVideoTracks();
            
            const combinedStream = new MediaStream([videoTrack, audioTrack]);
            const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            
            recorder.onstop = () => {
                const videoBlob = new Blob(chunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(videoBlob);
                setExportedVideoBlob(videoBlob);
                setExportedVideoUrl(videoUrl);
                setIsExporting(false);
                setVideoReady(true);
            };

            recorder.start();
            const trimDuration = (videoConfig.trimEnd ?? audioDuration) - videoConfig.trimStart;
            audioSource.start(0, videoConfig.trimStart, Math.min(trimDuration, totalDuration));
            
            const startTime = performance.now();
            const totalFrames = Math.round(totalDuration * FPS);
            const transitionDuration = 0.5; // 500ms cross-fade

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

                const drawImage = (imgEl: HTMLImageElement) => {
                    const hRatio = canvas.width / imgEl.width;
                    const vRatio = canvas.height / imgEl.height;
                    const ratio = Math.min(hRatio, vRatio);
                    const centerShift_x = (canvas.width - imgEl.width * ratio) / 2;
                    const centerShift_y = (canvas.height - imgEl.height * ratio) / 2;
                    ctx.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height, centerShift_x, centerShift_y, imgEl.width * ratio, imgEl.height * ratio);
                };
                
                let currentSegmentIndex = imageTimeline.findIndex(img => elapsedTime >= img.startTime && elapsedTime < img.endTime);
                if (currentSegmentIndex === -1 && elapsedTime < totalDuration) currentSegmentIndex = imageTimeline.length - 1;

                const currentSegment = imageTimeline[currentSegmentIndex];
                const nextSegment = imageTimeline[currentSegmentIndex + 1];
                const currentImageEl = currentSegment ? imageElements[currentSegment.url] : null;

                if (currentSegment && currentImageEl) {
                    const timeUntilEnd = currentSegment.endTime - elapsedTime;
                    
                    if (nextSegment && timeUntilEnd < transitionDuration) {
                        const nextImageEl = imageElements[nextSegment.url];
                        const fadeProgress = Math.max(0, Math.min(1, 1 - (timeUntilEnd / transitionDuration)));

                        ctx.globalAlpha = 1 - fadeProgress;
                        drawImage(currentImageEl);

                        ctx.globalAlpha = fadeProgress;
                        if (nextImageEl) drawImage(nextImageEl);
                        
                        ctx.globalAlpha = 1.0;
                    } else {
                        drawImage(currentImageEl);
                    }
                }
                
                const progress = Math.min(100, (elapsedTime / totalDuration) * 100);
                setExportProgress(progress);
                const currentFrame = Math.round(elapsedTime * FPS);
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
            const blob = exportedVideoBlob;
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'comic_video.webm';
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
        setVideoReady(false);
        setIsExporting(false);
        setExportProgress(0);
        setExportMessage('');
        if (exportedVideoUrl) {
            URL.revokeObjectURL(exportedVideoUrl);
        }
        setExportedVideoUrl(null);
        setExportedVideoBlob(null);
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-primary-400 text-center">Bước 4: Tạo Video</h2>
            <p className="text-slate-400 mb-8 text-center max-w-2xl mx-auto">Tải lên giọng kể, điều chỉnh thời gian cho mỗi cảnh và xuất video HD của bạn.</p>

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            <h3 className="text-xl font-semibold mb-4">1. Tải lên & chỉnh sửa âm thanh</h3>
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} id="audio-upload" className="hidden" />
                            <label htmlFor="audio-upload" className="w-full cursor-pointer flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg mb-4">
                               <UploadIcon className="w-5 h-5"/> {videoConfig.audioFile ? 'Thay đổi file âm thanh' : 'Chọn file giọng kể'}
                            </label>
                            {videoConfig.audioUrl && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300 truncate">Đã tải lên: {videoConfig.audioFile?.name}</p>
                                    <audio ref={audioPreviewRef} src={videoConfig.audioUrl} className="hidden" onLoadedMetadata={handleMetadataLoad}></audio>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label htmlFor="trimStart">Cắt đầu (giây)</label>
                                            <input id="trimStart" type="number" min="0" max={audioDuration > 1 ? audioDuration - 1 : 0} step="0.1" value={videoConfig.trimStart} 
                                            onChange={e => {
                                                const value = e.target.value;
                                                const parsedValue = value === '' ? 0 : parseFloat(value);
                                                if (!isNaN(parsedValue)) {
                                                    setVideoConfig({...videoConfig, trimStart: parsedValue });
                                                }
                                            }} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2"/>
                                        </div>
                                         <div>
                                            <label htmlFor="trimEnd">Cắt cuối (giây)</label>
                                            <input id="trimEnd" type="number" min={videoConfig.trimStart + 1} max={audioDuration} step="0.1" value={videoConfig.trimEnd ?? ''} 
                                            onChange={e => {
                                                const value = e.target.value;
                                                const parsedValue = value === '' ? null : parseFloat(value);
                                                if (value === '' || !isNaN(parsedValue)) {
                                                    setVideoConfig({...videoConfig, trimEnd: parsedValue });
                                                }
                                            }} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="playbackRate" className="text-sm">Tốc độ kể</label>
                                        <select id="playbackRate" value={playbackRate} onChange={handlePlaybackRateChange} className="w-full mt-1 bg-slate-800 border border-slate-600 rounded p-2 text-sm">
                                            {speedOptions.map(speed => (
                                                <option key={speed} value={speed}>
                                                    {speed}x {speed === 1 && '(Bình thường)'}
                                                </option>
                                            ))}
                                        </select>
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
                                </div>
                            )}
                        </div>
                        
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">2. Điều chỉnh thời gian ảnh</h3>
                                <button
                                    onClick={handleAutoAdjustDurations}
                                    disabled={!videoConfig.audioFile}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded-lg text-sm flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                                    title="Tự động phân bổ thời gian âm thanh cho các ảnh dựa trên số lượng từ trong mô tả cảnh."
                                >
                                    <MagicIcon className="w-4 h-4" /> Tự động
                                </button>
                            </div>
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
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
                                   </div>
                               ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <VideoPlayer scenes={scenes} audioUrl={videoConfig.audioUrl} trimStart={videoConfig.trimStart} trimEnd={videoConfig.trimEnd} playbackRate={playbackRate} />
                    </div>
                </div>

                <div className="text-center mt-8">
                    <button onClick={handleCreateVideo} disabled={!videoConfig.audioFile} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg text-xl transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed">
                       <DownloadIcon className="w-6 h-6 inline-block mr-2"/> Tạo & Tải Video
                    </button>
                </div>
                </>
            )}
        </div>
    );
};
