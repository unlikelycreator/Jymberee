import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const [f,w,h] of [['arch',1200,700],['seq',1200,760]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  await p.goto('file://'+process.cwd()+'/'+f+'.html',{waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:f+'.png'}); }
await b.close();
