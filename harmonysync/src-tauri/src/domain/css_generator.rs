
use rand::Rng;
use std::fs;
use std::path::PathBuf;

pub fn generate_and_write_css(path: &str) {
    let mut file_path = PathBuf::from(path);
    file_path.push("background.css");

    if !file_path.exists() {
        let css_content = generate_css_content();
        write_css_file(&file_path, &css_content);
    }
}

fn generate_css_content() -> String {
    let mut rng = rand::thread_rng();
    let r1 = rng.gen_range(100..256);
    let g1 = rng.gen_range(100..256);
    let b1 = rng.gen_range(100..256);

    let r2 = rng.gen_range(100..256);
    let g2 = rng.gen_range(100..256);
    let b2 = rng.gen_range(100..256);

    let r3 = rng.gen_range(100..256);
    let g3 = rng.gen_range(100..256);
    let b3 = rng.gen_range(100..256);

    let r4 = rng.gen_range(100..256);
    let g4 = rng.gen_range(100..256);
    let b4 = rng.gen_range(100..256);

    format!(
        "body {{
    background: linear-gradient(-45deg, rgb({}, {}, {}), rgb({}, {}, {}), rgb({}, {}, {}), rgb({}, {}, {}));
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
}}

@keyframes gradient {{
    0% {{
        background-position: 0% 50%;
    }}
    50% {{
        background-position: 100% 50%;
    }}
    100% {{
        background-position: 0% 50%;
    }}
}}",
        r1, g1, b1, r2, g2, b2, r3, g3, b3, r4, g4, b4
    )
}

fn write_css_file(file_path: &PathBuf, content: &str) {
    if let Some(parent_dir) = file_path.parent() {
        if !parent_dir.exists() {
            fs::create_dir_all(parent_dir).unwrap();
        }
    }
    fs::write(file_path, content).unwrap();
}
