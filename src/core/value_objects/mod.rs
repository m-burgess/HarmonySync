// src/core/value_objects/mod.rs

#[derive(Debug, Clone, PartialEq)]
pub enum Pan {
    Left,
    Center,
    Right,
}

impl Default for Pan {
    fn default() -> Self {
        Pan::Center
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Volume(f32);

impl Volume {
    pub fn new(value: f32) -> Self {
        Volume(value.clamp(0.0, 1.0))
    }

    pub fn get(&self) -> f32 {
        self.0
    }
}

impl Default for Volume {
    fn default() -> Self {
        Volume(1.0)
    }
}

// Add other value objects as needed
