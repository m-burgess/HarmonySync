/*
  Typed audio service client wrapper.
  This file uses generated types at `./audio-api` (created by `npx openapi-typescript`).
  Run `npm run generate:audio-api` from the `harmonysync` folder to refresh types.
*/

import type {
  HealthResponse,
  TrackLoadRequest,
  VolumeRequest,
  PanRequest,
  MuteRequest,
  MixerState,
  CrossfadeRequest,
} from './audio-api'

// Song types
export interface CreateSongRequest {
  name: string
  trackPaths: string[]
}

export interface CreateSongResponse {
  success: boolean
  songId: string
}

export interface SongState {
  id: string
  name: string
  isPlaying: boolean
  trackCount: number
  tracks: Array<{
    id: string
    name: string
    isPlaying: boolean
    volume: number
    pan: number
    isMuted: boolean
  }>
}

export interface GetSongsResponse {
  success: boolean
  songs: SongState[]
}

export interface GetSongResponse {
  success: boolean
  song: SongState
}

const DEFAULT_BASE = 'http://127.0.0.1:3001'
const base = (import.meta.env.VITE_AUDIO_SERVICE_URL as string) || DEFAULT_BASE

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, opts)
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`API ${opts.method || 'GET'} ${path} failed: ${res.status} ${txt}`)
  }
  return (await res.json()) as T
}

export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health')
}

export async function shutdown(token?: string): Promise<{status: string}> {
  const headers: Record<string,string> = {'Content-Type':'application/json'}
  if (token) headers['x-shutdown-token'] = token
  return request('/api/shutdown', {method: 'POST', headers})
}

export async function loadTrack(payload: TrackLoadRequest): Promise<{trackId: string, success: boolean}> {
  return request('/api/tracks/load', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)})
}

export async function clearTracks(): Promise<void> {
  await request('/api/tracks/clear', {method: 'POST'})
}

export async function playTrack(trackId: string): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}/play`, {method: 'POST'})
}

export async function stopTrack(trackId: string): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}/stop`, {method: 'POST'})
}

export async function setTrackVolume(trackId: string, body: VolumeRequest): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}/volume`, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
}

export async function setTrackPan(trackId: string, body: PanRequest): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}/pan`, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
}

export async function muteTrack(trackId: string, body: MuteRequest): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}/mute`, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
}

export async function removeTrack(trackId: string): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(trackId)}`, {method: 'DELETE'})
}

export async function playAll(): Promise<void> {
  await request('/api/mixer/play-all', {method: 'POST'})
}

export async function stopAll(): Promise<void> {
  await request('/api/mixer/stop-all', {method: 'POST'})
}

export async function setMasterVolume(body: VolumeRequest): Promise<void> {
  await request('/api/mixer/master-volume', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
}

export async function getMixerState(): Promise<MixerState> {
  return request<MixerState>('/api/mixer/state')
}

export async function crossfade(req: CrossfadeRequest): Promise<void> {
  await request('/api/mixer/crossfade', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(req)})
}

export async function applyDefaultPanning(): Promise<void> {
  await request('/api/mixer/apply-default-panning', {method: 'POST'})
}

export async function getCrossfadeStatus(): Promise<{active: boolean, remaining_ms?: number}> {
  return request('/api/mixer/crossfade-status')
}

export async function clearMixer(): Promise<void> {
  await request('/api/mixer/clear', {method: 'DELETE'})
}

export async function setCrossfadeDuration(duration: number): Promise<void> {
  await request('/api/mixer/crossfade-duration', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ duration })})
}

export async function createSong(body: CreateSongRequest): Promise<CreateSongResponse> {
  return request('/api/songs/create', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
}

export async function playSong(songId: string): Promise<void> {
  await request(`/api/songs/${encodeURIComponent(songId)}/play`, {method: 'POST'})
}

export async function stopSong(songId: string): Promise<void> {
  await request(`/api/songs/${encodeURIComponent(songId)}/stop`, {method: 'POST'})
}

export async function removeSong(songId: string): Promise<void> {
  await request(`/api/songs/${encodeURIComponent(songId)}`, {method: 'DELETE'})
}

export async function getSongs(): Promise<GetSongsResponse> {
  return request('/api/songs', {method: 'GET'})
}

export async function getSong(songId: string): Promise<GetSongResponse> {
  return request(`/api/songs/${encodeURIComponent(songId)}`, {method: 'GET'})
}

export default {
  health,
  shutdown,
  loadTrack,
  clearTracks,
  playTrack,
  stopTrack,
  setTrackVolume,
  setTrackPan,
  muteTrack,
  removeTrack,
  playAll,
  stopAll,
  setMasterVolume,
  getMixerState,
  crossfade,
  applyDefaultPanning,
  getCrossfadeStatus,
  clearMixer,
  createSong,
  playSong,
  stopSong,
  removeSong,
  getSongs,
  getSong,
}
