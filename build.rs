// build.rs
use std::io::Write;

fn main() {
    slint_build::compile("ui/main.slint").unwrap();
}