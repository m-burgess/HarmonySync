// Audio Router - Manages audio device enumeration and routing
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub input_channels: usize,
    pub output_channels: usize,
    pub sample_rate: u32,
    pub buffer_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRoute {
    pub plugin_id: String,
    pub source_channel: usize,
    pub destination_device: String,
    pub destination_channel: usize,
    pub gain_db: f32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelStrip {
    pub gain_db: f32,
    pub pan: f32, // -1.0 (L) to 1.0 (R)
    pub mute: bool,
    pub solo: bool,
}

pub struct AudioRouter {
    routes: Arc<Mutex<HashMap<String, AudioRoute>>>,
    channel_strips: Arc<Mutex<HashMap<String, ChannelStrip>>>,
    active_device: Arc<Mutex<Option<String>>>,
}

impl AudioRouter {
    pub fn new() -> Self {
        Self {
            routes: Arc::new(Mutex::new(HashMap::new())),
            channel_strips: Arc::new(Mutex::new(HashMap::new())),
            active_device: Arc::new(Mutex::new(None)),
        }
    }

    /// Get all available audio devices
    pub async fn get_audio_devices(&self) -> Result<Vec<AudioDevice>> {
        // For prototype, return mock devices
        // In full implementation, would use cpal or similar to enumerate devices
        Ok(vec![
            AudioDevice {
                id: "behringer_x18".to_string(),
                name: "Behringer X18".to_string(),
                input_channels: 18,
                output_channels: 18,
                sample_rate: 48000,
                buffer_size: 256,
            },
            AudioDevice {
                id: "default".to_string(),
                name: "Default Audio Device".to_string(),
                input_channels: 2,
                output_channels: 2,
                sample_rate: 48000,
                buffer_size: 512,
            },
        ])
    }

    /// Set the active audio device
    pub async fn set_active_device(&self, device_id: String) -> Result<()> {
        let mut active = self.active_device.lock().await;
        *active = Some(device_id);
        Ok(())
    }

    /// Create an audio route from a plugin to an output channel
    pub async fn add_route(&self, route: AudioRoute) -> Result<()> {
        let route_id = format!("{}_ch{}", route.plugin_id, route.source_channel);
        let mut routes = self.routes.lock().await;
        routes.insert(route_id, route);
        Ok(())
    }

    /// Remove an audio route
    pub async fn remove_route(&self, route_id: &str) -> Result<()> {
        let mut routes = self.routes.lock().await;
        routes.remove(route_id);
        Ok(())
    }

    /// Get all routes for a specific plugin
    pub async fn get_plugin_routes(&self, plugin_id: &str) -> Vec<AudioRoute> {
        let routes = self.routes.lock().await;
        routes
            .values()
            .filter(|r| r.plugin_id == plugin_id)
            .cloned()
            .collect()
    }

    /// Set channel strip parameters
    pub async fn set_channel_strip(
        &self,
        plugin_id: &str,
        strip: ChannelStrip,
    ) -> Result<()> {
        let mut strips = self.channel_strips.lock().await;
        strips.insert(plugin_id.to_string(), strip);
        Ok(())
    }

    /// Get channel strip for a plugin
    pub async fn get_channel_strip(&self, plugin_id: &str) -> Option<ChannelStrip> {
        let strips = self.channel_strips.lock().await;
        strips.get(plugin_id).cloned()
    }
}

// Global audio router instance
use once_cell::sync::Lazy;

static AUDIO_ROUTER: Lazy<Arc<Mutex<Option<AudioRouter>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_audio_router() -> Arc<Mutex<Option<AudioRouter>>> {
    AUDIO_ROUTER.clone()
}

pub async fn initialize_audio_router() -> Result<()> {
    let router = AudioRouter::new();
    let mut global = AUDIO_ROUTER.lock().await;
    *global = Some(router);
    Ok(())
}
