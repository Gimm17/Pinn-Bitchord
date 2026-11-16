use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct PingResult {
    pub version: String,
    pub protocol: u32,
    pub browser: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    #[serde(rename = "bodyEncoding")]
    pub body_encoding: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    #[serde(rename = "bodyEncoding")]
    pub body_encoding: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YtAuthState {
    #[serde(rename = "browserSignedIn")]
    pub browser_signed_in: bool,
    pub connected: bool,
    #[serde(rename = "signedIn")]
    pub signed_in: bool,
    pub accounts: Vec<serde_json::Value>,
}

#[tauri::command]
pub async fn bridge_ping() -> Result<PingResult, String> {
    Ok(PingResult {
        version: "1.9.0".into(),
        protocol: 1,
        browser: "chromium".into(),
        capabilities: vec![
            "yt".into(),
            "yt.auth".into(),
            "yt.stats".into(),
            "addon".into(),
            "lyrics".into(),
            "spotify".into(),
            "discord".into(),
        ],
    })
}

#[tauri::command]
pub async fn bridge_http(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::builder()
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

    req = req.header(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    );

    if let Some(headers) = request.headers {
        for (k, v) in headers {
            if let Ok(hn) = reqwest::header::HeaderName::from_bytes(k.as_bytes()) {
                if let Ok(hv) = reqwest::header::HeaderValue::from_str(&v) {
                    req = req.header(hn, hv);
                }
            }
        }
    }

    // Rules aligned with web/extension/lib/rules.ts:
    if request.url.contains("googlevideo.com")
        && (request.url.contains("c=VISIONOS")
            || request.url.contains("c=IOS")
            || request.url.contains("c=ANDROID"))
    {
        // Direct URLs for mobile clients must NOT send Origin or Referer.
    } else if request.url.contains("music.youtube.com") {
        req = req.header("Origin", "https://music.youtube.com");
        req = req.header("Referer", "https://music.youtube.com/");
        req = req.header("X-Origin", "https://music.youtube.com");
    } else if request.url.contains("youtube.com") || request.url.contains("googlevideo.com") {
        req = req.header("Origin", "https://www.youtube.com");
        req = req.header("Referer", "https://www.youtube.com/");
        req = req.header("X-Origin", "https://www.youtube.com");
    }

    if let Some(body) = request.body {
        if request.body_encoding.as_deref() == Some("base64") {
            if let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(body.as_bytes()) {
                req = req.body(decoded);
            } else {
                req = req.body(body);
            }
        } else {
            req = req.body(body);
        }
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let final_url = resp.url().to_string();

    let mut resp_headers = HashMap::new();
    for (k, v) in resp.headers() {
        if let Ok(val) = v.to_str() {
            let k_low = k.as_str().to_lowercase();
            // Don't forward content-encoding or transfer-encoding if reqwest decoded them
            if k_low != "content-encoding" && k_low != "transfer-encoding" {
                resp_headers.insert(k.as_str().to_string(), val.to_string());
            }
        }
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let (body_out, encoding) = match std::str::from_utf8(&bytes) {
        Ok(text) => (text.to_string(), "text".to_string()),
        Err(_) => {
            let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
            (encoded, "base64".to_string())
        }
    };

    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("bridge.log")
        .map(|mut f| {
            use std::io::Write;
            let _ = writeln!(f, "[HTTP] {:?} {} -> {}", method, &request.url, status);
        });

    Ok(HttpResponse {
        status,
        headers: resp_headers,
        body: body_out,
        body_encoding: encoding,
        url: final_url,
    })
}

#[tauri::command]
pub async fn bridge_auth_state() -> Result<YtAuthState, String> {
    Ok(YtAuthState {
        browser_signed_in: false,
        connected: false,
        signed_in: false,
        accounts: Vec::new(),
    })
}
