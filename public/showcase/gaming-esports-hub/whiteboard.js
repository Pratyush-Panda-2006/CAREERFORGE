import { WIDTH, HEIGHT, clamp, toBoardPoint, hitTest, StrategyBoard } from './whiteboard-model.js';

const root = document.getElementById('strategy-board');
const canvas = root.querySelector('canvas');
const ctx = canvas.getContext('2d');
const status = root.querySelector('#wb-status');
if (!ctx) {
  status.textContent = 'Canvas is unavailable in this browser.';
} else {
  const boards = {courtyard:new StrategyBoard(), lanes:new StrategyBoard()};
  const names = {courtyard:'Courtyard',lanes:'Three lanes'};
  const picker = root.querySelector('#wb-marker');
  const undo = root.querySelector('#wb-undo'), clear = root.querySelector('#wb-clear');
  let map = 'courtyard', tool = 'select', selected = -1, gesture = null, counter = 0;
  const board = () => boards[map];
  const markers = {
    blue:{color:'#67e8f9',prefix:'B'},red:{color:'#fda4af',prefix:'R'},
    smoke:{color:'#c4b5fd',prefix:'S'},ward:{color:'#fde68a',prefix:'W'},
  };
  const point = event => toBoardPoint(event.clientX,event.clientY,canvas.getBoundingClientRect());
  const snapshot = () => structuredClone(board().shapes);

  function background() {
    ctx.fillStyle='#0c1525'; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.strokeStyle='#20324a'; ctx.lineWidth=1;
    for(let x=0;x<=WIDTH;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}
    for(let y=0;y<=HEIGHT;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
    ctx.fillStyle='#2c3b50';
    const blocks=map==='courtyard' ? [[160,120,130,180],[610,120,130,180],[355,190,190,90]]
      : [[190,110,160,100],[190,310,160,100],[550,110,160,100],[550,310,160,100]];
    blocks.forEach(block=>ctx.fillRect(...block));
    ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [label,x,y,color] of [['A SITE',90,90,'#67e8f9'],['B SITE',810,430,'#fda4af'],['MID',450,130,'#cbd5e1']]) {
      ctx.fillStyle=color;ctx.fillText(label,x,y);
    }
    ctx.font='13px sans-serif';ctx.fillStyle='#b5c4d9';ctx.fillText(`${names[map]} • Vortex practice layout`,WIDTH/2,HEIGHT-18);
  }
  function render(shapes=board().shapes) {
    background();
    shapes.forEach((shape,index)=>{
      if(shape.kind==='marker') {
        ctx.beginPath();ctx.arc(shape.x,shape.y,shape.type==='smoke'?23:17,0,Math.PI*2);
        ctx.fillStyle=markers[shape.type].color;ctx.globalAlpha=shape.type==='smoke'?.65:1;ctx.fill();ctx.globalAlpha=1;
        ctx.lineWidth=index===selected?3:1;ctx.strokeStyle=index===selected?'#fff':'#09101c';ctx.stroke();
        ctx.font='bold 12px sans-serif';ctx.fillStyle='#09101c';ctx.textAlign='center';ctx.fillText(shape.label,shape.x,shape.y);
        return;
      }
      ctx.strokeStyle=shape.color;ctx.fillStyle=shape.color;ctx.lineWidth=shape.width;ctx.lineCap='round';ctx.lineJoin='round';
      const points=shape.points;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();
      if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,shape.width/2,0,Math.PI*2);ctx.fill();}
      if(shape.kind==='arrow'&&points.length>1) {
        const a=points[0],b=points.at(-1),angle=Math.atan2(b.y-a.y,b.x-a.x),size=14+shape.width;
        ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(angle-.45),b.y-size*Math.sin(angle-.45));
        ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(angle+.45),b.y-size*Math.sin(angle+.45));ctx.stroke();
      }
    });
  }
  function refresh(message) {
    picker.replaceChildren(new Option('None',''));
    board().shapes.forEach((shape,index)=>{
      if(shape.kind==='marker')picker.add(new Option(`${shape.label} · ${shape.type} · x ${Math.round(shape.x)}, y ${Math.round(shape.y)}`,String(index)));
    });
    picker.value=selected>=0?String(selected):'';
    undo.disabled=!board().history.length;clear.disabled=!board().shapes.length;
    status.textContent=message||`${names[map]} · ${board().shapes.length} annotations · ${tool} tool.`;
    canvas.setAttribute('aria-label',`${names[map]} tactical map, ${board().shapes.length} annotations. ${Array.from(picker.options).slice(1).map(o=>o.text).join('; ')}`);
    render();
  }
  function commit(shapes) {
    if(!board().commit(shapes)&&shapes.length>200)status.textContent='Map limit: 200 annotations. Erase or clear some first.';
    else refresh();
  }
  function setTool(value) {
    cancel();tool=value;
    root.querySelectorAll('[data-wb-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.wbTool===tool)));
    refresh();
  }
  function cancel() {
    if(gesture&&canvas.hasPointerCapture(gesture.id))canvas.releasePointerCapture(gesture.id);
    gesture=null;render();
  }
  root.querySelectorAll('[data-wb-tool]').forEach(button=>button.addEventListener('click',()=>setTool(button.dataset.wbTool)));
  root.querySelectorAll('[data-wb-marker]').forEach(button=>button.addEventListener('click',()=>{
    setTool('select');const type=button.dataset.wbMarker;
    const next=snapshot();selected=next.length;counter++;
    next.push({kind:'marker',type,label:`${markers[type].prefix}${counter}`,x:WIDTH/2,y:HEIGHT/2});commit(next);
  }));
  picker.addEventListener('change',()=>{selected=picker.value===''?-1:Number(picker.value);render();});
  root.querySelector('#wb-map').addEventListener('change',event=>{cancel();map=event.target.value;selected=-1;refresh();});
  undo.addEventListener('click',()=>{cancel();board().undo();selected=-1;refresh('Last edit undone.');});
  clear.addEventListener('click',()=>{cancel();selected=-1;commit([]);});

  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||gesture)return;
    event.preventDefault();canvas.focus();const p=point(event),next=snapshot();const hit=hitTest(next,p);
    if(tool==='erase') { if(hit>=0){next.splice(hit,1);selected=-1;commit(next);} return; }
    if(tool==='select') {
      selected=hit>=0&&next[hit].kind==='marker'?hit:-1;refresh();
      if(selected<0)return;
      gesture={id:event.pointerId,next,index:selected,offset:{x:p.x-next[selected].x,y:p.y-next[selected].y}};
    } else {
      next.push({kind:tool,color:root.querySelector('#wb-color').value,width:Number(root.querySelector('#wb-width').value),points:[p]});
      gesture={id:event.pointerId,next,index:next.length-1};
    }
    canvas.setPointerCapture(event.pointerId);render(next);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const p=point(event),shape=gesture.next[gesture.index];
    if(shape.kind==='marker'){shape.x=clamp(p.x-gesture.offset.x,WIDTH);shape.y=clamp(p.y-gesture.offset.y,HEIGHT);}
    else if(shape.kind==='arrow')shape.points=[shape.points[0],p];
    else if(shape.points.length<512&&Math.hypot(p.x-shape.points.at(-1).x,p.y-shape.points.at(-1).y)>2)shape.points.push(p);
    render(gesture.next);
  });
  canvas.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const next=gesture.next;cancel();commit(next);
  });
  canvas.addEventListener('pointercancel',cancel);
  canvas.addEventListener('lostpointercapture',()=>{if(gesture){gesture=null;render();}});
  canvas.addEventListener('keydown',event=>{
    if(event.key==='Escape'){cancel();refresh('Drag cancelled.');return;}
    if(gesture||selected<0)return;
    const next=snapshot(),shape=next[selected];if(!shape||shape.kind!=='marker')return;
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();next.splice(selected,1);selected=-1;commit(next);return;}
    const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(!moves[event.key])return;
    event.preventDefault();const [dx,dy]=moves[event.key],step=event.shiftKey?25:5;
    shape.x=clamp(shape.x+dx*step,WIDTH);shape.y=clamp(shape.y+dy*step,HEIGHT);commit(next);
  });
  root.querySelector('#wb-export').addEventListener('click',()=>{
    cancel();render();canvas.toBlob(blob=>{
      if(!blob){status.textContent='PNG export unavailable.';return;}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`vortex-${map}-strategy.png`;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='PNG exported with the current map and annotations.';
    },'image/png');
  });
  refresh();
}
