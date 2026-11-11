//! Media bytes are `#[serde(skip)]` in the model (native files keep them as separate zip entries).
//! Across the WASM boundary they travel next to the model in a `mediaData` map: media id -> base64.

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

pub fn encode(d: &[u8]) -> String {
    let mut s = String::with_capacity(d.len().div_ceil(3) * 4);
    for c in d.chunks(3) {
        let b1 = c.get(1).copied().unwrap_or(0);
        let b2 = c.get(2).copied().unwrap_or(0);
        let n = (u32::from(c[0]) << 16) | (u32::from(b1) << 8) | u32::from(b2);
        for (k, sh) in [18u32, 12, 6, 0].iter().enumerate() {
            if k <= c.len() {
                s.push(char::from(B64[((n >> sh) & 63) as usize]));
            } else {
                s.push('=');
            }
        }
    }
    s
}

pub fn decode(s: &str) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(s.len() / 4 * 3);
    let mut buf = 0u32;
    let mut bits = 0u32;
    for ch in s.bytes() {
        let v = match ch {
            b'A'..=b'Z' => ch - b'A',
            b'a'..=b'z' => ch - b'a' + 26,
            b'0'..=b'9' => ch - b'0' + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            b'=' | b'\n' | b'\r' | b' ' => continue,
            _ => return None,
        };
        buf = ((buf << 6) | u32::from(v)) & 0x00ff_ffff;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(u8::try_from((buf >> bits) & 0xff).ok()?);
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    #[test]
    fn roundtrip() {
        for n in 0..40usize {
            let d: Vec<u8> = (0..n).map(|i| u8::try_from((i * 37) % 256).unwrap_or(0)).collect();
            assert_eq!(super::decode(&super::encode(&d)).as_deref(), Some(d.as_slice()));
        }
    }
}
