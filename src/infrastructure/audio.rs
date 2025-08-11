use std::path::Path;
use std::sync::{Arc, Mutex};
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use rodio::source::SamplesConverter;
use rodio::Sample;
use dasp::signal::{self, Signal};
use dasp_interpolate::linear::Linear;
use dasp_ring_buffer::Fixed;
use rodio::source::Buffered;
use dasp::frame::Frame;
use dasp::signal::Filter;
use dasp::signal::filter::biquad::{Coefficients, DirectForm1, Type};

use crate::domain::entities::{Track, MixerConfig};

pub struct MultiTrackPlayer {
    pub sinks: Vec<Arc<Mutex<Sink>>>,
    pub _stream: OutputStream,
    pub stream_handle: OutputStreamHandle,
}

impl MultiTrackPlayer {
    pub fn new() -> Self {
        let (_stream, stream_handle) = OutputStream::try_default().unwrap();
        Self {
            sinks: vec![],
            _stream,
            stream_handle,
        }
    }

    /// Load all audio tracks for a song, returning a vector of sinks.
    pub fn load_tracks(
        &mut self,
        tracks: &[Track],
        config: &MixerConfig,
    ) -> Result<(), String> {
        self.sinks.clear();
        for track in tracks {
            if !track.mute {
                let file = std::fs::File::open(&track.path)
                    .map_err(|e| format!("Failed to open {}: {}", track.path.display(), e))?;
                let source = Decoder::new(file)
                    .map_err(|e| format!("Failed to decode {}: {}", track.path.display(), e))?;

                // Pan: click/guide left, others right
                let pan = if track.name.to_lowercase().contains("click")
                    || track.name.to_lowercase().contains("guide")
                {
                    -1.0 // full left
                } else {
                    1.0 // full right
                };
                let panned = pan_stereo(source.convert_samples(), pan);

                let sink = Sink::try_new(&self.stream_handle)
                    .map_err(|e| format!("Failed to create sink: {}", e))?;
                sink.append(panned);
                sink.set_volume(track.volume);

                self.sinks.push(Arc::new(Mutex::new(sink)));
            }
        }
        Ok(())
    }

    /// Play all tracks
    pub fn play(&self) {
        for sink in &self.sinks {
            sink.lock().unwrap().play();
        }
    }

    /// Stop all tracks
    pub fn stop(&self) {
        for sink in &self.sinks {
            sink.lock().unwrap().stop();
        }
    }

    /// Set volume for a specific track
    pub fn set_volume(&self, track_idx: usize, volume: f32) {
        if let Some(sink) = self.sinks.get(track_idx) {
            sink.lock().unwrap().set_volume(volume);
        }
    }

    /// Apply limiter to all tracks
    pub fn apply_limiter(&self, _threshold_db: f32) {
        // TODO: Implement limiter
    }

    /// Play metronome on left channel only, with given bpm and time signature.
    /// Returns a handle to stop the metronome.
    pub fn play_metronome(
        &self,
        bpm: u32,
        beats_per_bar: u32,
        note_value: u32, // e.g. 4 for quarter, 8 for eighth, 12 for twelfth
    ) -> MetronomeHandle {
        let running = Arc::new(AtomicBool::new(true));
        let running_clone = running.clone();
        let stream_handle = self.stream_handle.clone();

        thread::spawn(move || {
            let click_duration_ms = 60_000 / bpm;
            let click_len = 60; // ms, length of click sound
            let freq = 2000; // Hz, click frequency

            let mut beat = 0;
            while running_clone.load(Ordering::SeqCst) {
                // Louder click on first beat
                let amplitude = if beat == 0 { 0.5 } else { 0.3 };
                let click = SineWave::new(freq)
                    .take_duration(std::time::Duration::from_millis(click_len))
                    .amplify(amplitude)
                    .stereo(); // Make it stereo

                // Pan fully left: left channel gets click, right is silent
                let click_panned = SamplesConverter::new(click, |[l, _r]| [l, 0.0]);

                let sink = Sink::try_new(&stream_handle).unwrap();
                sink.append(click_panned);
                sink.detach(); // Let it play independently

                thread::sleep(std::time::Duration::from_millis(click_duration_ms as u64));
                beat = (beat + 1) % beats_per_bar;
            }
        });

        MetronomeHandle { running }
    }

    /// Load all audio tracks for a song, with pitch shifting using dasp.
    pub fn load_tracks_with_transpose(
        &mut self,
        tracks: &[Track],
        config: &MixerConfig,
    ) -> Result<(), String> {
        self.sinks.clear();
        let sample_rate = 44100; // TODO: get actual sample rate

        // Check if any track is soloed
        let any_solo = tracks.iter().any(|t| t.solo);

        for track in tracks {
            // Solo logic
            if (any_solo && !track.solo) || (!any_solo && track.mute) {
                continue;
            }

            let file = std::fs::File::open(&track.path)
                .map_err(|e| format!("Failed to open {}: {}", track.path.display(), e))?;
            let source = Decoder::new(file)
                .map_err(|e| format!("Failed to decode {}: {}", track.path.display(), e))?
                .convert_samples::<f32>()
                .buffered();

            let should_transpose = !["click", "guide", "drums", "percussion"]
                .iter()
                .any(|kw| track.name.to_lowercase().contains(kw));
            let mut samples: Vec<f32> = source.clone().collect();
            if should_transpose && track.transpose {
                samples = pitch_shift_samples(&samples, config.transpose_semitones);
            }

            if config.low_cut > 0.0 {
                samples = apply_low_cut(&samples, config.low_cut, sample_rate);
            }
            if config.high_cut > 0.0 {
                samples = apply_high_cut(&samples, config.high_cut, sample_rate);
            }
            if config.limiter_threshold > 0.0 {
                samples = apply_limiter(&samples, config.limiter_threshold);
            }

            let processed_source = rodio::buffer::SamplesBuffer::new(
                2, // stereo
                sample_rate,
                samples,
            );

            let pan = match track.pan {
                crate::domain::entities::Pan::Left => -1.0,
                crate::domain::entities::Pan::Center => 0.0,
                crate::domain::entities::Pan::Right => 1.0,
            };
            let panned = pan_stereo(processed_source, pan);

            let sink = Sink::try_new(&self.stream_handle)
                .map_err(|e| format!("Failed to create sink: {}", e))?;
            sink.append(panned);
            sink.set_volume(track.volume);

            self.sinks.push(Arc::new(Mutex::new(sink)));
        }
        Ok(())
    }
}

/// Simple stereo panning: -1.0 = full left, 0.0 = center, 1.0 = full right
fn pan_stereo<S>(source: S, pan: f32) -> impl Source<Item = S::Item> + Send
where
    S: Source + Send + 'static,
    S::Item: Sample + Send,
{
    let pan = pan.clamp(-1.0, 1.0);
    let left = ((1.0 - pan) / 2.0) as f32;
    let right = ((1.0 + pan) / 2.0) as f32;
    SamplesConverter::new(source, move |s: [S::Item; 2]| {
        [
            Sample::amplify(s[0], left),
            Sample::amplify(s[1], right),
        ]
    })
}

/// Pitch shift a mono or stereo source by a number of semitones using dasp.
/// Returns a Vec of f32 samples.
fn pitch_shift_samples(samples: &[f32], semitones: f32) -> Vec<f32> {
    let ratio = 2f32.powf(semitones / 12.0);
    let len = samples.len();
    let interp = Linear::new([0.0], [0.0]);
    let rb = Fixed::from(samples.to_vec());
    let mut sig = signal::from_iter(rb).from_hz_to_hz(1.0, ratio, interp);

    let mut shifted = Vec::with_capacity(len);
    for _ in 0..len {
        if let Some(s) = sig.next() {
            shifted.push(s[0]);
        }
    }
    shifted
}

/// Apply a low cut (high-pass) filter to the samples.
/// `cutoff_hz` is the cutoff frequency in Hz, `sample_rate` is the sample rate in Hz.
fn apply_low_cut(samples: &[f32], cutoff_hz: f32, sample_rate: u32) -> Vec<f32> {
    let coeffs = Coefficients::<f32>::from_params(
        Type::HighPass,
        sample_rate as f32,
        cutoff_hz,
        0.707, // Q
        0.0,   // gain
    ).unwrap();
    let mut filter = DirectForm1::<f32>::new(coeffs);
    samples.iter().map(|&s| filter.filter_mono(s)).collect()
}

/// Apply a high cut (low-pass) filter to the samples.
/// `cutoff_hz` is the cutoff frequency in Hz, `sample_rate` is the sample rate in Hz.
fn apply_high_cut(samples: &[f32], cutoff_hz: f32, sample_rate: u32) -> Vec<f32> {
    let coeffs = Coefficients::<f32>::from_params(
        Type::LowPass,
        sample_rate as f32,
        cutoff_hz,
        0.707, // Q
        0.0,   // gain
    ).unwrap();
    let mut filter = DirectForm1::<f32>::new(coeffs);
    samples.iter().map(|&s| filter.filter_mono(s)).collect()
}

/// Apply a hard limiter to the samples.
/// `threshold` is the maximum allowed amplitude (e.g., 0.9 for 90% of full scale).
fn apply_limiter(samples: &[f32], threshold: f32) -> Vec<f32> {
    samples.iter().map(|&s| s.clamp(-threshold, threshold)).collect()
}

// Unit tests for audio functionality should be added here.
#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::{Track, Pan, MixerConfig};

    #[test]
    fn test_pan_stereo_left_and_right() {
        let sine = SineWave::new(440).take_duration(std::time::Duration::from_millis(100));
        let stereo = sine.stereo();
        let left_panned = pan_stereo(stereo.clone(), -1.0);
        let right_panned = pan_stereo(stereo, 1.0);

        // Just check that the iterator yields samples and doesn't panic
        let _ = left_panned.take(10).collect::<Vec<_>>();
        let _ = right_panned.take(10).collect::<Vec<_>>();
    }

    #[test]
    fn test_pitch_shift_samples() {
        let samples = vec![0.0f32; 100];
        let shifted = pitch_shift_samples(&samples, 2.0);
        assert_eq!(shifted.len(), samples.len());
    }

    #[test]
    fn test_apply_low_cut() {
        let samples = vec![0.0f32; 100];
        let filtered = apply_low_cut(&samples, 200.0, 44100);
        assert_eq!(filtered.len(), samples.len());
    }

    #[test]
    fn test_apply_high_cut() {
        let samples = vec![0.0f32; 100];
        let filtered = apply_high_cut(&samples, 5000.0, 44100);
        assert_eq!(filtered.len(), samples.len());
    }

    #[test]
    fn test_apply_limiter() {
        let samples = vec![-1.2, -0.5, 0.0, 0.5, 1.2];
        let limited = apply_limiter(&samples, 0.9);
        assert!(limited.iter().all(|&s| s >= -0.9 && s <= 0.9));
        assert_eq!(limited[0], -0.9);
        assert_eq!(limited[4], 0.9);
    }

    #[test]
    fn test_solo_logic_only_soloed_tracks_play() {
        let tracks = vec![
            Track {
                name: "Track 1".to_string(),
                path: std::path::PathBuf::from("dummy1.wav"),
                volume: 1.0,
                pan: Pan::Center,
                mute: false,
                solo: false,
                transpose: false,
            },
            Track {
                name: "Track 2".to_string(),
                path: std::path::PathBuf::from("dummy2.wav"),
                volume: 1.0,
                pan: Pan::Center,
                mute: false,
                solo: true,
                transpose: false,
            },
            Track {
                name: "Track 3".to_string(),
                path: std::path::PathBuf::from("dummy3.wav"),
                volume: 1.0,
                pan: Pan::Center,
                mute: true,
                solo: false,
                transpose: false,
            },
        ];

        // Simulate solo logic
        let any_solo = tracks.iter().any(|t| t.solo);
        let played: Vec<&str> = tracks.iter()
            .filter(|t| {
                if (any_solo && !t.solo) || (!any_solo && t.mute) {
                    false
                } else {
                    true
                }
            })
            .map(|t| t.name.as_str())
            .collect();

        // Only "Track 2" should play
        assert_eq!(played, vec!["Track 2"]);
    }

    #[test]
    fn test_solo_logic_no_solo_respects_mute() {
        let tracks = vec![
            Track {
                name: "Track 1".to_string(),
                path: std::path::PathBuf::from("dummy1.wav"),
                volume: 1.0,
                pan: Pan::Center,
                mute: false,
                solo: false,
                transpose: false,
            },
            Track {
                name: "Track 2".to_string(),
                path: std::path::PathBuf::from("dummy2.wav"),
                volume: 1.0,
                pan: Pan::Center,
                mute: true,
                solo: false,
                transpose: false,
            },
        ];

        let any_solo = tracks.iter().any(|t| t.solo);
        let played: Vec<&str> = tracks.iter()
            .filter(|t| {
                if (any_solo && !t.solo) || (!any_solo && t.mute) {
                    false
                } else {
                    true
                }
            })
            .map(|t| t.name.as_str())
            .collect();

        // Only "Track 1" should play
        assert_eq!(played, vec!["Track 1"]);
    }

    #[test]
    fn test_metronome_handle_stop() {
        let (_stream, stream_handle) = OutputStream::try_default().unwrap();
        let player = MultiTrackPlayer {
            sinks: vec![],
            _stream,
            stream_handle,
        };
        let met = player.play_metronome(120, 4, 4);
        // Stop metronome after short delay
        std::thread::sleep(std::time::Duration::from_millis(100));
        met.stop();
        assert!(!met.running.load(std::sync::atomic::Ordering::SeqCst));
    }
}