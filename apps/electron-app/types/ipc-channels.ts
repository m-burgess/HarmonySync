/**
 * IPC Channel Type Definitions
 * Defines all IPC communication channels between renderer and main process
 */

// ==================== Dialog Channels ====================

export interface DialogOpenDirectoryOptions {
  multiple?: boolean;
}

export type DialogOpenDirectoryChannel = 'dialog:openDirectory';
export type DialogOpenFileChannel = 'dialog:openFile';

export interface FileFilter {
  name: string;
  extensions: string[];
}

// ==================== File System Channels ====================

export type FSReadFileChannel = 'fs:readFile';
export type FSWriteFileChannel = 'fs:writeFile';
export type FSReadDirChannel = 'fs:readDir';
export type FSExistsChannel = 'fs:exists';
export type FSMkdirChannel = 'fs:mkdir';
export type FSCopyFileChannel = 'fs:copyFile';

// ==================== Database Channels ====================

export type DBQueryChannel = 'db:query';
export type DBRunChannel = 'db:run';
export type DBGetChannel = 'db:get';
export type DBAllChannel = 'db:all';

// ==================== FFmpeg Channels ====================

export type FFmpegConvertToOggChannel = 'ffmpeg:convertToOgg';
export type FFmpegTransposeAudioChannel = 'ffmpeg:transposeAudio';
export type FFmpegGetVideoMetadataChannel = 'ffmpeg:getVideoMetadata';
export type FFmpegTranscodeVideoChannel = 'ffmpeg:transcodeVideo';
export type FFmpegGenerateThumbnailChannel = 'ffmpeg:generateThumbnail';

// ==================== Audio Service Channels ====================

export type AudioConvertToOggChannel = 'audio:convertToOgg';
export type AudioTransposeChannel = 'audio:transposeAudio';
export type AudioGetMetadataChannel = 'audio:getMetadata';
export type AudioNormalizeChannel = 'audio:normalize';
export type AudioEnsureSyncChannel = 'audio:ensureSync';

// ==================== Window Channels ====================

export type WindowShowAudienceChannel = 'window:showAudience';
export type WindowHideAudienceChannel = 'window:hideAudience';
export type WindowShowConfidenceChannel = 'window:showConfidence';
export type WindowHideConfidenceChannel = 'window:hideConfidence';
export type WindowShowLowerThirdsChannel = 'window:showLowerThirds';
export type WindowHideLowerThirdsChannel = 'window:hideLowerThirds';
export type WindowOpenPreserviceMusicChannel = 'open_preservice_music_window';
export type WindowClosePreserviceMusicChannel = 'close_preservice_music_window';
export type WindowOpenSchedulerChannel = 'open_scheduler_window';

// ==================== Display Channels ====================

export type DisplayVideoSlideChannel = 'display:videoSlide';
export type DisplaySlideChannel = 'display:slide';
export type DisplayClearAllChannel = 'display:clearAll';
export type DisplayBlackScreenChannel = 'display:blackScreen';
export type DisplayBroadcastChannel = 'display:broadcast';
export type DisplayUpdateLowerThirdsChannel = 'display:updateLowerThirds';

// ==================== Display Config Channels ====================

export type DisplayConfigGetAllChannel = 'displayConfig:getAll';
export type DisplayConfigGetChannel = 'displayConfig:get';
export type DisplayConfigGetEnabledChannel = 'displayConfig:getEnabled';
export type DisplayConfigCreateChannel = 'displayConfig:create';
export type DisplayConfigUpdateChannel = 'displayConfig:update';
export type DisplayConfigDeleteChannel = 'displayConfig:delete';
export type DisplayConfigReorderChannel = 'displayConfig:reorder';

// ==================== Image Service Channels ====================

export type ImageAddTextOverlayChannel = 'image:addTextOverlay';
export type ImageGenerateThumbnailChannel = 'image:generateThumbnail';
export type ImageClearCacheChannel = 'image:clearCache';
export type ImageImportPPTXChannel = 'image:importPPTX';
export type ImageImportPDFChannel = 'image:importPDF';

// ==================== Video Service Channels ====================

export type VideoGetMetadataChannel = 'video:getMetadata';
export type VideoTranscodeChannel = 'video:transcode';
export type VideoGenerateThumbnailChannel = 'video:generateThumbnail';

// ==================== Text/CSS Service Channels ====================

export type TextRenderChannel = 'text:render';
export type CSSGenerateBackgroundChannel = 'css:generateBackground';

// ==================== Lyrics Service Channels ====================

export type LyricsFetchChannel = 'lyrics:fetch';
export type LyricsSearchChannel = 'lyrics:search';

// ==================== Cloud Storage Channels ====================

export type GDriveAuthChannel = 'gdrive:auth';
export type GDriveListFilesChannel = 'gdrive:listFiles';
export type GDriveDownloadFileChannel = 'gdrive:downloadFile';
export type GDriveSyncFolderChannel = 'gdrive:syncFolder';

export type DropboxAuthChannel = 'dropbox:auth';
export type DropboxListFilesChannel = 'dropbox:listFiles';
export type DropboxDownloadFileChannel = 'dropbox:downloadFile';
export type DropboxSyncFolderChannel = 'dropbox:syncFolder';

// ==================== YouTube Service Channels ====================

export type YouTubeDownloadChannel = 'youtube:download';
export type YouTubeGetInfoChannel = 'youtube:getInfo';

// ==================== Scheduler Service Channels ====================

export type SchedulerGetEventsChannel = 'scheduler:getEvents';
export type SchedulerCreateEventChannel = 'scheduler:createEvent';
export type SchedulerUpdateEventChannel = 'scheduler:updateEvent';
export type SchedulerDeleteEventChannel = 'scheduler:deleteEvent';
export type SchedulerGetUpcomingChannel = 'scheduler:getUpcoming';

// ==================== Macro Service Channels ====================

export type MacroGetAllChannel = 'macro:getAll';
export type MacroCreateChannel = 'macro:create';
export type MacroUpdateChannel = 'macro:update';
export type MacroDeleteChannel = 'macro:delete';
export type MacroExecuteChannel = 'macro:execute';

// ==================== Script Service Channels ====================

export type ScriptExecuteChannel = 'script:execute';
export type ScriptListChannel = 'script:list';
export type ScriptSaveChannel = 'script:save';
export type ScriptDeleteChannel = 'script:delete';

// ==================== Event Trigger Service Channels ====================

export type EventEmitChannel = 'event:emit';
export type EventListChannel = 'event:list';
export type EventRegisterChannel = 'event:register';
export type EventUnregisterChannel = 'event:unregister';

// ==================== Slides Service Channels ====================

export type SlidesImportChannel = 'slides:import';
export type SlidesExportChannel = 'slides:export';
export type SlidesGetAllChannel = 'slides:getAll';
export type SlidesCreateChannel = 'slides:create';
export type SlidesUpdateChannel = 'slides:update';
export type SlidesDeleteChannel = 'slides:delete';

// ==================== MIDI Service Channels ====================

export type MIDIListDevicesChannel = 'midi:listDevices';
export type MIDIConnectChannel = 'midi:connect';
export type MIDIDisconnectChannel = 'midi:disconnect';
export type MIDISendChannel = 'midi:send';

// ==================== Remote Control Service Channels ====================

export type RemoteControlStartChannel = 'remoteControl:start';
export type RemoteControlStopChannel = 'remoteControl:stop';
export type RemoteControlGetStatusChannel = 'remoteControl:getStatus';

// ==================== HTTP Server Channels ====================

export type HTTPGetServerUrlChannel = 'http:getServerUrl';
export type HTTPStartServerChannel = 'http:startServer';
export type HTTPStopServerChannel = 'http:stopServer';

// ==================== Union Type of All IPC Channels ====================

export type IPCChannel =
  | DialogOpenDirectoryChannel
  | DialogOpenFileChannel
  | FSReadFileChannel
  | FSWriteFileChannel
  | FSReadDirChannel
  | FSExistsChannel
  | FSMkdirChannel
  | FSCopyFileChannel
  | DBQueryChannel
  | DBRunChannel
  | DBGetChannel
  | DBAllChannel
  | FFmpegConvertToOggChannel
  | FFmpegTransposeAudioChannel
  | FFmpegGetVideoMetadataChannel
  | FFmpegTranscodeVideoChannel
  | FFmpegGenerateThumbnailChannel
  | AudioConvertToOggChannel
  | AudioTransposeChannel
  | AudioGetMetadataChannel
  | AudioNormalizeChannel
  | AudioEnsureSyncChannel
  | WindowShowAudienceChannel
  | WindowHideAudienceChannel
  | WindowShowConfidenceChannel
  | WindowHideConfidenceChannel
  | WindowShowLowerThirdsChannel
  | WindowHideLowerThirdsChannel
  | WindowOpenPreserviceMusicChannel
  | WindowClosePreserviceMusicChannel
  | WindowOpenSchedulerChannel
  | DisplayVideoSlideChannel
  | DisplaySlideChannel
  | DisplayClearAllChannel
  | DisplayBlackScreenChannel
  | DisplayBroadcastChannel
  | DisplayUpdateLowerThirdsChannel
  | DisplayConfigGetAllChannel
  | DisplayConfigGetChannel
  | DisplayConfigGetEnabledChannel
  | DisplayConfigCreateChannel
  | DisplayConfigUpdateChannel
  | DisplayConfigDeleteChannel
  | DisplayConfigReorderChannel
  | ImageAddTextOverlayChannel
  | ImageGenerateThumbnailChannel
  | ImageClearCacheChannel
  | ImageImportPPTXChannel
  | ImageImportPDFChannel
  | VideoGetMetadataChannel
  | VideoTranscodeChannel
  | VideoGenerateThumbnailChannel
  | TextRenderChannel
  | CSSGenerateBackgroundChannel
  | LyricsFetchChannel
  | LyricsSearchChannel
  | GDriveAuthChannel
  | GDriveListFilesChannel
  | GDriveDownloadFileChannel
  | GDriveSyncFolderChannel
  | DropboxAuthChannel
  | DropboxListFilesChannel
  | DropboxDownloadFileChannel
  | DropboxSyncFolderChannel
  | YouTubeDownloadChannel
  | YouTubeGetInfoChannel
  | SchedulerGetEventsChannel
  | SchedulerCreateEventChannel
  | SchedulerUpdateEventChannel
  | SchedulerDeleteEventChannel
  | SchedulerGetUpcomingChannel
  | MacroGetAllChannel
  | MacroCreateChannel
  | MacroUpdateChannel
  | MacroDeleteChannel
  | MacroExecuteChannel
  | ScriptExecuteChannel
  | ScriptListChannel
  | ScriptSaveChannel
  | ScriptDeleteChannel
  | EventEmitChannel
  | EventListChannel
  | EventRegisterChannel
  | EventUnregisterChannel
  | SlidesImportChannel
  | SlidesExportChannel
  | SlidesGetAllChannel
  | SlidesCreateChannel
  | SlidesUpdateChannel
  | SlidesDeleteChannel
  | MIDIListDevicesChannel
  | MIDIConnectChannel
  | MIDIDisconnectChannel
  | MIDISendChannel
  | RemoteControlStartChannel
  | RemoteControlStopChannel
  | RemoteControlGetStatusChannel
  | HTTPGetServerUrlChannel
  | HTTPStartServerChannel
  | HTTPStopServerChannel;

// ==================== IPC Event Channels ====================

export type IPCEventChannel =
  | 'ogg-conversion-progress'
  | 'audio-conversion-progress'
  | 'video-transcoding-progress'
  | 'slide-import-progress'
  | 'sync-progress'
  | 'midi-message'
  | 'remote-control-event'
  | 'scheduler-reminder'
  | 'script-output'
  | 'script-error';
