import { RippleField } from './ripple-model.js';

const controls=document.getElementById('ripple-controls');
const enabled=document.getElementById('ripple-enabled');
const notice=document.getElementById('ripple-status');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const instances=[];
const settings=()=>({frequency:Number(controls.elements.frequency.value),amplitude:Number(controls.elements.amplitude.value),damping:Number(controls.elements.damping.value)});
const allowed=()=>enabled.checked&&!motion.matches&&!document.hidden;
const artwork=new URL('./portfolio-art.svg',import.meta.url).href;

document.querySelectorAll('.project-preview').forEach(preview=>{
  const image=new Image();image.src=artwork;image.alt='';image.className='ripple-art';image.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.className='ripple-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;
  preview.prepend(image,canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const source=document.createElement('canvas'), buffer=source.getContext('2d');if(!buffer)return;
  const field=new RippleField();let frame=0,lastInput=-Infinity,visible=true,drag=null,suppressClick=false;
  function stop(){cancelAnimationFrame(frame);frame=0;field.clear();canvas.hidden=true;}
  function resize(){
    stop();const rect=preview.getBoundingClientRect();
    const scale=Math.min(devicePixelRatio||1,1.5,600/Math.max(1,rect.width),300/Math.max(1,rect.height));
    canvas.width=source.width=Math.max(1,Math.round(rect.width*scale));
    canvas.height=source.height=Math.max(1,Math.round(rect.height*scale));
    if(image.naturalWidth)buffer.drawImage(image,0,0,source.width,source.height);
  }
  function draw(time){
    frame=0;const config=settings();
    if(!allowed()||!visible||!field.prune(time,config.damping)){stop();return;}
    canvas.hidden=false;
    const w=canvas.width,h=canvas.height;
    // One-pixel scanlines keep displacement continuous without a dense tile grid.
    // The unchanged base image fills the exposed edge of shifted scanlines.
    ctx.drawImage(source,0,0,w,h);
    for(let y=0;y<h;y++){
      const d=field.sample(.5,(y+.5)/h,time,config);
      ctx.drawImage(source,0,y,w,1,(d.x+d.y)*.7,y,w,1);
    }
    frame=requestAnimationFrame(draw);
  }
  function impulse(x,y){
    if(!allowed()||!visible||!image.naturalWidth)return;
    const now=performance.now();if(now-lastInput<45)return;lastInput=now;
    field.add(x,y,now);if(!frame)frame=requestAnimationFrame(draw);
  }
  function point(event){const r=preview.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height};}
  preview.addEventListener('pointerdown',event=>{if(event.button===0){drag={id:event.pointerId,x:event.clientX,y:event.clientY};suppressClick=false;const p=point(event);impulse(p.x,p.y);}});
  preview.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'&&(!drag||drag.id!==event.pointerId))return;
    if(drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>8)suppressClick=true;
    const p=point(event);impulse(p.x,p.y);
  });
  preview.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){const p=point(event);impulse(p.x,p.y);}});
  preview.addEventListener('pointerup',()=>{drag=null;});
  preview.addEventListener('pointercancel',()=>{drag=null;suppressClick=false;stop();});
  preview.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(preview);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();});observer.observe(preview);
  image.addEventListener('load',resize);image.addEventListener('error',stop);
  instances.push({stop,preview:()=>impulse(.5,.5)});resize();
});
function update(){
  instances.forEach(instance=>instance.stop());
  notice.textContent=motion.matches?'Static thumbnails: reduced-motion preference is active.':enabled.checked?'Ripple on: move across a thumbnail or drag horizontally. Vertical touch scrolling stays available.':'Static thumbnails: ripple effect is off.';
  document.getElementById('ripple-preview').disabled=!allowed();
}
controls.addEventListener('input',update);motion.addEventListener('change',update);
document.addEventListener('visibilitychange',update);window.addEventListener('pagehide',()=>instances.forEach(instance=>instance.stop()));
document.getElementById('ripple-preview').addEventListener('click',()=>instances[0]?.preview());
update();
