//! DeckCraft engine as a C-ABI WebAssembly module: the file and render backend of the
//! AI Slide app (AICoworker). No wasm-bindgen is needed: the host owns memory through
//! `dc_alloc`/`dc_free`, and every call leaves its result in one buffer that the host reads with
//! `dc_result_ptr`/`dc_result_len`. `dc_result_ok()` is 1 on success and 0 on error (the
//! buffer then holds the UTF-8 error text).
//!
//! Inputs are file bytes or UTF-8 JSON of `deckcraft_model::Presentation`.
#![allow(clippy::missing_safety_doc)]

use deckcraft_model::Presentation;
use std::cell::RefCell;

thread_local! {
    static OUT: RefCell<(bool, Vec<u8>)> = const { RefCell::new((true, Vec::new())) };
}

fn set(r: Result<Vec<u8>, String>) -> u32 {
    OUT.with(|o| {
        let mut o = o.borrow_mut();
        match r {
            Ok(v) => {
                o.0 = true;
                o.1 = v;
            }
            Err(e) => {
                o.0 = false;
                o.1 = e.into_bytes();
            }
        }
        u32::try_from(o.1.len()).unwrap_or(u32::MAX)
    })
}

/// # Safety
/// The host passes a pointer it got from `dc_alloc` and the number of bytes it wrote there.
unsafe fn input<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    if len == 0 || ptr.is_null() { &[] } else { unsafe { std::slice::from_raw_parts(ptr, len) } }
}

#[unsafe(no_mangle)]
pub extern "C" fn dc_alloc(len: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len.max(1));
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_free(ptr: *mut u8, cap: usize) {
    if !ptr.is_null() {
        unsafe { drop(Vec::from_raw_parts(ptr, 0, cap.max(1))) }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn dc_result_ptr() -> *const u8 { OUT.with(|o| o.borrow().1.as_ptr()) }
#[unsafe(no_mangle)]
pub extern "C" fn dc_result_len() -> usize { OUT.with(|o| o.borrow().1.len()) }
#[unsafe(no_mangle)]
pub extern "C" fn dc_result_ok() -> u32 { OUT.with(|o| u32::from(o.borrow().0)) }
#[unsafe(no_mangle)]
pub extern "C" fn dc_version() -> u32 { set(Ok(env!("CARGO_PKG_VERSION").as_bytes().to_vec())) }

mod media;

/// Accepts either a bare Presentation or `{presentation, mediaData}` (what `to_json` returns).
fn pres(json: &[u8]) -> Result<Presentation, String> {
    let v: serde_json::Value = serde_json::from_slice(json).map_err(|e| format!("model JSON: {e}"))?;
    let (pv, data) = match v {
        serde_json::Value::Object(mut o) if o.contains_key("presentation") => {
            (o.remove("presentation").unwrap_or_default(), o.remove("mediaData"))
        }
        other => (other, None),
    };
    let mut p: Presentation = serde_json::from_value(pv).map_err(|e| format!("model JSON: {e}"))?;
    if let Some(serde_json::Value::Object(m)) = data {
        for item in &mut p.media {
            let key = serde_json::to_value(item.id).ok().map(|v| v.to_string()).unwrap_or_default();
            if let Some(serde_json::Value::String(b64)) = m.get(&key)
                && let Some(bytes) = media::decode(b64)
            {
                item.data = std::sync::Arc::new(bytes);
            }
        }
    }
    deckcraft_format::repair(&mut p);
    Ok(p)
}

fn to_json(p: &Presentation, warnings: &[String]) -> Result<Vec<u8>, String> {
    let mut m = serde_json::Map::new();
    for item in p.media.iter().filter(|x| !x.data.is_empty()) {
        let key = serde_json::to_value(item.id).ok().map(|v| v.to_string()).unwrap_or_default();
        m.insert(key, serde_json::Value::String(media::encode(&item.data)));
    }
    serde_json::to_vec(&serde_json::json!({ "presentation": p, "mediaData": m, "warnings": warnings })).map_err(|e| e.to_string())
}

/// Add TTF/OTF/TTC bytes to the engine's font database. System fonts are invisible inside WASM,
/// so the host passes the families a deck uses. Returns the number of faces added.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_add_font(ptr: *const u8, len: usize) -> u32 {
    let b = unsafe { input(ptr, len) };
    let n = deckcraft_fonts::FontDb::global().add_font(b.to_vec());
    set(Ok(n.to_string().into_bytes()))
}

/// Any supported file (pptx family or .deckcraft) -> `{presentation, warnings}` JSON.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_import(ptr: *const u8, len: usize) -> u32 {
    let b = unsafe { input(ptr, len) };
    set((|| {
        if deckcraft_pptx::is_encrypted(b) {
            return Err("encrypted: the file is password-protected".into());
        }
        if deckcraft_format::sniff(b) {
            let (p, w) = deckcraft_format::load_checked(b).map_err(|e| e.to_string())?;
            return to_json(&p, &w);
        }
        let (mut p, w) = deckcraft_pptx::import_checked(b).map_err(|e| e.to_string())?;
        deckcraft_format::repair(&mut p);
        to_json(&p, &w)
    })())
}

/// Presentation JSON -> file bytes. `ext`: pptx pptm ppsx ppsm potx potm deckcraft.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_export(ptr: *const u8, len: usize, ext_ptr: *const u8, ext_len: usize) -> u32 {
    let (b, ext) = unsafe { (input(ptr, len), input(ext_ptr, ext_len)) };
    let ext = String::from_utf8_lossy(ext).to_ascii_lowercase();
    set((|| {
        let p = pres(b)?;
        if ext == "deckcraft" {
            return deckcraft_format::save(&p).map_err(|e| e.to_string());
        }
        deckcraft_pptx::export_as(&p, &ext).map_err(|e| e.to_string())
    })())
}

/// Slide `index` of the presentation JSON -> PNG, `width` px wide.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_render_png(ptr: *const u8, len: usize, index: u32, width: u32) -> u32 {
    let b = unsafe { input(ptr, len) };
    set((|| {
        let p = pres(b)?;
        let i = index as usize;
        if i >= p.slides.len() {
            return Err("slide index out of range".into());
        }
        let scale = f64::from(width.max(16)) / p.slide_size.width.max(1.0);
        let opts = deckcraft_render::RenderOpts { scale, ..Default::default() };
        let img = deckcraft_render::render_slide(&p, i, &opts);
        png(img.width, img.height, img.pixels)
    })())
}

/// Like `dc_render_png`, but without the shapes listed in `skip` (little-endian u32 shape ids):
/// the host draws those itself as editable objects and uses this image as the backdrop
/// (background, master/layout graphics and every shape it cannot edit natively).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_render_backdrop(ptr: *const u8, len: usize, index: u32, width: u32, skip_ptr: *const u8, skip_len: usize) -> u32 {
    let (b, sk) = unsafe { (input(ptr, len), input(skip_ptr, skip_len)) };
    set((|| {
        let p = pres(b)?;
        let i = index as usize;
        if i >= p.slides.len() {
            return Err("slide index out of range".into());
        }
        let skip: Vec<deckcraft_model::ShapeId> = sk.chunks_exact(4).map(|c| deckcraft_model::ShapeId(u32::from_le_bytes([c[0], c[1], c[2], c[3]]))).collect();
        let scale = f64::from(width.max(16)) / p.slide_size.width.max(1.0);
        let opts = deckcraft_render::RenderOpts { scale, skip: &skip, ..Default::default() };
        let img = deckcraft_render::render_slide(&p, i, &opts);
        png(img.width, img.height, img.pixels)
    })())
}

fn png(w: u32, h: u32, mut px: Vec<u8>) -> Result<Vec<u8>, String> {
    // the renderer gives premultiplied RGBA; PNG wants straight alpha
    for c in px.chunks_exact_mut(4) {
        let a = u32::from(c[3]);
        if a > 0 && a < 255 {
            for v in c.iter_mut().take(3) {
                *v = u8::try_from(((u32::from(*v) * 255 + a / 2) / a).min(255)).unwrap_or(255);
            }
        }
    }
    let rgba = image::RgbaImage::from_raw(w, h, px).ok_or("bad raster size")?;
    let mut out = std::io::Cursor::new(Vec::new());
    rgba.write_to(&mut out, image::ImageFormat::Png).map_err(|e| e.to_string())?;
    Ok(out.into_inner())
}

/// Presentation JSON -> PDF with a selectable text layer, links and bookmarks.
/// `layout`: 0 slides, 1 notes pages, 2..=9 handouts with that many slides per page.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_export_pdf(ptr: *const u8, len: usize, layout: u32) -> u32 {
    let b = unsafe { input(ptr, len) };
    set((|| {
        let p = pres(b)?;
        let mut o = deckcraft_pdf::PdfOptions::default();
        o.layout = match layout {
            0 => deckcraft_pdf::PageLayout::Slides,
            1 => deckcraft_pdf::PageLayout::Notes,
            n => deckcraft_pdf::PageLayout::Handouts { per_page: u8::try_from(n).unwrap_or(6) },
        };
        deckcraft_pdf::export(&p, &o).map_err(|e| e.to_string())
    })())
}

/// Outline text (non-indented line = slide title, indented = bullets) appended to a presentation
/// (empty input = a new presentation).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_outline(ptr: *const u8, len: usize, txt_ptr: *const u8, txt_len: usize) -> u32 {
    let (b, t) = unsafe { (input(ptr, len), input(txt_ptr, txt_len)) };
    set((|| {
        let mut p = if b.is_empty() { Presentation::default() } else { pres(b)? };
        deckcraft_format::outline_to_slides(&mut p, &String::from_utf8_lossy(t));
        deckcraft_format::repair(&mut p);
        to_json(&p, &[])
    })())
}

/// Presentation JSON -> plain outline text.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dc_to_outline(ptr: *const u8, len: usize) -> u32 {
    let b = unsafe { input(ptr, len) };
    set(pres(b).map(|p| deckcraft_format::slides_to_outline(&p).into_bytes()))
}
