import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'../../outputs/livraison1-sante-2026-09-17');
const {chromium}=await import(pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  for(const width of [1440,768,380]){
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.addInitScript(()=>localStorage.setItem('behira_demo_session_v1',JSON.stringify({personaId:'facility',mode:'demo',remember:true,issuedAt:new Date().toISOString()})));
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.BEHIRA_PREVIEW_URL??'http://127.0.0.1:4185/',{waitUntil:'networkidle'});
    await page.locator('.app-navigation').waitFor();
    const measure=()=>page.evaluate(()=>{
      const el=document.querySelector('.app-navigation'),r=el.getBoundingClientRect();
      return {scrollY,position:getComputedStyle(el).position,top:r.top,bottom:r.bottom,viewportHeight:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+2};
    });
    const before=await measure();
    await page.evaluate(()=>scrollTo(0,650));await page.waitForFunction(()=>scrollY>100);
    const after=await measure();
    assert.equal(after.position,width>700?'sticky':'fixed');
    assert.ok(after.top>=0&&after.bottom<=after.viewportHeight);
    assert.equal(after.overflow,false);
    await page.screenshot({path:resolve(output,`header-${width}.png`)});
    const nav=page.getByRole('navigation',{name:'Navigation principale'});
    await nav.getByRole('button',{name:'Pilotage',exact:true}).click();
    await page.getByRole('tab',{name:'Performance',exact:true}).click();
    assert.equal(await page.locator('.agent-score-chart').count(),0);
    await page.getByRole('tab',{name:'Équipe',exact:true}).click();
    const panel=page.locator('#dashboard-panel-health');
    await panel.getByText(/^Score agent non calculable\./).waitFor();
    assert.match(await panel.innerText(),/échantillon admissible/);
    assert.equal(/\b(88|84|91)\b/.test(await panel.innerText()),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    assert.deepEqual(errors,[]);
    await panel.screenshot({path:resolve(output,`equipe-${width}.png`)});
    results.push({width,before,after,teamNonComputable:true,errors});
    await context.close();
  }
} finally {
  await browser.close();await writeFile(resolve(output,'design069-results.json'),JSON.stringify(results,null,2));
}
console.log('DESIGN-069: sticky desktop/tablet, fixed mobile navigation, no fabricated agent scores, Équipe pending rules; 1440/768/380 px passed.');
