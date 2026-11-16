//! The party server, spoken from Rust.
//!
//! A WebView2 `fetch`/`WebSocket` always carries `Origin: http://tauri.localhost`
//! and the party server's allowlist (`backend/config/config.go`, no wildcards)
//! rejects unknown origins — 403 on a fetch, a failed handshake on a socket.
//! Requests made here carry no Origin, the same as the native Android client, so
//! the desktop reaches the parties that already exist with no server change.
//!
//! The split mirrors the browser: [`bridge_party_http`] for the REST calls and a
//! long-lived socket for everything else. Frames are pushed to the frontend as
//! `party-frame` events rather than answered as command results, because a
//! command's return is one-shot and a party's frames are not.

use crate::bridge::{HttpRequest, HttpResponse};
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::{self, UnboundedSender};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;

/// The socket the frontend believes it holds. Replacing it on connect drops the
/// sender the running task waits on, which is how that task ends.
static OUTGOING: OnceLock<Mutex<Option<UnboundedSender<Message>>>> = OnceLock::new();

fn outgoing() -> &'static Mutex<Option<UnboundedSender<Message>>> {
    OUTGOING.get_or_init(|| Mutex::new(None))
}

/// Diagnostics for a dev build only: a release binary has no business writing a
/// log beside itself.
#[cfg(debug_assertions)]
fn log_party(msg: &str) {
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("party.log") {
        use std::io::Write;
        let _ = writeln!(f, "[Party] {}", msg);
    }
}

#[cfg(not(debug_assertions))]
fn log_party(_msg: &str) {}

/// Drops the sender the running task waits on, so that task ends by itself.
fn drop_socket() {
    outgoing().lock().unwrap().take();
}

#[tauri::command]
pub async fn bridge_party_connect(
    app: AppHandle,
    url: String,
    token: Option<String>,
) -> Result<(), String> {
    drop_socket();

    // A URL a browser accepted may still be one tungstenite rejects; the message
    // is surfaced rather than swallowed, so a bad server URL reads as one.
    let mut request = url.clone().into_client_request().map_err(|e| format!("{}: {}", url, e))?;
    if let Some(token) = token.as_deref().filter(|t| !t.is_empty()) {
        // The header the native Android client uses, and the only one the server
        // reads: it answers a subprotocol offer with 401 (the browser's route
        // exists because a browser cannot set headers on a WebSocket).
        let value = format!("Bearer {token}");
        request.headers_mut().insert(
            "Authorization",
            value.parse().map_err(|_| "bad token".to_string())?,
        );
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    *outgoing().lock().unwrap() = Some(tx);

    log_party(&format!("connecting {}", url));
    let (stream, _) = match tokio_tungstenite::connect_async(request).await {
        Ok(pair) => pair,
        Err(e) => {
            log_party(&format!("connect failed: {}", e));
            return Err(format!("connect failed: {}", e));
        }
    };
    log_party("connected");

    tokio::spawn(async move {
        let (mut sink, mut source) = stream.split();
        let frame_app = app.clone();
        let close_app = app.clone();
        loop {
            tokio::select! {
                outgoing_msg = rx.recv() => match outgoing_msg {
                    Some(msg) => {
                        if sink.send(msg).await.is_err() {
                            let _ = close_app.emit("party-closed", "send failed");
                            break;
                        }
                    }
                    // The sender was dropped: the frontend closed, or a new
                    // connect replaced it.
                    None => {
                        let _ = sink.close().await;
                        break;
                    }
                },
                incoming = source.next() => match incoming {
                    Some(Ok(Message::Text(text))) => {
                        let _ = frame_app.emit("party-frame", text.to_string());
                    }
                    Some(Ok(Message::Binary(bytes))) => {
                        if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                            let _ = frame_app.emit("party-frame", text);
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        let _ = close_app.emit("party-closed", "closed");
                        break;
                    }
                    // Ping/pong and raw frames are the socket's business.
                    Some(Ok(_)) => {}
                    Some(Err(e)) => {
                        let _ = close_app.emit("party-closed", e.to_string());
                        break;
                    }
                },
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn bridge_party_send(text: String) -> Result<(), String> {
    let sender = outgoing().lock().unwrap().clone();
    match sender {
        Some(tx) => tx.send(Message::Text(text.into())).map_err(|e| e.to_string()),
        None => Err("no party socket".into()),
    }
}

#[tauri::command]
pub async fn bridge_party_close() -> Result<(), String> {
    drop_socket();
    Ok(())
}

/// The party server's REST calls: the same plain outbound request `bridge_http`
/// makes, without the YouTube header rules (those exist for googlevideo, and
/// sending an Origin to the party server is exactly what it rejects).
#[tauri::command]
pub async fn bridge_party_http(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let method = match request.method.as_deref().unwrap_or("GET") {
        "POST" => reqwest::Method::POST,
        "HEAD" => reqwest::Method::HEAD,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => reqwest::Method::GET,
    };

    let mut req = client.request(method.clone(), &request.url);
    if let Some(headers) = request.headers {
        for (k, v) in headers {
            // Origin and Referer are the browser's; sending either defeats the point.
            let low = k.to_ascii_lowercase();
            if low == "origin" || low == "referer" {
                continue;
            }
            if let Ok(hn) = reqwest::header::HeaderName::from_bytes(k.as_bytes()) {
                if let Ok(hv) = reqwest::header::HeaderValue::from_str(&v) {
                    req = req.header(hn, hv);
                }
            }
        }
    }

    if let Some(body) = request.body {
        if request.body_encoding.as_deref() == Some("base64") {
            match base64::engine::general_purpose::STANDARD.decode(body.as_bytes()) {
                Ok(decoded) => req = req.body(decoded),
                Err(_) => req = req.body(body),
            }
        } else {
            req = req.body(body);
        }
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let final_url = resp.url().to_string();
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    log_party(&format!("{:?} {} -> {}", method, request.url, status));

    let (body_out, encoding) = match std::str::from_utf8(&bytes) {
        Ok(text) => (text.to_string(), "text".to_string()),
        Err(_) => (
            base64::engine::general_purpose::STANDARD.encode(&bytes),
            "base64".to_string(),
        ),
    };

    Ok(HttpResponse {
        status,
        headers: Default::default(),
        body: body_out,
        body_encoding: encoding,
        url: final_url,
    })
}
