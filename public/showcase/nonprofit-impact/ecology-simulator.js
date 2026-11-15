import { DEFAULT_ECOLOGY, simulateEcology, equilibrium, derivative } from './ecology-model.js';

const root=document.getElementById('ecology-simulator');
const form=root.querySelector('form'),svg=root.querySelector('svg'),status=root.querySelector('[role="status"]');
const cursor=root.querySelector('#eco-month'),readout=root.querySelector('#eco-readout');
const keys=Object.keys(DEFAULT_ECOLOGY),ns='http://www.w3.org/2000/svg';
let result,config;
function element(name,attrs,text){const node=document.createElementNS(ns,name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));if(text!==undefined)node.textContent=text;return node;}
function number(value){return value.toLocaleString('en-US',{maximumFractionDigits:3});}
function axisNumber(value){return value.toLocaleString('en-US',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1});}
function selectMonth(){
  const sample=result.samples[Number(cursor.value)];
  root.querySelector('#eco-year').textContent=number(sample.year);
  readout.textContent=`Year ${number(sample.year)}: flora ${number(sample.flora)}, wildlife ${number(sample.wildlife)} (illustrative abundance indices).`;
  svg.querySelectorAll('[data-cursor]').forEach(node=>node.remove());
  const max=Math.max(1,...result.samples.flatMap(p=>[p.flora,p.wildlife]));
  const x=58+sample.year/10*510;
  svg.append(element('line',{x1:x,x2:x,y1:22,y2:267,stroke:'#cbd5e1','stroke-dasharray':'3 4','data-cursor':''}));
  for(const [key,color] of [['flora','#34d399'],['wildlife','#fbbf24']])svg.append(element('circle',{cx:x,cy:267-sample[key]/max*235,r:5,fill:color,stroke:'#0f172a','stroke-width':2,'data-cursor':''}));
}
function update(){
  config=Object.fromEntries(keys.map(key=>[key,Number(form.elements[key].value)]));
  keys.forEach(key=>root.querySelector(`[data-value="${key}"]`).textContent=number(config[key]));
  try{result=simulateEcology(config);}catch(error){status.textContent=error.message;return;}
  svg.replaceChildren();
  svg.setAttribute('aria-label',`Flora and wildlife trajectories through year ${number(result.samples.at(-1).year)}${result.complete?'':' (stopped early)'}.`);
  const max=Math.max(1,...result.samples.flatMap(p=>[p.flora,p.wildlife]));
  for(let i=0;i<=4;i++){
    const y=267-i/4*235;svg.append(element('line',{x1:58,x2:568,y1:y,y2:y,stroke:'#334155'}));
    svg.append(element('text',{x:51,y:y+4,'text-anchor':'end',fill:'#cbd5e1','font-size':11},axisNumber(max*i/4)));
  }
  for(let year=0;year<=10;year+=2)svg.append(element('text',{x:58+year/10*510,y:289,'text-anchor':'middle',fill:'#cbd5e1','font-size':12},String(year)));
  svg.append(element('text',{x:313,y:314,'text-anchor':'middle',fill:'#e2e8f0','font-size':13},'Simulated years'));
  svg.append(element('text',{x:58,y:15,fill:'#e2e8f0','font-size':12},'Illustrative abundance index (shared scale)'));
  for(const [key,color,dash] of [['flora','#34d399',''],['wildlife','#fbbf24','7 4']]){
    const path=result.samples.map((p,i)=>`${i?'L':'M'}${58+p.year/10*510},${267-p[key]/max*235}`).join(' ');
    svg.append(element('path',{d:path,fill:'none',stroke:color,'stroke-width':2.5,'stroke-dasharray':dash}));
  }
  const eq=equilibrium(config),initial=derivative([config.flora,config.wildlife],config);
  root.querySelector('#eco-equilibrium').textContent=eq?`Coexistence reference: flora ${number(eq.flora)}, wildlife ${number(eq.wildlife)}. Classical Lotka–Volterra can cycle around this point; it does not guarantee recovery or convergence.`:'No finite coexistence reference with these interaction rates.';
  status.textContent=result.complete?`Ten-year simulation complete. Initial trend: flora ${initial[0]>1e-8?'increasing':initial[0]<-1e-8?'decreasing':'steady'}, wildlife ${initial[1]>1e-8?'increasing':initial[1]<-1e-8?'decreasing':'steady'}.`:result.reason;
  const body=root.querySelector('tbody');body.replaceChildren();
  result.samples.filter((p,i)=>i%12===0||i===result.samples.length-1).forEach(sample=>{
    const tr=document.createElement('tr');for(const value of [sample.year,sample.flora,sample.wildlife]){const cell=document.createElement('td');cell.textContent=number(value);tr.append(cell);}body.append(tr);
  });
  cursor.max=String(result.samples.length-1);cursor.value=String(Math.min(Number(cursor.value),result.samples.length-1));selectMonth();
}
form.addEventListener('input',update);cursor.addEventListener('input',selectMonth);
root.querySelector('#eco-reset').addEventListener('click',()=>{keys.forEach(key=>{form.elements[key].value=String(DEFAULT_ECOLOGY[key]);});cursor.value='0';update();});
root.querySelector('#eco-balanced').addEventListener('click',()=>{keys.forEach(key=>{form.elements[key].value=String(DEFAULT_ECOLOGY[key]);});form.elements.flora.value='40';form.elements.wildlife.value='40';cursor.value='0';update();});
update();
