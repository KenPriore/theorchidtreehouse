const $=s=>document.querySelector(s),canvas=$('#scene'),gl=canvas.getContext('webgl',{alpha:false,antialias:false});
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let motionEnabled=!reduce;let time=reduce?6.5:0,playing=!reduce,last=0,ready=false,entry=-1,entryClock=0,navigated=false;let stage={x:0,y:0,w:1,h:1};const pause=$('#pause');
const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg>';
const sync=()=>{pause.innerHTML=icon(playing?'<path d="M8 5v14M16 5v14"/>':'<path d="m8 5 11 7-11 7Z"/>');pause.setAttribute('aria-label',playing?'Pause animation':'Play animation');pause.title=pause.getAttribute('aria-label')};sync();
pause.onclick=()=>{playing=!playing;if(playing)motionEnabled=true;sync()};
$('#replay').onclick=()=>{time=reduce?6.5:0;entry=-1;entryClock=0;navigated=false;document.body.classList.remove('entering');playing=!reduce;sync()};
const full=$('#full');
function fullState(){const on=!!document.fullscreenElement;full.innerHTML=icon(on?'<path d="M9 3v6H3m12-6v6h6M3 15h6v6m6 0v-6h6"/>':'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/>');full.setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen');full.title=full.getAttribute('aria-label');full.setAttribute('aria-pressed',String(on));}
fullState();if(!document.fullscreenEnabled)full.hidden=true;
full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#experience').requestFullscreen()}catch(e){$('#error').hidden=false;$('#error').textContent='Fullscreen is unavailable here. The preview still fills this browser window.'}};
document.addEventListener('fullscreenchange',fullState);
$('#door').onclick=()=>{if(reduce||time<6.5||!ready){location.assign('https://theorchidtreehouse.com/?enter=1');return}entryClock=0;entry=0;document.body.classList.add('entering')};
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
async function init(){if(!gl)throw Error('WebGL is unavailable');const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}'));
gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D first;uniform sampler2D second;uniform vec2 res;uniform float t;uniform float enter;uniform float calm;
float spot(vec2 q,vec2 c,vec2 r){vec2 d=(q-c)/r;return exp(-2.*dot(d,d));}
float box(vec2 q,vec2 lo,vec2 hi,float f){return smoothstep(lo.x,lo.x+f,q.x)*(1.-smoothstep(hi.x-f,hi.x,q.x))*smoothstep(lo.y,lo.y+f,q.y)*(1.-smoothstep(hi.y-f,hi.y,q.y));}
vec2 breeze(vec2 q){vec2 w=q;
float bigCrown=smoothstep(.719,.744,q.x)*(1.-smoothstep(.892,.919,q.x))*smoothstep(.014,.045,q.y)*(1.-smoothstep(.24,.285,q.y));
float smallCrown=smoothstep(.566,.583,q.x)*(1.-smoothstep(.675,.695,q.x))*smoothstep(.183,.21,q.y)*(1.-smoothstep(.31,.349,q.y));
float bigTrunk=smoothstep(.766,.775,q.x)*(1.-smoothstep(.803,.812,q.x))*smoothstep(.225,.245,q.y);
float smallTrunk=smoothstep(.593,.602,q.x)*(1.-smoothstep(.621,.630,q.x))*smoothstep(.295,.318,q.y);
// Slow, overlapping breeze cycles; each crown responds at a different phase.
float breezeA=.56*sin(t*.60)+.28*sin(t*.71+1.3)+.16*sin(t*1.13+.4);
float breezeB=.55*sin(t*.55+.85)+.30*sin(t*.67+2.1)+.15*sin(t*1.07+1.4);
// Small rotation about each crown base, with movement increasing toward the tips.
vec2 bigOffset=q-vec2(.790,.272);
vec2 smallOffset=q-vec2(.610,.337);
float bigTip=clamp(length(bigOffset/vec2(.14,.23)),0.,1.);
float smallTip=clamp(length(smallOffset/vec2(.10,.16)),0.,1.);
float bigAngle=.078*breezeA*bigCrown*(1.-bigTrunk)*bigTip;
float smallAngle=.072*breezeB*smallCrown*(1.-smallTrunk)*smallTip;
w+=vec2(-bigOffset.y,bigOffset.x)*bigAngle;
w+=vec2(-smallOffset.y,smallOffset.x)*smallAngle;

// Hard exclusion around the entire disco ball and its hanging cord.
float ballClear=box(q,vec2(.888,0.),vec2(.972,.177),.006);
w=mix(w,q,ballClear);
return mix(q,w,calm);}
// Eyelids cover the eye with nearby fur; the eye narrows as it closes.
vec3 blinkingEye(vec3 c,vec2 q,vec2 center,float shut){
 vec2 radius=vec2(.0070,.0060);vec2 d=(q-center)/radius;
 float region=(1.-smoothstep(.85,1.12,length(d)))*shut;
 if(region>0.){
  float aperture=max(.07,1.-shut);vec2 sampleEye=vec2(q.x,center.y+(q.y-center.y)/aperture);
  vec3 fur=texture2D(second,vec2(q.x,center.y-.009+abs(q.y-center.y)*.2)).rgb;
  float lidLine=(1.-smoothstep(.00035,.0010,abs(q.y-center.y)))*(1.-smoothstep(.7,1.,abs(d.x)));
  fur=mix(fur,vec3(.29,.17,.08),lidLine*shut*.8);
  float openEye=1.-smoothstep(aperture*.70,aperture,abs(d.y));
  vec3 lid=mix(fur,texture2D(second,sampleEye).rgb,openEye*(1.-smoothstep(.90,1.,shut)));
  c=mix(c,lid,region);
 }
 return c;
}
vec3 modern(vec2 q){vec2 w=breeze(q);float age=max(0.,t-6.5);
// A small ribcage rise; paws, face, sofa and resting pose remain fixed.
float chest=box(q,vec2(.106,.604),vec2(.195,.672),.018);
float inhale=.5-.5*cos(age*6.2831853/3.0);
w.y+=.0032*inhale*chest*calm;
vec3 c=texture2D(second,w).rgb;
float blinkTime=mod(age+5.,7.8);
float shut=smoothstep(0.,.16,blinkTime)*(1.-smoothstep(.24,.50,blinkTime));
shut*=step(1.,age)*calm;
c=blinkingEye(c,q,vec2(366.7/1672.,592.5/941.),shut);
c=blinkingEye(c,q,vec2(399.6/1672.,590.5/941.),shut);
// Slow rotation is confined to the mirrored sphere.
vec2 ball=(q-vec2(.929,.099))/vec2(.0295,.0525);float br=dot(ball,ball);
if(br<.95&&calm>.5){
 // Earlier slow spinning treatment: one mirrored image, without sparkle overlays.
 float z=sqrt(max(0.,1.-br));
 float lon=atan(ball.x,z);
 float rotation=age*6.2831853/20.;
 float ring=sqrt(max(0.,1.-ball.y*ball.y));
 vec2 sampleQ=vec2(.929+sin(lon+rotation)*ring*.0295,q.y);
 c=texture2D(second,sampleQ).rgb;
}
// Coral door swings inward on its left hinge while the viewpoint approaches.
if(enter>=0.){float swing=smoothstep(0.,.65,enter);float left=.555,right=.587;float top=.394+(q.x-left)*.55;if(q.x>left&&q.x<right&&q.y>top&&q.y<.675){float width=(right-left)*max(.07,cos(swing*1.48));c=vec3(.965,.937,.866);if(q.x<left+width){vec2 sampleQ=vec2(left+(q.x-left)/max(.07,cos(swing*1.48)),q.y);c=texture2D(second,sampleQ).rgb*(1.-swing*.20);}}}
return c;}
void main(){vec2 screen=vec2(uv.x,1.-uv.y);float ratio=1672./941.;float view=res.x/res.y;vec2 q=screen;if(view>ratio)q.x=(q.x-.5)*view/ratio+.5;else q.y=(q.y-.5)*ratio/view+.5;
if(enter>=0.){float zoom=1.+11.*pow(smoothstep(.15,1.25,enter),2.);q=(q-vec2(.572,.533))/zoom+vec2(.572,.533);}
if(q.x<0.||q.x>1.||q.y<0.||q.y>1.){gl_FragColor=vec4(.957,.929,.859,1.);return;}
vec3 newer=modern(q);float turn=smoothstep(3.5,6.5,t);vec2 w=breeze(q);float tail=spot(q,vec2(.121,.733),vec2(.043,.082))*smoothstep(.66,.71,q.y);w.x+=sin(t*2.4)*.010*tail*calm;vec3 older=texture2D(first,w).rgb;
vec3 color=newer;
if(turn<=0.)color=older;else if(turn<1.){vec2 p=q*vec2(ratio,1.);vec2 normal=normalize(vec2(.85,.72));float far=dot(vec2(ratio,1.),normal);float crease=mix(far+.02,-.16,turn);float d=dot(p,normal)-crease; color=d<=0.?older:newer;
// The lifted lower-right sheet folds over the original, revealing the new room below.
vec2 reflected=(p-2.*d*normal)/vec2(ratio,1.);bool back=d<=0.&&reflected.x>=0.&&reflected.x<=1.&&reflected.y>=0.&&reflected.y<=1.;if(back){float curl=exp(d*30.);float paper=.91+.06*(1.-curl);color=vec3(paper,paper*.975,paper*.913);color-=.09*exp(-abs(d+.012)*65.);float grain=fract(sin(dot(q,vec2(231.17,97.43)))*43758.5);color+=(grain-.5)*.008;}else if(d>0.)color*=1.-.17*exp(-d*35.);}
gl_FragColor=vec4(color,1.);}`));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);let a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
await Promise.all(['original-wood-frames.png','modern-clean-pool.png'].map((file,i)=>new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>{gl.activeTexture(gl.TEXTURE0+i);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);gl.uniform1i(gl.getUniformLocation(p,['first','second'][i]),i);resolve()};im.onerror=()=>reject(Error('Could not load '+file));im.src='assets/'+file})));
const ut=gl.getUniformLocation(p,'t'),ur=gl.getUniformLocation(p,'res'),ue=gl.getUniformLocation(p,'enter'),uc=gl.getUniformLocation(p,'calm');gl.uniform1f(uc,reduce?0:1);
function draw(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(!document.hidden){if(playing)time+=dt;if(entry>=0)entry=entryClock+=dt;}const d=Math.min(devicePixelRatio,1.75),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.uniform2f(ur,w,h);gl.uniform1f(uc,motionEnabled?1:0);gl.uniform1f(ut,time);gl.uniform1f(ue,entry);gl.drawArrays(gl.TRIANGLES,0,6);
const ratio=1672/941,sw=Math.min(innerWidth,innerHeight*ratio),sh=sw/ratio;stage={x:(innerWidth-sw)/2,y:(innerHeight-sh)/2,w:sw,h:sh};const door=$('#door');door.hidden=entry>=0;$('#arrival').style.opacity=entry<0?0:Math.max(0,Math.min(1,(entry-.85)/.5));
if(entry>=1.65&&!navigated){navigated=true;location.assign('https://theorchidtreehouse.com/?enter=1');}requestAnimationFrame(draw)}
ready=true;$('#loading').remove();requestAnimationFrame(draw);window.orchid={seek(s){time=s;playing=false;sync()},get time(){return time},get ready(){return ready},get stage(){return stage},get entry(){return entry}};}
init().catch(e=>{console.error(e);$('#loading')?.remove();$('#fallback').hidden=false;$('#error').hidden=false;$('#error').textContent='The still image is available. Use “Come on in” to continue; animation could not start in this browser.';$('#controls').hidden=true});
