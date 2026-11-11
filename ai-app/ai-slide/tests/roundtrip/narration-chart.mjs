import fs from 'fs'; import * as E from '../../backend/engine.mjs'; import { toDeck, fromDeck } from '../../backend/dcmodel.mjs';
const n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
const wav='data:audio/wav;base64,'+b.toString('base64');
const res=await E.importFile(fs.readFileSync('../fixtures/chart.pptx')); const d=toDeck(res);
d.slides[1].els.push({id:'a1',type:'audio',narration:1,name:'Thuyết minh',src:wav,x:900,y:480,w:36,h:36}); d.slides[1].transition={type:'fade',dur:.6,after:4};
d.slides[0].els.find(e=>e.type==='chart').chart.series[0].values=[9,9,9];
const out=await E.exportFile(fromDeck(d,res),'pptx'); fs.writeFileSync('/tmp/narr.pptx',out);
const back=toDeck(await E.importFile(out));
console.log('audio back:', back.slides[1].els.filter(e=>e.type==='audio').map(e=>e.src?.slice(0,22)), 'after', back.slides[1].transition?.after, 'chart', JSON.stringify(back.slides[0].els.find(e=>e.type==='chart')?.chart.series[0].values));
