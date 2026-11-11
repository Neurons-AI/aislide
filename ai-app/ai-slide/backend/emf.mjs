// EMF / WMF (Windows metafile) -> SVG. Covers the records Office writes for clip art, logos, charts
// pasted as pictures and OLE previews: pens, brushes, fonts, paths, polygons/polylines/beziers,
// rectangles, ellipses, arcs, text (EXTTEXTOUTW / TEXTOUT) and embedded bitmaps (STRETCHDIBITS, BITBLT).
// EMF+ dual files carry a plain-EMF copy, which is what we draw.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rgb = (c) => '#' + [c & 255, (c >> 8) & 255, (c >> 16) & 255].map((x) => x.toString(16).padStart(2, '0')).join('');

// A DIB (BITMAPINFO + bits) -> data:image/bmp (every browser decodes BMP).
function dibToDataUrl(buf, offBmi, cbBmi, offBits, cbBits) {
  if (!cbBmi || !cbBits) return null;
  const bmi = buf.subarray(offBmi, offBmi + cbBmi), bits = buf.subarray(offBits, offBits + cbBits);
  const head = Buffer.alloc(14); head.write('BM', 0, 'latin1'); head.writeUInt32LE(14 + bmi.length + bits.length, 2); head.writeUInt32LE(14 + bmi.length, 10);
  return 'data:image/bmp;base64,' + Buffer.concat([head, bmi, bits]).toString('base64');
}

class Ctx {
  constructor() { this.objs = []; this.out = []; this.st = { pen: { color: '#000', w: 1, none: false }, brush: { color: '#fff', none: false }, font: { h: 12, weight: 400, italic: 0, face: 'Arial', esc: 0 }, text: '#000', bkTransparent: true, align: 0, fill: 'alternate', pos: [0, 0], win: { x: 0, y: 0, w: 1, h: 1 }, vp: null, xf: [1, 0, 0, 1, 0, 0] }; this.stack = []; this.path = null; }
  save() { this.stack.push(JSON.parse(JSON.stringify(this.st))); }
  restore(n = -1) { const i = n < 0 ? this.stack.length + n : n; if (i >= 0 && i < this.stack.length) { this.st = this.stack[i]; this.stack.length = i; } }
  P(x, y) { const [a, b, c, d, e, f] = this.st.xf; let X = a * x + c * y + e, Y = b * x + d * y + f; const m = this.map; if (m) { X = (X - m.x) * m.sx; Y = (Y - m.y) * m.sy; } return [X, Y]; }
  // window (logical) -> normalized device box (0..W, 0..H); handles flipped axes (negative extents)
  setMap(win) { if (!win || !win.w || !win.h) { this.map = null; return; } this.map = { x: win.x, y: win.y, sx: (this.W || Math.abs(win.w)) / win.w, sy: (this.H || Math.abs(win.h)) / win.h }; }
  get scaleY() { return this.map ? Math.abs(this.map.sy) : 1; }
  stroke() { const p = this.st.pen; return p.none ? 'stroke="none"' : `stroke="${p.color}" stroke-width="${Math.max(p.w * this.scaleY, 0.5)}" stroke-linejoin="round" stroke-linecap="round"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}`; }
  fillA() { const b = this.st.brush; return b.none ? 'fill="none"' : `fill="${b.color}" fill-rule="${this.st.fill === 'winding' ? 'nonzero' : 'evenodd'}"`; }
  pts(list) { return list.map(([x, y]) => this.P(x, y).map((v) => +v.toFixed(2)).join(',')).join(' '); }
  shape(d, mode = 'both') { const f = mode === 'stroke' ? 'fill="none"' : this.fillA(); const s = mode === 'fill' ? 'stroke="none"' : this.stroke(); this.out.push(`<path d="${d}" ${f} ${s}/>`); }
  M(x, y) { const [a, b] = this.P(x, y); return `M${a.toFixed(2)} ${b.toFixed(2)}`; }
  L(x, y) { const [a, b] = this.P(x, y); return `L${a.toFixed(2)} ${b.toFixed(2)}`; }
  addPath(seg) { if (this.path !== null) this.path += seg; return this.path !== null; }
  text(x, y, str) {
    if (!str) return; const f = this.st.font; const [px, py] = this.P(x, y); const sc = (Math.hypot(this.st.xf[0], this.st.xf[1]) || 1) * this.scaleY; const size = Math.abs(f.h) * sc || 12;
    const al = this.st.align; const anchor = (al & 6) === 6 ? 'middle' : (al & 2) ? 'end' : 'start'; const base = (al & 24) === 24 ? 'alphabetic' : (al & 8) ? 'text-after-edge' : 'text-before-edge';
    const rot = f.esc ? ` transform="rotate(${-f.esc / 10} ${px.toFixed(1)} ${py.toFixed(1)})"` : '';
    this.out.push(`<text x="${px.toFixed(2)}" y="${py.toFixed(2)}" font-family="${esc(f.face)}" font-size="${size.toFixed(2)}" fill="${this.st.text}" text-anchor="${anchor}" dominant-baseline="${base}"${f.weight >= 600 ? ' font-weight="bold"' : ''}${f.italic ? ' font-style="italic"' : ''}${rot} xml:space="preserve">${esc(str)}</text>`);
  }
  image(x, y, w, h, url) { if (!url) return; const [a, b] = this.P(x, y), [c, d] = this.P(x + w, y + h); this.out.push(`<image x="${Math.min(a, c).toFixed(2)}" y="${Math.min(b, d).toFixed(2)}" width="${Math.abs(c - a).toFixed(2)}" height="${Math.abs(d - b).toFixed(2)}" preserveAspectRatio="none" href="${url}"/>`); }
}

function penStyle(style, w) { const s = style & 15; return s === 5 ? { none: true } : { dash: s === 1 ? `${w * 4} ${w * 2}` : s === 2 ? `${w} ${w * 2}` : s === 3 ? `${w * 4} ${w * 2} ${w} ${w * 2}` : null }; }

// ---------------- EMF ----------------
export function emfToSvg(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); const i32 = (o) => v.getInt32(o, true), u32 = (o) => v.getUint32(o, true), i16 = (o) => v.getInt16(o, true);
  if (u32(0) !== 1 || buf.length < 88 || u32(40) !== 0x464d4520) throw new Error('not an EMF');
  const bounds = [i32(8), i32(12), i32(16), i32(20)];
  const c = new Ctx(); c.W = Math.max(1, bounds[2] - bounds[0]); c.H = Math.max(1, bounds[3] - bounds[1]); let off = 0; let hasMap = false;
  const st = () => c.st;
  while (off + 8 <= buf.length) {
    const type = u32(off), size = u32(off + 4); if (size < 8 || off + size > buf.length) break; const p = off + 8;
    const r = (k) => i32(p + k * 4);
    switch (type) {
      case 9: st().win.w = r(0) || 1; st().win.h = r(1) || 1; hasMap = true; c.setMap(st().win); break; // SETWINDOWEXTEX
      case 10: st().win.x = r(0); st().win.y = r(1); if (hasMap) c.setMap(st().win); break; // SETWINDOWORGEX
      case 11: st().vp = { ...(st().vp || { x: 0, y: 0 }), w: r(0), h: r(1) }; break; // SETVIEWPORTEXTEX
      case 12: st().vp = { ...(st().vp || { w: 0, h: 0 }), x: r(0), y: r(1) }; break; // SETVIEWPORTORGEX
      case 33: c.save(); break; case 34: c.restore(r(0)); break; // SAVEDC / RESTOREDC
      case 35: { const f = [0, 1, 2, 3, 4, 5].map((k) => v.getFloat32(p + k * 4, true)); st().xf = f; break; } // SETWORLDTRANSFORM
      case 36: { const f = [0, 1, 2, 3, 4, 5].map((k) => v.getFloat32(p + k * 4, true)); const m = u32(p + 24); const a = st().xf; if (m === 1) st().xf = [1, 0, 0, 1, 0, 0]; else if (m === 2) st().xf = mul(f, a); else if (m === 3) st().xf = mul(a, f); else if (m === 4) st().xf = f; break; } // MODIFYWORLDTRANSFORM
      case 18: st().bkTransparent = r(0) === 1; break; case 19: st().fill = r(0) === 2 ? 'winding' : 'alternate'; break; case 22: st().align = u32(p); break; case 24: st().text = rgb(u32(p)); break;
      case 38: { const ih = u32(p), style = u32(p + 4), w = i32(p + 8) || 1; c.objs[ih] = { kind: 'pen', color: rgb(u32(p + 16)), w, ...penStyle(style, w) }; break; } // CREATEPEN
      case 95: { const ih = u32(p), style = u32(p + 12), w = u32(p + 16) || 1; c.objs[ih] = { kind: 'pen', color: rgb(u32(p + 24)), w, ...penStyle(style, w) }; break; } // EXTCREATEPEN
      case 39: { const ih = u32(p), style = u32(p + 4); c.objs[ih] = { kind: 'brush', color: rgb(u32(p + 8)), none: style === 1 }; break; } // CREATEBRUSHINDIRECT
      case 93: case 94: { c.objs[u32(p)] = { kind: 'brush', color: '#808080' }; break; } // pattern / DIB brush -> mid grey
      case 82: { const ih = u32(p); const h = i32(p + 4), esc0 = i32(p + 12), wt = i32(p + 20), it = buf[p + 24]; let face = ''; for (let k = 0; k < 32; k++) { const ch = v.getUint16(p + 32 + k * 2, true); if (!ch) break; face += String.fromCharCode(ch); } c.objs[ih] = { kind: 'font', h, esc: esc0, weight: wt, italic: it, face: face || 'Arial' }; break; } // CREATEFONTINDIRECTW
      case 37: { const ih = u32(p); if (ih & 0x80000000) { const k = ih & 0x7fffffff; if (k === 5 || k === 8) st().pen = { ...st().pen, none: true }; else if (k === 7 || k === 6) st().pen = { color: '#000', w: 1 }; else if (k === 0) st().brush = { color: '#fff' }; else if (k === 4) st().brush = { color: '#000' }; else if (k === 5) st().brush = { none: true }; else if (k <= 3) st().brush = { color: ['#fff', '#c0c0c0', '#808080', '#404040'][k] }; } else { const o = c.objs[ih]; if (o?.kind === 'pen') st().pen = o; if (o?.kind === 'brush') st().brush = o; if (o?.kind === 'font') st().font = o; } break; } // SELECTOBJECT
      case 40: delete c.objs[u32(p)]; break;
      case 27: st().pos = [r(0), r(1)]; if (!c.addPath(c.M(r(0), r(1)))) {} break; // MOVETOEX
      case 54: { if (!c.addPath(c.L(r(0), r(1)))) c.shape(c.M(...st().pos) + c.L(r(0), r(1)), 'stroke'); st().pos = [r(0), r(1)]; break; } // LINETO
      case 43: { const d = rectD(c, r(0), r(1), r(2), r(3)); if (!c.addPath(d)) c.shape(d); break; } // RECTANGLE
      case 44: { const [x0, y0, x1, y1, rw, rh] = [r(0), r(1), r(2), r(3), r(4) / 2, r(5) / 2]; const d = roundD(c, x0, y0, x1, y1, rw, rh); if (!c.addPath(d)) c.shape(d); break; } // ROUNDRECT
      case 42: { const d = ellD(c, r(0), r(1), r(2), r(3)); if (!c.addPath(d)) c.shape(d); break; } // ELLIPSE
      case 45: case 46: case 47: { const d = arcD(c, r(0), r(1), r(2), r(3), r(4), r(5), r(6), r(7), type); if (!c.addPath(d)) c.shape(d, type === 45 ? 'stroke' : 'both'); break; } // ARC / CHORD / PIE
      case 3: case 4: case 2: case 5: case 6: case 86: case 87: case 85: case 88: case 89: { // POLYGON/POLYLINE/POLYBEZIER(16)/…TO
        const small = type >= 85; const n = u32(p + 16); const pts = []; for (let k = 0; k < n; k++) pts.push(small ? [i16(p + 20 + k * 4), i16(p + 22 + k * 4)] : [i32(p + 20 + k * 8), i32(p + 24 + k * 8)]);
        const kind = { 3: 'polygon', 86: 'polygon', 4: 'polyline', 87: 'polyline', 2: 'bezier', 85: 'bezier', 5: 'bezierto', 88: 'bezierto', 6: 'polylineto', 89: 'polylineto' }[type];
        let d = ''; if (kind === 'polygon' || kind === 'polyline') { d = pts.map((q, k) => (k ? c.L(...q) : c.M(...q))).join('') + (kind === 'polygon' ? 'Z' : ''); }
        else if (kind === 'bezier') { d = c.M(...pts[0]); for (let k = 1; k + 2 < pts.length + 1 && k + 2 <= pts.length - 1 + 1; k += 3) if (pts[k + 2]) d += 'C' + [pts[k], pts[k + 1], pts[k + 2]].map((q) => c.P(...q).map((z) => z.toFixed(2)).join(' ')).join(' '); }
        else if (kind === 'bezierto') { for (let k = 0; k + 2 < pts.length; k += 3) d += 'C' + [pts[k], pts[k + 1], pts[k + 2]].map((q) => c.P(...q).map((z) => z.toFixed(2)).join(' ')).join(' '); if (pts.length) st().pos = pts[pts.length - 1]; if (!c.addPath(d)) c.shape(c.M(...st().pos) + d, 'stroke'); break; }
        else { d = pts.map((q) => c.L(...q)).join(''); if (pts.length) { const start = st().pos; st().pos = pts[pts.length - 1]; if (!c.addPath(d)) c.shape(c.M(...start) + d, 'stroke'); } break; }
        if (!c.addPath(d)) c.shape(d, kind === 'polygon' ? 'both' : 'stroke'); break;
      }
      case 7: case 8: case 91: case 90: { // POLYPOLYLINE / POLYPOLYGON (32 and 16)
        const small = type === 91 || type === 90; const nPolys = u32(p + 16), nPts = u32(p + 20); const counts = []; for (let k = 0; k < nPolys; k++) counts.push(u32(p + 24 + k * 4)); let q = p + 24 + nPolys * 4; let d = '';
        const poly = type === 8 || type === 90 ? false : true; // 8=POLYPOLYGON? (EMR_POLYPOLYGON=8, POLYPOLYLINE=7 handled above)
        for (const cnt of counts) { for (let k = 0; k < cnt; k++) { const x = small ? i16(q) : i32(q), y = small ? i16(q + 2) : i32(q + 4); q += small ? 4 : 8; d += k ? c.L(x, y) : c.M(x, y); } d += type === 8 || type === 91 ? 'Z' : ''; }
        if (!c.addPath(d)) c.shape(d, type === 8 || type === 91 ? 'both' : 'stroke'); void poly; void nPts; break;
      }
      case 59: c.path = ''; break; case 60: break; case 61: if (c.path !== null) c.path += 'Z'; break; // BEGINPATH ENDPATH CLOSEFIGURE
      case 62: case 63: case 64: { if (c.path) c.shape(c.path, type === 62 ? 'fill' : type === 64 ? 'stroke' : 'both'); c.path = null; break; } // FILLPATH STROKEANDFILLPATH STROKEPATH
      case 67: case 68: case 75: c.path = null; break; // SELECTCLIPPATH / ABORTPATH
      case 84: case 83: { // EXTTEXTOUTW / A
        const wide = type === 84; const x = i32(p + 28), y = i32(p + 32), n = u32(p + 36), offStr = u32(p + 40); let s = '';
        for (let k = 0; k < n; k++) s += wide ? String.fromCharCode(v.getUint16(off + offStr + k * 2, true)) : String.fromCharCode(buf[off + offStr + k]);
        c.text(st().align & 1 ? st().pos[0] : x, st().align & 1 ? st().pos[1] : y, s.replace(/\0/g, '')); break;
      }
      case 81: { const x = r(4), y = r(5), xs = r(6), ys = r(7); const offB = u32(p + 40), cbB = u32(p + 44), offBits = u32(p + 48), cbBits = u32(p + 52); const w = r(16), h = r(17); c.image(x, y, w || xs, h || ys, dibToDataUrl(buf, off + offB, cbB, off + offBits, cbBits)); break; } // STRETCHDIBITS
      case 76: { const x = r(4), y = r(5), w = r(6), h = r(7); const offB = u32(p + 76), cbB = u32(p + 80), offBits = u32(p + 84), cbBits = u32(p + 88); const url = dibToDataUrl(buf, off + offB, cbB, off + offBits, cbBits); if (url) c.image(x, y, w, h, url); else if (u32(p + 32) !== 0x00aa0029) { const fill = rgb(u32(p + 56)); c.out.push(`<rect x="${c.P(x, y)[0]}" y="${c.P(x, y)[1]}" width="${w}" height="${h}" fill="${fill}"/>`); } break; } // BITBLT
      case 77: { const x = r(4), y = r(5), w = r(6), h = r(7); const offB = u32(p + 76), cbB = u32(p + 80), offBits = u32(p + 84), cbBits = u32(p + 88); c.image(x, y, w, h, dibToDataUrl(buf, off + offB, cbB, off + offBits, cbBits)); break; } // STRETCHBLT
      case 14: off = buf.length; break; // EOF
      default: break;
    }
    off += size;
  }
  // map logical -> device using the window/viewport if set, else the header bounds
  let vb;
  if (hasMap) vb = [0, 0, c.W, c.H]; else vb = [bounds[0], bounds[1], bounds[2] - bounds[0] || 1, bounds[3] - bounds[1] || 1];
  const pw = bounds[2] - bounds[0] || Math.abs(vb[2]), ph = bounds[3] - bounds[1] || Math.abs(vb[3]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${Math.abs(pw)}" height="${Math.abs(ph)}" preserveAspectRatio="none">${c.out.join('')}</svg>`;
}
function mul(a, b) { return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]]; }
function rectD(c, l, t, r, b) { return c.M(l, t) + c.L(r, t) + c.L(r, b) + c.L(l, b) + 'Z'; }
function ellD(c, l, t, r, b) { const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2; const k = .5523; return c.M(cx + rx, cy) + ['C', [cx + rx, cy + ry * k], [cx + rx * k, cy + ry], [cx, cy + ry], 'C', [cx - rx * k, cy + ry], [cx - rx, cy + ry * k], [cx - rx, cy], 'C', [cx - rx, cy - ry * k], [cx - rx * k, cy - ry], [cx, cy - ry], 'C', [cx + rx * k, cy - ry], [cx + rx, cy - ry * k], [cx + rx, cy]].map((q) => (typeof q === 'string' ? q : c.P(...q).map((z) => z.toFixed(2)).join(' ') + ' ')).join('') + 'Z'; }
function roundD(c, l, t, r, b, rx, ry) { rx = Math.min(rx, (r - l) / 2); ry = Math.min(ry, (b - t) / 2); return c.M(l + rx, t) + c.L(r - rx, t) + qd(c, r, t, r, t + ry) + c.L(r, b - ry) + qd(c, r, b, r - rx, b) + c.L(l + rx, b) + qd(c, l, b, l, b - ry) + c.L(l, t + ry) + qd(c, l, t, l + rx, t) + 'Z'; }
function qd(c, x1, y1, x, y) { return 'Q' + c.P(x1, y1).map((z) => z.toFixed(2)).join(' ') + ' ' + c.P(x, y).map((z) => z.toFixed(2)).join(' '); }
function arcD(c, l, t, r, b, xs, ys, xe, ye, type) {
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2; const a0 = Math.atan2(ys - cy, xs - cx), a1 = Math.atan2(ye - cy, xe - cx);
  let sweep = a0 - a1; if (sweep <= 0) sweep += Math.PI * 2; // counter-clockwise in EMF
  const N = Math.max(8, Math.ceil(sweep / .2)); const pts = []; for (let k = 0; k <= N; k++) { const a = a0 - sweep * k / N; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  let d = pts.map((q, k) => (k ? c.L(...q) : c.M(...q))).join(''); if (type === 47) d += c.L(cx, cy) + 'Z'; if (type === 46) d += 'Z'; return d;
}

// ---------------- WMF ----------------
export function wmfToSvg(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); const u16 = (o) => v.getUint16(o, true), i16 = (o) => v.getInt16(o, true), u32 = (o) => v.getUint32(o, true);
  let o = 0; let unitsPerInch = 1440; let bbox = null;
  if (u32(0) === 0x9ac6cdd7) { bbox = [i16(6), i16(8), i16(10), i16(12)]; unitsPerInch = u16(14) || 1440; o = 22; }
  if (u16(o) > 2) throw new Error('not a WMF'); o += u16(o + 2) * 2; // header size in words
  const c = new Ctx(); const st = () => c.st; let win = null;
  if (bbox) { c.W = Math.max(1, Math.round(Math.abs(bbox[2] - bbox[0]) / unitsPerInch * 96)); c.H = Math.max(1, Math.round(Math.abs(bbox[3] - bbox[1]) / unitsPerInch * 96)); }
  const add = (obj) => { let k = 0; while (c.objs[k]) k++; c.objs[k] = obj; };
  while (o + 6 <= buf.length) {
    const size = u32(o) * 2, fn = u16(o + 4); if (size < 6 || o + size > buf.length) break; const p = o + 6; const w = (k) => i16(p + k * 2);
    switch (fn) {
      case 0x0000: o = buf.length; break;
      case 0x020c: win = { ...(win || { x: 0, y: 0 }), h: w(0), w: w(1) }; c.setMap(win); break; // SETWINDOWEXT (y,x)
      case 0x020b: win = { ...(win || { w: 0, h: 0 }), y: w(0), x: w(1) }; c.setMap(win); break; // SETWINDOWORG
      case 0x001e: c.save(); break; case 0x0127: c.restore(w(0)); break;
      case 0x0102: st().bkTransparent = w(0) === 1; break; case 0x0106: st().fill = w(0) === 2 ? 'winding' : 'alternate'; break; case 0x012e: st().align = u16(p); break; case 0x0209: st().text = rgb(u32(p)); break;
      case 0x02fa: { const style = u16(p), pw = w(1) || 1; add({ kind: 'pen', color: rgb(u32(p + 6)), w: pw, ...penStyle(style, pw) }); break; } // CREATEPENINDIRECT
      case 0x02fc: { const style = u16(p); add({ kind: 'brush', color: rgb(u32(p + 2)), none: style === 1 }); break; } // CREATEBRUSHINDIRECT
      case 0x0142: case 0x01f9: add({ kind: 'brush', color: '#808080' }); break; // DIBCREATEPATTERNBRUSH/palette/...
      case 0x02fb: { let face = ''; for (let k = 18; k < 50 && p + k < o + size; k++) { const ch = buf[p + k]; if (!ch) break; face += String.fromCharCode(ch); } add({ kind: 'font', h: w(0), esc: w(2), weight: w(4), italic: buf[p + 10], face: face || 'Arial' }); break; } // CREATEFONTINDIRECT
      case 0x012d: { const ob = c.objs[u16(p)]; if (ob?.kind === 'pen') st().pen = ob; if (ob?.kind === 'brush') st().brush = ob; if (ob?.kind === 'font') st().font = ob; break; } // SELECTOBJECT
      case 0x01f0: delete c.objs[u16(p)]; break;
      case 0x0214: st().pos = [w(1), w(0)]; break; // MOVETO (y,x)
      case 0x0213: c.shape(c.M(...st().pos) + c.L(w(1), w(0)), 'stroke'); st().pos = [w(1), w(0)]; break; // LINETO
      case 0x041b: c.shape(rectD(c, w(3), w(2), w(1), w(0))); break; // RECTANGLE (b,r,t,l)
      case 0x061c: c.shape(roundD(c, w(5), w(4), w(3), w(2), w(1) / 2, w(0) / 2)); break; // ROUNDRECT
      case 0x0418: c.shape(ellD(c, w(3), w(2), w(1), w(0))); break; // ELLIPSE
      case 0x0817: case 0x0830: case 0x081a: c.shape(arcD(c, w(7), w(6), w(5), w(4), w(3), w(2), w(1), w(0), fn === 0x0817 ? 45 : fn === 0x0830 ? 46 : 47), fn === 0x0817 ? 'stroke' : 'both'); break; // ARC CHORD PIE
      case 0x0324: case 0x0325: { const n = u16(p); const pts = []; for (let k = 0; k < n; k++) pts.push([i16(p + 2 + k * 4), i16(p + 4 + k * 4)]); const d = pts.map((q, k) => (k ? c.L(...q) : c.M(...q))).join('') + (fn === 0x0324 ? 'Z' : ''); c.shape(d, fn === 0x0324 ? 'both' : 'stroke'); break; } // POLYGON / POLYLINE
      case 0x0538: { const n = u16(p); const counts = []; for (let k = 0; k < n; k++) counts.push(u16(p + 2 + k * 2)); let q = p + 2 + n * 2; let d = ''; for (const cnt of counts) { for (let k = 0; k < cnt; k++) { d += k ? c.L(i16(q), i16(q + 2)) : c.M(i16(q), i16(q + 2)); q += 4; } d += 'Z'; } c.shape(d); break; } // POLYPOLYGON
      case 0x0521: { const n = u16(p); let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(buf[p + 2 + k]); const q = p + 2 + n + (n & 1); c.text(i16(q + 2), i16(q), s); break; } // TEXTOUT
      case 0x0a32: { const y = w(0), x = w(1), n = u16(p + 4), opts = u16(p + 6); let q = p + 8 + (opts & 6 ? 8 : 0); let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(buf[q + k]); c.text(x, y, s.replace(/\0/g, '')); break; } // EXTTEXTOUT
      case 0x0f43 + 1: break;
      case 0x0b41: case 0x0f43 - 0: { // DIBSTRETCHBLT(0x0b41) / STRETCHDIB(0x0f43)
        const isSD = fn === 0x0f43; const base = p + (isSD ? 6 : 4); const sh = i16(base + 0), sw = i16(base + 2); void sh; void sw;
        const dh = i16(base + 8), dw = i16(base + 10), dy = i16(base + 12), dx = i16(base + 14); const dib = base + 16; const bihSize = u32(dib); const bits = u16(dib + 14); const clr = u32(dib + 32) || (bits <= 8 ? 1 << bits : 0); const bmiLen = bihSize + clr * 4;
        c.image(dx, dy, dw, dh, dibToDataUrl(buf, dib, bmiLen, dib + bmiLen, o + size - (dib + bmiLen))); break;
      }
      case 0x0940: { const dh = w(5) || 0, dw = w(6) || 0, dy = w(7), dx = w(8); void dh; void dw; void dy; void dx; break; } // DIBBITBLT (rare in Office output)
      default: break;
    }
    o += size;
  }
  const vb = c.map ? [0, 0, c.W || Math.abs(win.w), c.H || Math.abs(win.h)] : bbox ? [bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]] : [0, 0, 1000, 1000];
  const pw = bbox ? Math.round((bbox[2] - bbox[0]) / unitsPerInch * 96) : Math.abs(vb[2]), ph = bbox ? Math.round((bbox[3] - bbox[1]) / unitsPerInch * 96) : Math.abs(vb[3]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${pw}" height="${ph}" preserveAspectRatio="none">${c.out.join('')}</svg>`;
}

export function metafileToDataUrl(buf, ext) {
  try { const svg = (ext === 'wmf' ? wmfToSvg : emfToSvg)(buf); return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'); } catch { return null; }
}
