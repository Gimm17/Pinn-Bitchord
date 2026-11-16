// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  unsafe {
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--disable-web-security --allow-running-insecure-content");
  }

  std::panic::set_hook(Box::new(|info| {
    let msg = format!("{info}\nBacktrace: {:?}", std::backtrace::Backtrace::capture());
    let _ = std::fs::write("bitchord_panic.log", msg);
  }));

  app_lib::run();
}
