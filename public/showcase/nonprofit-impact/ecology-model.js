// Educational Lotka–Volterra plant/herbivore model, not a calibrated forecast.
export const DEFAULT_ECOLOGY = Object.freeze({ flora:65, wildlife:25, growth:0.8, grazing:0.02, conversion:0.01, mortality:0.4 });
const limits={flora:150,wildlife:150,growth:1.5,grazing:0.05,conversion:0.03,mortality:1.2};
export function validateEcology(config) {
  for(const [key,max] of Object.entries(limits)) {
    if(!Number.isFinite(config[key])||config[key]<0||config[key]>max)throw new RangeError(`Invalid ${key}: expected 0–${max}.`);
  }
}
export function derivative([flora,wildlife],p) {
  return [flora*(p.growth-p.grazing*wildlife),wildlife*(p.conversion*flora-p.mortality)];
}
export function equilibrium(p) {
  return p.conversion>0&&p.grazing>0?{flora:p.mortality/p.conversion,wildlife:p.growth/p.grazing}:null;
}
function step(state,p,dt) {
  const add=(a,b,scale)=>a.map((x,i)=>x+b[i]*scale);
  const a=derivative(state,p),b=derivative(add(state,a,dt/2),p),c=derivative(add(state,b,dt/2),p),d=derivative(add(state,c,dt),p);
  return state.map((x,i)=>x+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
export function simulateEcology(config,{months=120,stepsPerMonth=20}={}) {
  validateEcology(config);
  if(!Number.isInteger(months)||months<1||months>120||!Number.isInteger(stepsPerMonth)||stepsPerMonth<1||stepsPerMonth>100)throw new RangeError('Invalid simulation resolution.');
  const dt=1/(12*stepsPerMonth),samples=[{year:0,flora:config.flora,wildlife:config.wildlife}];
  let state=[config.flora,config.wildlife];
  for(let month=1;month<=months;month++) {
    for(let i=0;i<stepsPerMonth;i++) {
      const next=step(state,config,dt);
      if(next.some(x=>!Number.isFinite(x)||x<0||x>1e6))return{samples,complete:false,reason:'The trajectory exceeded the numerical display range; the graph stops at the last complete month.'};
      state=next;
    }
    samples.push({year:month/12,flora:state[0],wildlife:state[1]});
  }
  return {samples,complete:true,reason:''};
}
