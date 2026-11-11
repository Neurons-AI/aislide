import fs from 'fs'; import * as E from '../../backend/engine.mjs'; import { toDeck, fromDeck } from '../../backend/dcmodel.mjs';
// Real-world deck round-trip. Put any large .pptx at tests/fixtures/template.pptx (not committed:
// it is someone's document) or pass a path: node tests/roundtrip/template.mjs <file.pptx>
const src = process.argv[2] || new URL('../fixtures/template.pptx', import.meta.url).pathname;
if (!fs.existsSync(src)) { console.log('skip: no tests/fixtures/template.pptx (pass a .pptx path)'); process.exit(0); }
const OUT = process.env.TMPDIR || '/tmp';
const res=await E.importFile(fs.readFileSync(src)); const deck=toDeck(res);
const c={}; for(const s of deck.slides) for(const e of s.els) c[e.type]=(c[e.type]||0)+1; console.log('editor els',JSON.stringify(c), 'notes0', JSON.stringify(deck.slides[0].notes).slice(0,60));
// 1) no edits: merge back must be a no-op on content
const same=fromDeck(deck,res); const a=JSON.stringify(res.presentation.slides), b=JSON.stringify(same.presentation.slides);
console.log('noop identical slides:', a===b, a.length, b.length);
if(a!==b){ for(let i=0;i<a.length;i++) if(a[i]!==b[i]){console.log('DIFF@',i,a.slice(i-200,i+150),'\n---\n',b.slice(i-200,i+150));break;} }
// 2) edits: change title text, move a shape, add text box + chart + new slide
const s0=deck.slides[0]; const t=s0.els.find(e=>e.text&&e.text.paras[0].runs.length); t.text.paras[0].runs=[{t:'ĐÃ SỬA BỞI AI SLIDE',b:1,size:36,color:'#e8591a'}];
s0.els.push({id:'n1',type:'text',x:60,y:480,w:400,h:30,text:{size:14,paras:[{runs:[{t:'Hộp chữ mới'}]}]}});
s0.els.push({id:'n2',type:'chart',x:600,y:300,w:300,h:200,chart:{type:'pie',title:'Mới',labels:['A','B'],series:[{name:'S',values:[3,7]}]}});
deck.slides.push({els:[{id:'n3',type:'shape',shape:'roundRect',x:100,y:100,w:300,h:120,fill:'#2f6fd6',text:{size:24,valign:'middle',paras:[{align:'center',runs:[{t:'Slide mới',color:'#ffffff'}]}]}}],notes:'ghi chú mới'});
const edited=fromDeck(deck,res); const out=await E.exportFile(edited,'pptx'); fs.writeFileSync('/tmp/dc_edit.pptx',out); console.log('export bytes',out.length);
for(const i of [0,5]){ fs.writeFileSync(`${OUT}/dce${i}.png`, await E.renderPng(edited,i,640)); } fs.writeFileSync("/Users/xnohat/aicoworker/openclaw/workspace-main/projects/deckcraft/.verify/bd0.png", await E.renderBackdrop(res,0,640,res.presentation.slides[0].shapes.filter(s=>s.text).map(s=>s.id)));
const back=toDeck(await E.importFile(out)); console.log('reimport slides',back.slides.length,'title:',back.slides[0].els.find(e=>e.text&&e.text.paras[0].runs.length)?.text.paras[0].runs.map(r=>r.t).join(''), 'last notes', back.slides[5].notes);
const A=res.presentation.slides[0].shapes, B=same.presentation.slides[0].shapes; console.log('orderA',A.slice(0,6).map(s=>s.id).join(','),'orderB',B.slice(0,6).map(s=>s.id).join(','), A.length, B.length);
for(let i=0;i<A.length;i++){const x=JSON.stringify(A[i]),y=JSON.stringify(B[i]); if(x!==y){let k=0;while(x[k]===y[k])k++; console.log("shape",A[i].id,"@",k); console.log("A:",JSON.stringify(x.slice(Math.max(0,k-80),k+120))); console.log("B:",JSON.stringify(y.slice(Math.max(0,k-80),k+120))); break;}}
