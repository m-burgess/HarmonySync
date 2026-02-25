
export interface ServiceTime {
    id: string;
    name: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
}

export interface ServiceOrderSettings {
    watchFolder: string;
    autoImportOnStartup: boolean;
    cleanupOldServices: boolean;
    maxServiceAge: number;
    advanceOnVideoEnd: boolean;
    lastImportedService?: string;
}

export interface LyricsProjectionSettings {
    fontFamily: string;
    fontSize: number; // in pixels
    fontWeight: string;
    color: string;
    textShadow: string;
    textAlign: 'left' | 'center' | 'right';
    verticalAlignment: 'top' | 'middle' | 'bottom';
    bottomOffset: number; // percentage or pixels? Let's use percentage 0-100
    topOffset: number;
}

export interface AudioSettings {
    audioOutputDevice: string;
    midiInputDevice: string;
    midiOutputDevice: string;
}

export interface DisplayConfig {
    id: string;
    name: string;
    type: 'audience' | 'confidence' | 'lower-thirds' | 'lyrics' | 'scripture' | 'graphics' | 'custom';
    deviceId?: string;
    ndiOutput?: string;
    enabled: boolean;
}

export interface AppSettings {
    serviceOrder: ServiceOrderSettings;
    preServicePlaylistStartTime: string;
    countdownVideoStartTime: string;
    preservicePlaylistUrl?: string;
    serviceTimes: ServiceTime[];
    mixer: {
        masterVolume: number;
        trackDefaults: {
            name: string;
            volume: number;
            pan: number;
        }[];
    };
    lyrics: LyricsProjectionSettings;
    displayConfigs: DisplayConfig[];
    audio: AudioSettings;
}

export interface AppConfig {
    settings: AppSettings;
    userPreferences: Record<string, any>;
}
