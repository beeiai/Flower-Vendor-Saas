use tauri_build::{try_build, Settings};

fn main() {
  match try_build(&Settings::default()) {
    Ok(_) => {}
    Err(e) => {
      println!("cargo:warning={}", e);
    }
  }
}