
use rusqlite::{Connection, Result};

pub fn init_database() -> Result<Connection> {
    let conn = Connection::open("harmonylink.sqlite")?;

    // Create tables for songs and tracks
    conn.execute(
        "CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL UNIQUE,
            lyrics TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY,
            song_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            track_name TEXT,
            FOREIGN KEY (song_id) REFERENCES songs (id)
        )",
        [],
    )?;

    // Create table for settings
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Create table for macros
    conn.execute(
        "CREATE TABLE IF NOT EXISTS macros (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            action TEXT NOT NULL
        )",
        [],
    )?;

    // Create table for slide/macro associations
    conn.execute(
        "CREATE TABLE IF NOT EXISTS slide_macros (
            slide_id TEXT NOT NULL,
            macro_id INTEGER NOT NULL,
            PRIMARY KEY (slide_id, macro_id),
            FOREIGN KEY (macro_id) REFERENCES macros (id)
        )",
        [],
    )?;

    // Create table for scheduled events
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY,
            event_time TEXT NOT NULL,
            event_type TEXT NOT NULL,
            target_id TEXT NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}
