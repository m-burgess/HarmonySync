/// Performance monitoring utilities for HarmonySync
use serde::{Serialize, Deserialize};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_count: usize,
    pub memory_available_mb: u64,
    pub cache_sizes: CacheSizes,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheSizes {
    pub audio_cache_count: usize,
    pub audio_cache_size_mb: f64,
    pub http_server_active: bool,
}

/// Performance timer for measuring operation duration
pub struct Timer {
    start: Instant,
    operation: String,
}

impl Timer {
    pub fn new(operation: impl Into<String>) -> Self {
        Self {
            start: Instant::now(),
            operation: operation.into(),
        }
    }
    
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
    
    pub fn log_elapsed(&self) {
        let elapsed = self.elapsed();
        if elapsed.as_millis() > 100 {
            log::info!("⏱️  {} took {:.2}ms", self.operation, elapsed.as_secs_f64() * 1000.0);
        }
    }
}

impl Drop for Timer {
    fn drop(&mut self) {
        self.log_elapsed();
    }
}

/// System info utilities
pub fn get_cpu_count() -> usize {
    num_cpus::get()
}

pub fn get_system_metrics() -> PerformanceMetrics {
    // Note: Cache sizes and uptime are placeholder values until real implementations are added
    // These should be updated by the actual cache managers and app state tracking
    // 
    // To implement:
    // 1. Audio cache: Track in audio service or add cache manager in Rust
    // 2. HTTP server status: Query the actual HTTP server state
    // 3. Uptime: Track app start time and calculate duration
    
    PerformanceMetrics {
        cpu_count: get_cpu_count(),
        memory_available_mb: get_available_memory_mb(),
        cache_sizes: CacheSizes {
            audio_cache_count: 0, // TODO: Implement actual audio cache tracking
            audio_cache_size_mb: 0.0, // TODO: Implement actual audio cache size
            http_server_active: false, // TODO: Query HTTP server state
        },
        uptime_seconds: 0, // TODO: Track app start time
    }
}

fn get_available_memory_mb() -> u64 {
    // Memory tracking implementation notes:
    // - Linux: Reads from /proc/meminfo (MemAvailable field)
    // - Windows/macOS: Not implemented yet, returns 0
    // 
    // For cross-platform support, consider using the `sysinfo` crate:
    // https://docs.rs/sysinfo/latest/sysinfo/
    // 
    // Example: let mut sys = System::new_all(); sys.refresh_memory(); sys.available_memory()
    
    if cfg!(target_os = "linux") {
        if let Ok(info) = std::fs::read_to_string("/proc/meminfo") {
            for line in info.lines() {
                if line.starts_with("MemAvailable:") {
                    if let Some(kb_str) = line.split_whitespace().nth(1) {
                        if let Ok(kb) = kb_str.parse::<u64>() {
                            return kb / 1024; // Convert to MB
                        }
                    }
                }
            }
        }
    }
    
    // Fallback: return 0 if we can't determine
    // Frontend should handle 0 as "unknown" or "not available on this platform"
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_cpu_count() {
        let count = get_cpu_count();
        assert!(count > 0);
        println!("CPU count: {}", count);
    }
    
    #[test]
    fn test_timer() {
        let timer = Timer::new("test_operation");
        std::thread::sleep(std::time::Duration::from_millis(10));
        assert!(timer.elapsed().as_millis() >= 10);
    }
}
