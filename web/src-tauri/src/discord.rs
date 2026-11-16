use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::OnceLock;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const APPLICATION_ID: &str = "1543679166967193620";

fn log_discord(msg: &str) {
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open("discord_rpc.log") {
        let _ = writeln!(f, "[Discord RPC] {}", msg);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresencePayload {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub quality: Option<String>,
    #[serde(rename = "artworkUrl")]
    pub artwork_url: Option<String>,
    #[serde(rename = "videoId")]
    pub video_id: Option<String>,
    #[serde(rename = "positionMs")]
    pub position_ms: Option<f64>,
    #[serde(rename = "durationMs")]
    pub duration_ms: Option<f64>,
}

pub enum PresenceMsg {
    Update(PresencePayload),
    Clear,
}

static DISCORD_SENDER: OnceLock<Sender<PresenceMsg>> = OnceLock::new();

/// "Show what you're playing", as the settings page toggles it. Presence is
/// published by this process directly over Discord's local IPC pipe — there is
/// no account to log into, only a running Discord desktop client.
static ENABLED: AtomicBool = AtomicBool::new(true);

pub fn set_enabled(on: bool) {
    ENABLED.store(on, Ordering::Relaxed);
    if !on {
        clear_presence();
    }
}

/** Whether a Discord desktop client is listening on one of its IPC pipes. */
pub fn client_running() -> bool {
    (0..10).any(|i| std::path::Path::new(&format!(r"\\.\pipe\discord-ipc-{}", i)).exists())
}

pub fn init_discord_rpc() {
    log_discord("init_discord_rpc starting worker thread");
    let (tx, rx) = channel::<PresenceMsg>();
    let _ = DISCORD_SENDER.set(tx);

    thread::spawn(move || {
        let mut pipe: Option<File> = None;

        while let Ok(msg) = rx.recv() {
            match msg {
                PresenceMsg::Update(payload) => {
                    if !ENABLED.load(Ordering::Relaxed) {
                        continue;
                    }
                    ensure_connected(&mut pipe);
                    if let Some(ref mut f) = pipe {
                        if let Err(e) = send_presence(f, Some(&payload)) {
                            log_discord(&format!("send_presence failed: {}", e));
                            pipe = None;
                        }
                    } else {
                        log_discord("Pipe unavailable to send presence update");
                    }
                }
                PresenceMsg::Clear => {
                    if let Some(ref mut f) = pipe {
                        let _ = send_presence(f, None);
                    }
                }
            }
        }
    });
}

pub fn update_presence(payload: PresencePayload) {
    if let Some(tx) = DISCORD_SENDER.get() {
        let _ = tx.send(PresenceMsg::Update(payload));
    }
}

pub fn clear_presence() {
    if let Some(tx) = DISCORD_SENDER.get() {
        let _ = tx.send(PresenceMsg::Clear);
    }
}

/// The presence state the settings page reads. There is no account: `connected`
/// means a Discord desktop client is running with one of its IPC pipes up.
fn status_json() -> serde_json::Value {
    let connected = client_running();
    serde_json::json!({
        "available": true,
        "connected": connected,
        "enabled": ENABLED.load(Ordering::Relaxed),
        "user": if connected {
            serde_json::json!({ "name": "BitChord Desktop", "username": "bitchord", "avatarUrl": null })
        } else {
            serde_json::Value::Null
        },
        "gateway": if connected { "ready" } else { "off" },
        "problem": if connected { serde_json::Value::Null } else {
            serde_json::json!("Discord desktop is not running")
        },
    })
}

#[tauri::command]
pub async fn bridge_discord_status() -> Result<serde_json::Value, String> {
    Ok(status_json())
}

#[tauri::command]
pub async fn bridge_discord_set_enabled(enabled: bool) -> Result<serde_json::Value, String> {
    set_enabled(enabled);
    Ok(status_json())
}

fn ensure_connected(pipe: &mut Option<File>) {
    if pipe.is_some() {
        return;
    }

    log_discord("Attempting to connect to Discord IPC...");
    for i in 0..10 {
        let path = format!(r"\\.\pipe\discord-ipc-{}", i);
        if let Ok(mut file) = OpenOptions::new().read(true).write(true).open(&path) {
            log_discord(&format!("Opened pipe: {}", path));
            let handshake = serde_json::json!({
                "v": 1,
                "client_id": APPLICATION_ID
            });
            let body = handshake.to_string();
            if let Err(e) = write_packet(&mut file, 0, body.as_bytes()) {
                log_discord(&format!("Handshake write failed: {}", e));
                continue;
            }
            // Drain handshake response (opcode 1)
            match read_packet(&mut file) {
                Ok((op, resp)) => {
                    log_discord(&format!("Handshake OK on pipe {}! op={}, resp_len={}", i, op, resp.len()));
                    *pipe = Some(file);
                    return;
                }
                Err(e) => {
                    log_discord(&format!("Handshake read failed on pipe {}: {}", i, e));
                }
            }
        }
    }
    log_discord("Could not connect to any discord-ipc pipe (Discord may not be running).");
}

fn write_packet(file: &mut File, opcode: u32, payload: &[u8]) -> std::io::Result<()> {
    let op_bytes = opcode.to_le_bytes();
    let len_bytes = (payload.len() as u32).to_le_bytes();
    file.write_all(&op_bytes)?;
    file.write_all(&len_bytes)?;
    file.write_all(payload)?;
    file.flush()?;
    Ok(())
}

fn read_packet(file: &mut File) -> std::io::Result<(u32, Vec<u8>)> {
    let mut header = [0u8; 8];
    file.read_exact(&mut header)?;
    let opcode = u32::from_le_bytes(header[0..4].try_into().unwrap());
    let length = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;
    let mut body = vec![0u8; length];
    file.read_exact(&mut body)?;
    Ok((opcode, body))
}

fn send_presence(file: &mut File, payload: Option<&PresencePayload>) -> std::io::Result<()> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs();

    let activity = if let Some(p) = payload {
        let pos_sec = (p.position_ms.unwrap_or(0.0).max(0.0) as u64) / 1000;
        let dur_sec = (p.duration_ms.unwrap_or(0.0).max(0.0) as u64) / 1000;
        let start = if now >= pos_sec { now - pos_sec } else { now };

        let mut timestamps = serde_json::Map::new();
        timestamps.insert("start".to_string(), serde_json::json!(start));
        if dur_sec > pos_sec {
            timestamps.insert("end".to_string(), serde_json::json!(start + dur_sec));
        }

        let quality_tag = p
            .quality
            .clone()
            .unwrap_or_else(|| "Lossless FLAC".to_string());

        let mut buttons = Vec::new();
        if let Some(ref vid) = p.video_id {
            if vid.len() == 11 {
                buttons.push(serde_json::json!({
                    "label": "Listen on YouTube Music",
                    "url": format!("https://music.youtube.com/watch?v={}", vid)
                }));
            }
        }
        buttons.push(serde_json::json!({
            "label": "Get BitChord PC",
            "url": "https://github.com/kushagrasinghx/BitChord"
        }));

        let large_image = match p.artwork_url.as_deref() {
            Some(url) if url.starts_with("http") => url.to_string(),
            _ => "https://raw.githubusercontent.com/kushagrasinghx/BitChord/main/Logo.png".to_string(),
        };

        // Discord rejects the whole activity when an asset field is null, so
        // only send the fields we have.
        let mut assets = serde_json::Map::new();
        assets.insert("large_image".to_string(), serde_json::json!(large_image));
        assets.insert("large_text".to_string(), serde_json::json!(quality_tag));

        serde_json::json!({
            "type": 2, // 2 = Listening to
            "details": p.title,
            "state": p.artist,
            "assets": serde_json::Value::Object(assets),
            "timestamps": timestamps,
            "buttons": buttons
        })
    } else {
        serde_json::Value::Null
    };

    let frame = serde_json::json!({
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": std::process::id(),
            "activity": activity
        },
        "nonce": "bitchord-rpc"
    });

    let body = frame.to_string();
    log_discord(&format!("Sending SET_ACTIVITY (len={})", body.len()));
    write_packet(file, 1, body.as_bytes())?;
    // Drain reply
    match read_packet(file) {
        Ok((op, resp)) => {
            log_discord(&format!("SET_ACTIVITY ACK (op={}): {}", op, String::from_utf8_lossy(&resp)));
            Ok(())
        }
        Err(e) => {
            log_discord(&format!("SET_ACTIVITY read error: {}", e));
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn bridge_discord_presence(payload: Option<serde_json::Value>) -> Result<(), String> {
    log_discord(&format!("bridge_discord_presence command received: raw={:?}", payload));
    match payload {
        Some(serde_json::Value::Null) | None => {
            log_discord("Track: None (clearing presence)");
            clear_presence();
        }
        Some(val) => {
            let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
            let artist = val.get("artist").and_then(|v| v.as_str()).unwrap_or("Unknown Artist").to_string();
            let album = val.get("album").and_then(|v| v.as_str()).map(|s| s.to_string());
            let quality = val.get("quality").and_then(|v| v.as_str()).map(|s| s.to_string());
            let artwork_url = val
                .get("artworkUrl")
                .or_else(|| val.get("artwork_url"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let video_id = val
                .get("videoId")
                .or_else(|| val.get("video_id"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let position_ms = val
                .get("positionMs")
                .or_else(|| val.get("position_ms"))
                .and_then(|v| v.as_f64());
            let duration_ms = val
                .get("durationMs")
                .or_else(|| val.get("duration_ms"))
                .and_then(|v| v.as_f64());

            let p = PresencePayload {
                title,
                artist,
                album,
                quality,
                artwork_url,
                video_id,
                position_ms,
                duration_ms,
            };
            log_discord(&format!("Track parsed: '{}' - '{}' [{:?}]", p.title, p.artist, p.quality));
            update_presence(p);
        }
    }
    Ok(())
}
