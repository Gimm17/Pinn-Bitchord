mod bridge;
mod discord;
mod party;

use bridge::{bridge_auth_state, bridge_http, bridge_ping};
use discord::{bridge_discord_presence, bridge_discord_set_enabled, bridge_discord_status, init_discord_rpc};
use party::{bridge_party_close, bridge_party_connect, bridge_party_http, bridge_party_send};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg(target_os = "windows")]
mod win_mem {
    unsafe extern "system" {
        fn SetProcessWorkingSetSize(
            h_process: *mut std::ffi::c_void,
            dw_minimum_working_set_size: usize,
            dw_maximum_working_set_size: usize,
        ) -> i32;
        fn GetCurrentProcess() -> *mut std::ffi::c_void;
    }

    pub fn trim() {
        unsafe {
            let handle = GetCurrentProcess();
            SetProcessWorkingSetSize(handle, usize::MAX, usize::MAX);
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win_mem {
    pub fn trim() {}
}

#[tauri::command]
fn bridge_trim_memory() {
    win_mem::trim();
}

/*
 * Which file was launched, and when.
 *
 * Closing the window hides the app to the tray instead of quitting it, and the
 * single-instance plugin keys off the identifier alone — so while an old
 * process is alive, launching a freshly built BitChord.exe only focuses that
 * old window and the new build never appears. The new process drops this stamp
 * before the plugin decides; the running instance reads it, and when the file
 * behind it is not the one it is running from, it starts that one and quits.
 */
fn launch_stamp_path() -> Option<std::path::PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from)?;
    Some(base.join("com.bitchord.desktop").join("launch.stamp"))
}

fn write_launch_stamp() {
    let Some(path) = launch_stamp_path() else { return };
    let Ok(exe) = std::env::current_exe() else { return };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(&path, exe.to_string_lossy().as_bytes());
}

/** The executable the last launch asked for, when it is newer than this one. */
fn newer_launch() -> Option<std::path::PathBuf> {
    let text = std::fs::read_to_string(launch_stamp_path()?).ok()?;
    let launched = std::path::PathBuf::from(text.trim());
    let ours = std::env::current_exe().ok()?;
    let same = std::fs::canonicalize(&launched).ok() == std::fs::canonicalize(&ours).ok();
    if same || !launched.exists() {
        return None;
    }
    let stamp = |p: &std::path::Path| {
        std::fs::metadata(p).and_then(|m| m.modified()).ok()
    };
    match (stamp(&launched), stamp(&ours)) {
        // Only a build newer than the running one takes over; clicking a stale
        // copy elsewhere in the folder tree just shows the window.
        (Some(theirs), Some(mine)) if theirs > mine => Some(launched),
        _ => None,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // No --disable-web-security here: with web security off Chromium omits the
    // Origin header on the fetch to ipc.localhost, and Tauri's IPC rejects that
    // ("missing Origin header") — every invoke broke, Discord included.
    unsafe {
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            r#"--autoplay-policy=no-user-gesture-required --disable-features=IsolateOrigins,site-per-process,AudioServiceOutOfProcess --renderer-process-limit=1 --js-flags="--max-old-space-size=256" --disk-cache-size=33554432 --media-cache-size=33554432 --disable-gpu-memory-buffer-video-frames"#,
        );
    }

    init_discord_rpc();
    write_launch_stamp();

    // Background thread to trim memory working set periodically
    std::thread::spawn(|| {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(45));
            win_mem::trim();
        }
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A different file was launched: hand over to it instead of showing
            // this older build, which is what made a rebuilt exe look ignored.
            if let Some(next) = newer_launch() {
                if std::process::Command::new(&next).spawn().is_ok() {
                    app.exit(0);
                    return;
                }
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            bridge_ping,
            bridge_http,
            bridge_auth_state,
            bridge_discord_presence,
            bridge_discord_status,
            bridge_discord_set_enabled,
            bridge_party_connect,
            bridge_party_send,
            bridge_party_close,
            bridge_party_http,
            bridge_trim_memory
        ])
        .setup(|app| {
            // Build system tray
            let show_i = MenuItem::with_id(app, "show", "Show BitChord", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new().menu(&menu);

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder
                .tooltip("BitChord")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                                win_mem::trim();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Minimize/Hide to tray instead of closing
                    let _ = window.hide();
                    api.prevent_close();
                    win_mem::trim();
                }
                tauri::WindowEvent::Focused(false) => {
                    win_mem::trim();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
