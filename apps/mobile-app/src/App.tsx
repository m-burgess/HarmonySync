import React, { useState, useEffect, useMemo } from 'react';
import { Music, Settings, ChevronRight, Hash, Check } from 'lucide-react';
import { Transposer, KEYS } from './utils/transposer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SongSection {
    id: string;
    label: string;
    content: string; // New ChordPro field
    bars: number;
    lyrics?: string; // Legacy
    chords?: string; // Legacy
}

interface SongMap {
    bpm: number;
    songLength: string;
    timeSignature: string;
    sections: SongSection[];
}

interface AppState {
    currentSongName?: string;
    currentSongMap?: SongMap;
    originalKey?: string; // Added for ChordPro transposition
    playbackStatus: string;
}

export default function App() {
    const [state, setState] = useState<AppState | null>(null);
    const [targetKey, setTargetKey] = useState('C');
    const [isCapoMode, setIsCapoMode] = useState(false);
    const [connected, setConnected] = useState(false);

    // WebSocket Connection
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = '3000'; // Default RemoteControlService port
        const socket = new WebSocket(`${protocol}//${host}:${port}`);

        socket.onopen = () => {
            setConnected(true);
            console.log('Connected to HarmonySync');
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'state') {
                setState(msg.data);
            }
        };

        socket.onclose = () => {
            setConnected(false);
            console.log('Disconnected from HarmonySync');
        };

        return () => socket.close();
    }, []);

    // Capo Calculation
    const capo = useMemo(() => Transposer.calculateCapo(targetKey), [targetKey]);

    const renderSection = (section: SongSection) => {
        const displayKey = isCapoMode ? capo.keyToPlay : targetKey;
        const originalKey = state?.originalKey || 'C'; // Fallback to C if unknown

        // 1. Handle ChordPro Content (Primary)
        if (section.content) {
            const lines = section.content.split('\n');
            return (
                <div className="p-4 rounded-xl mb-4 bg-surface border border-white/10 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-accent font-bold uppercase tracking-wider text-sm">{section.label}</span>
                        <span className="text-white/40 text-xs font-mono">{section.bars} bars</span>
                    </div>
                    <div className="space-y-4">
                        {lines.map((line, li) => {
                            // Extract parts: text or [chord]
                            const parts = line.split(/(\[.*?\])/g);
                            if (line.trim() === '') return <div key={li} className="h-2" />;

                            return (
                                <div key={li} className="relative flex flex-wrap leading-[2.5] pt-4">
                                    {parts.map((part, pi) => {
                                        if (part.startsWith('[') && part.endsWith(']')) {
                                            const chord = part.slice(1, -1);
                                            const transposed = Transposer.transposeLetterChord(chord, originalKey, displayKey);
                                            return (
                                                <span key={pi} className="absolute -top-3 text-primary font-bold text-lg pointer-events-none select-none">
                                                    {transposed}
                                                </span>
                                            );
                                        }
                                        return <span key={pi} className="text-white/80 text-lg">{part}</span>;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // 2. Legacy Rendering (if still needed)
        const transposedLegacyChords = Transposer.transposeProgression(section.chords || '', displayKey);
        return (
            <div className="p-4 rounded-xl mb-4 bg-surface border border-white/10 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-accent font-bold uppercase tracking-wider text-sm">{section.label}</span>
                    <span className="text-white/40 text-xs font-mono">{section.bars} bars</span>
                </div>
                <div className="flex flex-wrap gap-4 mb-3">
                    {transposedLegacyChords.map((chord, i) => (
                        <span key={i} className="text-2xl font-bold text-primary">{chord}</span>
                    ))}
                </div>
                <pre className="text-white/80 whitespace-pre-wrap font-sans text-lg">{section.lyrics}</pre>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-white p-4 pb-24 font-sans max-w-2xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 pt-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <Music className="text-primary w-6 h-6" />
                        HARMONYSYNC
                    </h1>
                    <p className="text-white/40 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", connected ? "bg-accent" : "bg-red-500")} />
                        {connected ? "Live Connection" : "Offline"}
                    </p>
                </div>
                <button className="p-2 rounded-full bg-surface">
                    <Settings className="w-5 h-5 text-white/50" />
                </button>
            </header>

            {/* Song Info */}
            <div className="mb-8">
                <h2 className="text-4xl font-bold mb-1 tracking-tight">
                    {state?.currentSongName || "No song selected"}
                </h2>
                {state?.currentSongMap && (
                    <div className="flex gap-4 text-white/40 text-sm font-mono mt-2">
                        <span>BPM: {state.currentSongMap.bpm}</span>
                        <span>Time: {state.currentSongMap.timeSignature}</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            <section className="bg-surface rounded-2xl p-4 mb-8 border border-white/5 shadow-inner">
                <div className="flex flex-col gap-6">
                    {/* Key Selector */}
                    <div>
                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3 block">Musical Key</label>
                        <div className="grid grid-cols-6 gap-2">
                            {KEYS.map(k => (
                                <button
                                    key={k}
                                    onClick={() => setTargetKey(k)}
                                    className={cn(
                                        "h-10 rounded-lg font-bold transition-all text-sm",
                                        targetKey === k ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white/5 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Capo Toggle */}
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", isCapoMode ? "bg-accent/20 text-accent" : "bg-white/10 text-white/40")}>
                                <Hash className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Capo Mode</p>
                                <p className="text-white/40 text-xs">Recommended for Acoustic</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCapoMode(!isCapoMode)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                isCapoMode ? "bg-accent" : "bg-white/10"
                            )}
                        >
                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", isCapoMode ? "left-7" : "left-1")} />
                        </button>
                    </div>

                    {isCapoMode && (
                        <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-xl">
                            <Check className="w-4 h-4 text-accent" />
                            <p className="text-sm font-medium">
                                Play in <strong>{capo.shape}</strong> shapes with <strong>Capo {capo.fret}</strong>
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Content */}
            <main>
                {state?.currentSongMap?.sections.map((section, i) => (
                    <React.Fragment key={section.id}>
                        {renderSection(section)}
                    </React.Fragment>
                ))}
            </main>
        </div>
    );
}
