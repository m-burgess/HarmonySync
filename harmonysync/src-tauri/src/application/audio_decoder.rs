use std::path::Path;
use std::sync::Arc;
use dashmap::DashMap;
use once_cell::sync::Lazy;
use serde::{Serialize, Deserialize};
use symphonia::core::audio::{AudioBufferRef, Signal};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use log::{info, error, warn};

/// Decoded audio data with metadata
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DecodedAudio {
    /// Audio samples as f32 (normalized to -1.0 to 1.0)
    pub samples: Vec<f32>,
    /// Number of channels (1 = mono, 2 = stereo, etc.)
    pub channels: usize,
    /// Sample rate (e.g., 44100, 48000)
    pub sample_rate: u32,
    /// Duration in seconds
    pub duration: f64,
    /// Original file path
    pub path: String,
}

/// Lightweight metadata without samples (for fast transfer)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AudioMetadata {
    /// Number of channels (1 = mono, 2 = stereo, etc.)
    pub channels: usize,
    /// Sample rate (e.g., 44100, 48000)
    pub sample_rate: u32,
    /// Duration in seconds
    pub duration: f64,
    /// Original file path
    pub path: String,
    /// Total number of samples (includes all channels)
    pub sample_count: usize,
}

/// Memory statistics for the audio cache
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AudioCacheStats {
    /// Number of cached audio files
    pub count: usize,
    /// Total memory used by audio buffers in bytes
    pub memory_bytes: usize,
    /// Memory in megabytes (for convenience)
    pub memory_mb: f64,
}

/// Global audio buffer cache using DashMap for thread-safe access
static AUDIO_CACHE: Lazy<Arc<DashMap<String, Arc<DecodedAudio>>>> = 
    Lazy::new(|| Arc::new(DashMap::new()));

/// Decode an audio file using Symphonia
/// 
/// Supports: MP3, OGG/Vorbis, FLAC, WAV, AAC, and more
/// Returns normalized f32 samples ready for Web Audio API
pub fn decode_audio_file<P: AsRef<Path>>(path: P) -> Result<DecodedAudio, String> {
    let path = path.as_ref();
    let path_str = path.to_string_lossy().to_string();
    
    let start_time = std::time::Instant::now();
    info!("Decoding audio file: {}", path_str);

    // Open the file
    let file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;

    // Create a media source stream
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Create a hint to help the format registry guess the format
    let mut hint = Hint::new();
    if let Some(extension) = path.extension() {
        hint.with_extension(&extension.to_string_lossy());
    }

    // Probe the media source
    let format_opts = FormatOptions::default();
    let metadata_opts = MetadataOptions::default();
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| format!("Failed to probe file: {}", e))?;

    let mut format = probed.format;

    // Find the first audio track
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| "No audio track found".to_string())?;

    let track_id = track.id;
    let codec_params = &track.codec_params;

    // Get audio metadata
    let sample_rate = codec_params.sample_rate.ok_or("No sample rate found")?;
    let channels = codec_params.channels.ok_or("No channel info found")?.count();

    info!("Audio info - Sample rate: {}Hz, Channels: {}", sample_rate, channels);

    // Create a decoder
    let decoder_opts = DecoderOptions::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &decoder_opts)
        .map_err(|e| format!("Failed to create decoder: {}", e))?;

    // Decode all packets and collect samples
    // Pre-allocate capacity based on estimated duration (reduces reallocations)
    let estimated_capacity = if let Some(n_frames) = codec_params.n_frames {
        (n_frames as usize) * channels
    } else {
        // Estimate 3 minutes at given sample rate if unknown
        sample_rate as usize * channels * 180
    };
    
    let mut all_samples: Vec<f32> = Vec::with_capacity(estimated_capacity);
    let mut total_frames = 0u64;

    loop {
        // Read the next packet
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
                info!("End of audio stream reached");
                break;
            }
            Err(e) => {
                error!("Error reading packet: {}", e);
                break;
            }
        };

        // Skip packets not from our track
        if packet.track_id() != track_id {
            continue;
        }

        // Decode the packet
        match decoder.decode(&packet) {
            Ok(decoded) => {
                // Convert the decoded audio to f32 samples
                let samples = convert_audio_buffer_to_f32(&decoded, channels);
                total_frames += (samples.len() / channels) as u64;
                all_samples.extend_from_slice(&samples);
            }
            Err(SymphoniaError::DecodeError(err)) => {
                warn!("Decode error: {}", err);
                continue;
            }
            Err(e) => {
                error!("Fatal decode error: {}", e);
                return Err(format!("Decode error: {}", e));
            }
        }
    }
    
    // Shrink to fit actual size (free unused capacity)
    all_samples.shrink_to_fit();

    // Calculate duration
    let duration = total_frames as f64 / sample_rate as f64;
    
    let decode_time = start_time.elapsed();

    info!(
        "Decoded {} samples ({:.2}s) from {} in {:.2}ms",
        all_samples.len(),
        duration,
        path_str,
        decode_time.as_secs_f64() * 1000.0
    );

    Ok(DecodedAudio {
        samples: all_samples,
        channels,
        sample_rate,
        duration,
        path: path_str,
    })
}

/// Convert AudioBufferRef to Vec<f32> with normalized samples
fn convert_audio_buffer_to_f32(buffer: &AudioBufferRef, channels: usize) -> Vec<f32> {
    match buffer {
        AudioBufferRef::U8(buf) => {
            // Convert u8 to f32 (0-255 -> -1.0 to 1.0)
            interleave_channels_u8(buf, channels)
        }
        AudioBufferRef::U16(buf) => {
            // Convert u16 to f32
            interleave_channels_u16(buf, channels)
        }
        AudioBufferRef::U24(buf) => {
            // Convert u24 to f32
            interleave_channels_u24(buf, channels)
        }
        AudioBufferRef::U32(buf) => {
            // Convert u32 to f32
            interleave_channels_u32(buf, channels)
        }
        AudioBufferRef::S8(buf) => {
            // Convert i8 to f32
            interleave_channels_i8(buf, channels)
        }
        AudioBufferRef::S16(buf) => {
            // Convert i16 to f32
            interleave_channels_i16(buf, channels)
        }
        AudioBufferRef::S24(buf) => {
            // Convert i24 to f32
            interleave_channels_i24(buf, channels)
        }
        AudioBufferRef::S32(buf) => {
            // Convert i32 to f32
            interleave_channels_i32(buf, channels)
        }
        AudioBufferRef::F32(buf) => {
            // Already f32, just interleave channels
            interleave_channels_f32(buf, channels)
        }
        AudioBufferRef::F64(buf) => {
            // Convert f64 to f32
            interleave_channels_f64(buf, channels)
        }
    }
}

// Helper functions to interleave channels for different sample formats
fn interleave_channels_u8(buf: &symphonia::core::audio::AudioBuffer<u8>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            // u8: 0-255 -> -1.0 to 1.0
            output.push((sample as f32 - 128.0) / 128.0);
        }
    }
    output
}

fn interleave_channels_u16(buf: &symphonia::core::audio::AudioBuffer<u16>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            output.push((sample as f32 - 32768.0) / 32768.0);
        }
    }
    output
}

fn interleave_channels_u24(buf: &symphonia::core::audio::AudioBuffer<symphonia::core::sample::u24>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx].inner();
            output.push((sample as f32 - 8388608.0) / 8388608.0);
        }
    }
    output
}

fn interleave_channels_u32(buf: &symphonia::core::audio::AudioBuffer<u32>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            output.push((sample as f64 - 2147483648.0) as f32 / 2147483648.0);
        }
    }
    output
}

fn interleave_channels_i8(buf: &symphonia::core::audio::AudioBuffer<i8>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            output.push(sample as f32 / 128.0);
        }
    }
    output
}

fn interleave_channels_i16(buf: &symphonia::core::audio::AudioBuffer<i16>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            output.push(sample as f32 / 32768.0);
        }
    }
    output
}

fn interleave_channels_i24(buf: &symphonia::core::audio::AudioBuffer<symphonia::core::sample::i24>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx].inner();
            output.push(sample as f32 / 8388608.0);
        }
    }
    output
}

fn interleave_channels_i32(buf: &symphonia::core::audio::AudioBuffer<i32>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            let sample = buf.chan(ch)[frame_idx];
            output.push(sample as f32 / 2147483648.0);
        }
    }
    output
}

fn interleave_channels_f32(buf: &symphonia::core::audio::AudioBuffer<f32>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            output.push(buf.chan(ch)[frame_idx]);
        }
    }
    output
}

fn interleave_channels_f64(buf: &symphonia::core::audio::AudioBuffer<f64>, channels: usize) -> Vec<f32> {
    let mut output = Vec::with_capacity(buf.frames() * channels);
    for frame_idx in 0..buf.frames() {
        for ch in 0..channels {
            output.push(buf.chan(ch)[frame_idx] as f32);
        }
    }
    output
}

/// Get audio from cache or decode it
pub fn get_or_decode_audio<P: AsRef<Path>>(path: P) -> Result<Arc<DecodedAudio>, String> {
    let path = path.as_ref();
    let path_str = path.to_string_lossy().to_string();

    // Check cache first
    if let Some(cached) = AUDIO_CACHE.get(&path_str) {
        info!("Audio cache hit: {}", path_str);
        return Ok(cached.clone());
    }

    // Cache miss - decode the file
    info!("Audio cache miss: {}", path_str);
    let decoded = decode_audio_file(path)?;
    let arc_decoded = Arc::new(decoded);
    
    // Store in cache
    AUDIO_CACHE.insert(path_str.clone(), arc_decoded.clone());
    
    Ok(arc_decoded)
}

/// Clear the audio cache
pub fn clear_audio_cache() {
    let count = AUDIO_CACHE.len();
    AUDIO_CACHE.clear();
    info!("Cleared audio cache ({} items)", count);
}

/// Remove a specific file from the cache
pub fn remove_from_cache<P: AsRef<Path>>(path: P) {
    let path_str = path.as_ref().to_string_lossy().to_string();
    if AUDIO_CACHE.remove(&path_str).is_some() {
        info!("Removed from cache: {}", path_str);
    }
}

/// Get cache statistics
pub fn get_cache_stats() -> AudioCacheStats {
    let count = AUDIO_CACHE.len();
    
    let memory_bytes: usize = AUDIO_CACHE.iter()
        .map(|entry| {
            let decoded = entry.value();
            // Calculate memory: samples + overhead
            let samples_size = decoded.samples.len() * std::mem::size_of::<f32>();
            let string_size = decoded.path.len();
            samples_size + string_size + std::mem::size_of::<DecodedAudio>()
        })
        .sum();
    
    let memory_mb = memory_bytes as f64 / (1024.0 * 1024.0);
    
    AudioCacheStats {
        count,
        memory_bytes,
        memory_mb,
    }
}

/// Get audio metadata without samples (fast, small transfer)
pub fn get_audio_metadata<P: AsRef<Path>>(path: P) -> Result<AudioMetadata, String> {
    let decoded = get_or_decode_audio(path)?;
    
    Ok(AudioMetadata {
        channels: decoded.channels,
        sample_rate: decoded.sample_rate,
        duration: decoded.duration,
        path: decoded.path.clone(),
        sample_count: decoded.samples.len(),
    })
}

/// Get audio samples as bytes (binary transfer, fast)
pub fn get_audio_samples_binary<P: AsRef<Path>>(path: P) -> Result<Vec<u8>, String> {
    let decoded = get_or_decode_audio(path)?;
    
    // Convert f32 samples to bytes (little-endian)
    let bytes: Vec<u8> = decoded.samples
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    
    info!("Converted {} samples to {} bytes", decoded.samples.len(), bytes.len());
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_operations() {
        clear_audio_cache();
        
        let stats = get_cache_stats();
        assert_eq!(stats.count, 0);
        assert_eq!(stats.memory_bytes, 0);
    }
}
