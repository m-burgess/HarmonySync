/// FFmpeg optimization utilities for hardware acceleration and performance
use std::process::Stdio;
use tokio::process::Command;

/// Hardware acceleration backends available
#[derive(Debug, Clone, Copy)]
pub enum HwAccel {
    None,
    VAAPI,      // Linux (Intel/AMD)
    NVENC,      // NVIDIA
    QSV,        // Intel Quick Sync Video
    VideoToolbox, // macOS
}

impl HwAccel {
    /// Detect available hardware acceleration
    pub async fn detect() -> Self {
        // Try NVENC first (best for NVIDIA GPUs)
        if Self::check_encoder("h264_nvenc").await {
            return Self::NVENC;
        }
        
        // Try QSV (Intel Quick Sync)
        if Self::check_encoder("h264_qsv").await {
            return Self::QSV;
        }
        
        // Try VAAPI (Linux Intel/AMD)
        if cfg!(target_os = "linux") && Self::check_encoder("h264_vaapi").await {
            return Self::VAAPI;
        }
        
        // Try VideoToolbox (macOS)
        if cfg!(target_os = "macos") && Self::check_encoder("h264_videotoolbox").await {
            return Self::VideoToolbox;
        }
        
        Self::None
    }
    
    /// Check if a specific encoder is available
    async fn check_encoder(encoder: &str) -> bool {
        Command::new("ffmpeg")
            .args(&["-hide_banner", "-encoders"])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
            .await
            .map(|output| {
                let output_str = String::from_utf8_lossy(&output.stdout);
                output_str.contains(encoder)
            })
            .unwrap_or(false)
    }
    
    /// Get video encoder for this acceleration type
    pub fn video_encoder(&self) -> &str {
        match self {
            Self::NVENC => "h264_nvenc",
            Self::QSV => "h264_qsv",
            Self::VAAPI => "h264_vaapi",
            Self::VideoToolbox => "h264_videotoolbox",
            Self::None => "libx264",
        }
    }
    
    /// Get preset for this acceleration type
    pub fn preset(&self) -> &str {
        match self {
            Self::NVENC => "p4",      // NVENC preset (p1-p7, p4 is balanced)
            Self::QSV => "medium",    // QSV preset
            Self::VAAPI => "medium",  // VAAPI doesn't use presets the same way
            Self::VideoToolbox => "medium",
            Self::None => "medium",   // x264 preset
        }
    }
    
    /// Add hardware acceleration arguments to ffmpeg command
    pub fn add_hw_args(&self, cmd: &mut Command) {
        match self {
            Self::VAAPI => {
                cmd.arg("-vaapi_device").arg("/dev/dri/renderD128");
                cmd.arg("-hwaccel").arg("vaapi");
                cmd.arg("-hwaccel_output_format").arg("vaapi");
            },
            Self::QSV => {
                cmd.arg("-hwaccel").arg("qsv");
                cmd.arg("-hwaccel_output_format").arg("qsv");
            },
            Self::NVENC | Self::VideoToolbox => {
                // These don't need special input flags, just use hw encoder
            },
            Self::None => {},
        }
    }
}

/// Optimized FFmpeg command builder
pub struct OptimizedCommand {
    hw_accel: HwAccel,
}

impl OptimizedCommand {
    pub async fn new() -> Self {
        let hw_accel = HwAccel::detect().await;
        log::info!("Hardware acceleration: {:?}", hw_accel);
        Self { hw_accel }
    }
    
    /// Create an optimized video transcoding command
    pub fn build_transcode_cmd(&self, input: &str, output: &str) -> Command {
        let mut cmd = Command::new("ffmpeg");
        
        // Add hardware acceleration input args
        self.hw_accel.add_hw_args(&mut cmd);
        
        // Input file
        cmd.arg("-i").arg(input);
        
        // Video encoding with hw accel
        cmd.arg("-c:v").arg(self.hw_accel.video_encoder());
        cmd.arg("-preset").arg(self.hw_accel.preset());
        
        // Quality settings
        match self.hw_accel {
            HwAccel::NVENC => {
                cmd.arg("-cq").arg("23");  // CQ mode for NVENC
                cmd.arg("-rc").arg("vbr"); // Variable bitrate
            },
            HwAccel::None => {
                cmd.arg("-crf").arg("23"); // CRF for x264
            },
            _ => {
                cmd.arg("-global_quality").arg("23"); // For QSV/VAAPI
            }
        }
        
        // Common settings
        cmd.arg("-pix_fmt").arg("yuv420p");
        cmd.arg("-profile:v").arg("high");
        cmd.arg("-level:v").arg("4.0");
        
        // Audio
        cmd.arg("-c:a").arg("aac");
        cmd.arg("-b:a").arg("128k");
        
        // Fast start for streaming
        cmd.arg("-movflags").arg("faststart");
        
        // Output
        cmd.arg(output);
        cmd.arg("-y"); // Overwrite
        
        // Progress reporting
        cmd.arg("-progress").arg("pipe:2");
        cmd.stderr(Stdio::piped());
        
        cmd
    }
    
    /// Create an optimized audio conversion command
    pub fn build_audio_convert_cmd(&self, input: &str, output: &str) -> Command {
        let mut cmd = Command::new("ffmpeg");
        
        cmd.arg("-i").arg(input);
        
        // Use multi-threaded encoding
        cmd.arg("-threads").arg("0"); // Use all cores
        
        // Audio codec (libvorbis with error handling by caller)
        // Libvorbis is included in most FFmpeg builds, but if unavailable:
        // - The command will fail with an error indicating unknown codec
        // - Caller should catch the error and either retry with AAC or report to user
        // 
        // Alternative codecs if libvorbis is not available:
        // - AAC: "-c:a", "aac", "-b:a", "128k"
        // - MP3: "-c:a", "libmp3lame", "-q:a", "2"
        cmd.arg("-c:a").arg("libvorbis");
        cmd.arg("-q:a").arg("4"); // Quality 4 (good balance)
        
        // Output
        cmd.arg(output);
        cmd.arg("-y");
        
        // Progress
        cmd.arg("-progress").arg("pipe:2");
        cmd.stderr(Stdio::piped());
        
        cmd
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_hw_accel_detection() {
        let accel = HwAccel::detect().await;
        println!("Detected hardware acceleration: {:?}", accel);
        // Just ensure it doesn't panic
        assert!(matches!(accel, HwAccel::None | HwAccel::NVENC | HwAccel::QSV | HwAccel::VAAPI | HwAccel::VideoToolbox));
    }
}
