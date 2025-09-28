use iced::{Application, Element, Settings, Theme};
use iced::widget::{button, Button, Column, Row, Text, Scrollable};
use iced::Length;
use rfd::AsyncFileDialog;
use std::path::{PathBuf, Path};
use std::fs;
use std::io::{self, BufRead};

pub struct Gui {
    folders: Vec<String>,
    slides: Vec<String>,
    mixer_tracks: Vec<String>,
    song_title: Option<String>,
}

#[derive(Debug, Clone)]
pub enum Message {
    AddFolder,
    FolderPicked(Option<PathBuf>),
    SelectFolder(String),
    SelectSlide(String),
}

impl Application for Gui {
    type Message = Message;
    type Theme = Theme;
    type Executor = iced::executor::Default;
    type Flags = ();

    fn new(_flags: ()) -> (Self, iced::Command<Self::Message>) {
        (Gui { folders: vec![], slides: vec![], mixer_tracks: vec![], song_title: None }, iced::Command::none())
    }

    fn title(&self) -> String {
        String::from("HarmonySync")
    }

    fn update(&mut self, message: Self::Message) -> iced::Command<Self::Message> {
        match message {
            Message::AddFolder => {
                return iced::Command::perform(async {
                    rfd::AsyncFileDialog::new().pick_folder().await
                        .map(|file_handle| file_handle.path().to_path_buf())
                }, Message::FolderPicked);
            }
            Message::FolderPicked(picked_folder) => {
                if let Some(path) = picked_folder {
                    self.folders.push(path.display().to_string());
                }
            }
            Message::SelectFolder(folder_path_str) => {
                self.slides.clear();
                self.mixer_tracks.clear();
                self.song_title = None;

                let folder_path = PathBuf::from(folder_path_str.clone());

                if let Ok(entries) = fs::read_dir(&folder_path) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        if path.is_file() {
                            if path.file_name().and_then(|n| n.to_str()) == Some("lyrics.txt") {
                                if let Ok(file) = fs::File::open(&path) {
                                    let reader = io::BufReader::new(file);
                                    let mut current_slide_lines = Vec::new();
                                    for line in reader.lines().filter_map(|l| l.ok()) {
                                        if line.starts_with("[Title]") {
                                            self.song_title = Some(line.replace("[Title]", "").trim().to_string());
                                        } else if line.starts_with("-----") && line.ends_with("-----") {
                                            // This is a section separator, add it as a single slide
                                            if !current_slide_lines.is_empty() {
                                                self.slides.push(current_slide_lines.join("\n"));
                                                current_slide_lines.clear();
                                            }
                                            self.slides.push(line);
                                        } else if !line.trim().is_empty() {
                                            current_slide_lines.push(line);
                                            if current_slide_lines.len() == 2 {
                                                self.slides.push(current_slide_lines.join("\n"));
                                                current_slide_lines.clear();
                                            }
                                        }
                                    }
                                    if !current_slide_lines.is_empty() {
                                        self.slides.push(current_slide_lines.join("\n"));
                                    }
                                }
                            } else if is_audio_file(&path) {
                                if let Some(file_name) = path.file_stem().and_then(|s| s.to_str()) {
                                    self.mixer_tracks.push(file_name.to_string());
                                }
                            }
                        }
                    }
                }
            }
            Message::SelectSlide(slide_name) => {
                println!("Selected slide: {}", slide_name);
            }
        }
        iced::Command::none()
    }

    fn view(&self) -> Element<Self::Message> {
        let folder_list_items = self.folders.iter().map(|folder_path_str| {
            let display_name = if let Some(title) = &self.song_title {
                format!("{} ({})", title, PathBuf::from(folder_path_str).file_name().unwrap().to_string_lossy())
            } else {
                PathBuf::from(folder_path_str).file_name().unwrap().to_string_lossy().to_string()
            };
            button(Text::new(display_name)).on_press(Message::SelectFolder(folder_path_str.clone())).into()
        }).collect::<Vec<_>>();

        let column1 = Column::new()
            .push(Button::new(Text::new("Add to Setlist")).on_press(Message::AddFolder))
            .push(Scrollable::new(Column::with_children(folder_list_items)));

        let column2 = Column::new()
            .push(Text::new("Slides"))
            .push(Scrollable::new(Column::with_children(
                self.slides.iter().map(|slide| {
                    button(Text::new(slide)).on_press(Message::SelectSlide(slide.clone())).into()
                }).collect::<Vec<_>>()
            )));

        let column3 = Column::new()
            .push(Text::new("Preview Window"))
            .push(Text::new("Audience Screen"))
            .push(Text::new("Confidence Monitor"));

        let main_columns = Row::new()
            .push(column1.width(Length::FillPortion(1)))
            .push(column2.width(Length::FillPortion(2)))
            .push(column3.width(Length::FillPortion(3)))
            .width(Length::Fill);

        let mixer_row = Row::new()
            .push(Text::new("Multitrack Mixer Placeholder"))
            .push(Column::with_children(
                self.mixer_tracks.iter().map(|track_name| {
                    Text::new(format!("Track: {}", track_name)).into()
                }).collect::<Vec<_>>()
            ))
            .width(Length::Fill);

        Column::new()
            .push(main_columns.height(Length::FillPortion(3)))
            .push(mixer_row.height(Length::FillPortion(1)))
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

fn is_audio_file(path: &Path) -> bool {
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    matches!(ext.to_lowercase().as_str(), "mp3" | "flac" | "ogg" | "wav" | "m4a")
}

pub fn main() -> iced::Result {
    Gui::run(Settings::default())
}