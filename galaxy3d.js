const THREE = window.THREE;
const galaxyAsset = (path) => (window.GALAXY_ASSETS && window.GALAXY_ASSETS[path]) || path;

function canCreateWebGL() {
  try {
    if (!window.WebGLRenderingContext) return false;
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
               testCanvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });
    if (!gl) return false;
    // Release the probe context before Three.js creates the real renderer.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch (_) {
    return false;
  }
}

// Fallback: if the runner blocks the CDN or cannot create WebGL, render a
// lightweight Canvas galaxy instead of leaving an empty stage.
if (!THREE || !canCreateWebGL()) {
  (() => {
    const stage = document.getElementById("galaxyStage");
    if (!stage) return;
    const canvas = document.createElement("canvas");
    canvas.id = "galaxy3dCanvas";
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:4;touch-action:none";
    stage.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const stars = Array.from({length:window.innerWidth<700?520:900},()=>({
      a:Math.random()*Math.PI*2,r:Math.random(),s:.3+Math.random()*2,
      tw:Math.random()*6.28,c:["#fff1ff","#d9b8ff","#9eeaff","#ffbce8"][Math.floor(Math.random()*4)]
    }));
    const imgs=Array.from({length:13},(_,i)=>{
      const im=new Image(); im.src=galaxyAsset(`assets/photo-${i+1}.jpg`); im.onload=()=>{};
      return im;
    });
    const centralImage=new Image();
    centralImage.src=galaxyAsset("assets/central-couple.jpg");
    const photoStars=Array.from({length:window.innerWidth<700?18:28},(_,i)=>({
      arm:i%5,along:Math.floor(i/5)/13.5,offset:(Math.random()-.5)*.28,
      size:9+Math.random()*10,photo:i%13,tw:Math.random()*6.28
    }));
    let yaw=0,pitch=0,zoom=1,down=null,pointers=new Map(),pinch=0,frame=0;
    const resize=()=>{const d=Math.min(devicePixelRatio||1,2);canvas.width=stage.clientWidth*d;canvas.height=stage.clientHeight*d;ctx.setTransform(d,0,0,d,0,0);};
    new ResizeObserver(resize).observe(stage); resize();
    let lastFrame=0;
    function draw(now=0){
      requestAnimationFrame(draw);
      if(now-lastFrame<(window.innerWidth<700?1000/30:1000/40))return;
      lastFrame=now;
      const w=stage.clientWidth,h=stage.clientHeight,cx=w/2,cy=h/2;
      ctx.clearRect(0,0,w,h);
      const scale=Math.min(w,h)/650*zoom;
      // Star spiral with depth-like parallax.
      stars.forEach((s,i)=>{
        const a=s.a+yaw*.012+frame*.00015*(i%2?1:-1);
        const rr=(22+s.r*290)*scale;
        const x=cx+Math.cos(a)*rr;
        const y=cy+Math.sin(a)*rr*.48+Math.sin(a*2+yaw*.01)*pitch;
        ctx.globalAlpha=.35+.65*(.5+.5*Math.sin(frame*.04+s.tw));
        ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(x,y,s.s*scale*.65,0,Math.PI*2);ctx.fill();
      });
      ctx.globalAlpha=1;
      // Many tiny photographs form the spiral arms of the galaxy.
      photoStars.forEach((p,i)=>{
        const radius=(48+p.along*250)*scale;
        const angle=p.arm*Math.PI*2/5+radius/scale*.011+yaw*.012+p.offset+frame*.00012;
        const x=cx+Math.cos(angle)*radius;
        const y=cy+Math.sin(angle)*radius*.48+Math.sin(angle*2)*pitch*.35;
        const im=imgs[p.photo],sz=p.size*scale*.72;
        ctx.save();ctx.globalAlpha=.72+.28*Math.sin(frame*.035+p.tw);
        ctx.shadowBlur=12*scale;ctx.shadowColor="#e8a4ff";
        ctx.fillStyle="#f1caff";ctx.beginPath();ctx.roundRect(x-sz/2-2,y-sz/2-2,sz+4,sz+4,3*scale);ctx.fill();
        if(im.complete&&im.naturalWidth){
          const side=Math.min(im.naturalWidth,im.naturalHeight);
          const sx=(im.naturalWidth-side)/2,sy=(im.naturalHeight-side)/2;
          ctx.save();ctx.beginPath();ctx.roundRect(x-sz/2,y-sz/2,sz,sz,2*scale);ctx.clip();
          ctx.drawImage(im,sx,sy,side,side,x-sz/2,y-sz/2,sz,sz);ctx.restore();
        }
        ctx.restore();
      });
      // Nebula glow and vivid central planet.
      const glow=ctx.createRadialGradient(cx,cy,8,cx,cy,175*scale);
      glow.addColorStop(0,"rgba(255,220,255,.95)");glow.addColorStop(.25,"rgba(219,105,255,.48)");
      glow.addColorStop(.65,"rgba(117,76,255,.18)");glow.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,180*scale,0,Math.PI*2);ctx.fill();
      // The center is a round photo globe. The couple portrait is integrated
      // into the mosaic rather than laid over it as a large rectangle.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx,cy,75*scale,0,Math.PI*2);
      ctx.clip();
      const tile=37.5*scale;
      const mosaic=[imgs[0],imgs[1],imgs[2],imgs[3],
                    imgs[4],centralImage,centralImage,imgs[5],
                    imgs[6],imgs[7],centralImage,centralImage,
                    imgs[0],imgs[2],imgs[4],imgs[6]];
      for(let row=0;row<4;row++)for(let col=0;col<4;col++){
        const im=mosaic[row*4+col],x=cx-75*scale+col*tile,y=cy-75*scale+row*tile;
        if(im&&im.complete&&im.naturalWidth){
          const ratio=im.naturalWidth/im.naturalHeight,side=Math.min(im.naturalWidth,im.naturalHeight);
          const sx=(im.naturalWidth-side)/2,sy=(im.naturalHeight-side)/2;
          ctx.drawImage(im,sx,sy,side,side,x,y,tile,tile);
        }else{
          ctx.fillStyle=["#a85bce","#713f9c","#df85c9","#3f72a8"][(row+col)%4];
          ctx.fillRect(x,y,tile,tile);
        }
        ctx.strokeStyle="rgba(255,225,255,.58)";
        ctx.lineWidth=1.1*scale;
        ctx.strokeRect(x,y,tile,tile);
      }
      const shade=ctx.createRadialGradient(cx-35*scale,cy-40*scale,4,cx,cy,100*scale);
      shade.addColorStop(0,"rgba(255,255,255,.08)");
      shade.addColorStop(.72,"rgba(20,12,32,.03)");
      shade.addColorStop(1,"rgba(3,2,18,.22)");
      ctx.fillStyle=shade;
      ctx.fillRect(cx-80*scale,cy-80*scale,160*scale,160*scale);
      ctx.restore();
      ctx.strokeStyle="rgba(255,225,255,.9)";
      ctx.lineWidth=2*scale;
      ctx.shadowBlur=18*scale;
      ctx.shadowColor="#ef9dff";
      ctx.beginPath();
      ctx.arc(cx,cy,75*scale,0,Math.PI*2);
      ctx.stroke();
      ctx.shadowBlur=0;
      // Bright orbit rings.
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-.25+yaw*.003);
      ctx.strokeStyle="#ffb8f5";ctx.lineWidth=2.5*scale;ctx.shadowBlur=18;ctx.shadowColor="#f7aaff";
      ctx.beginPath();ctx.ellipse(0,0,145*scale,43*scale,0,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle="#7deaff";ctx.lineWidth=1.3*scale;ctx.beginPath();ctx.ellipse(0,0,190*scale,58*scale,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      // Photo cards are drawn upright, never stretched by the rotation.
      imgs.forEach((im,i)=>{
        const a=i*Math.PI*2/imgs.length+yaw*.018+frame*.0005*(i%2?1:-1);
        const r=(218+(i%3)*17)*scale;
        const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.58;
        const cardW=im.naturalWidth>im.naturalHeight?112:92;
        const cardH=im.naturalWidth>im.naturalHeight?82:126;
        ctx.save();ctx.shadowBlur=18;ctx.shadowColor="#e8a4ff";ctx.fillStyle="#e9c5ff";
        ctx.beginPath();ctx.roundRect(x-cardW/2-4,y-cardH/2-4,cardW+8,cardH+8,10);ctx.fill();
        ctx.fillStyle="#140c25";ctx.fillRect(x-cardW/2,y-cardH/2,cardW,cardH);
        if(im.complete&&im.naturalWidth){
          const ratio=Math.min(cardW/im.naturalWidth,cardH/im.naturalHeight);
          const iw=im.naturalWidth*ratio,ih=im.naturalHeight*ratio;
          ctx.drawImage(im,x-iw/2,y-ih/2,iw,ih);
        }
        ctx.restore();
      });
      frame++;
    }
    requestAnimationFrame(draw);
    canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY};});
    canvas.addEventListener("pointermove",e=>{
      if(!pointers.has(e.pointerId))return;
      const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===1){yaw+=(e.clientX-old.x)*.55;pitch=Math.max(-45,Math.min(45,pitch+(e.clientY-old.y)*.4));}
      else if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)zoom=Math.max(.65,Math.min(1.7,zoom*d/pinch));pinch=d;}
    });
    const end=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=0;};
    canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
    canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(.65,Math.min(1.7,zoom-e.deltaY*.001));},{passive:false});
    canvas.addEventListener("click",e=>{
      const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
      const cx=rect.width/2,cy=rect.height/2,scale=Math.min(rect.width,rect.height)/650*zoom;
      if(Math.hypot(x-cx,y-cy)<95*scale){
        if(typeof window.showPhoto==="function")window.showPhoto(galaxyAsset("assets/central-couple.jpg"),"♥");
        else document.getElementById("coreButton")?.click();
        return;
      }
      const hit=imgs.map((im,i)=>{const a=i*Math.PI*2/imgs.length+yaw*.018+frame*.0005*(i%2?1:-1);const r=(218+(i%3)*17)*scale;return {i,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.58};})
        .find(p=>Math.abs(x-p.x)<55*scale&&Math.abs(y-p.y)<75*scale);
      if(hit&&typeof window.showPhoto==="function")window.showPhoto(galaxyAsset(`assets/photo-${hit.i+1}.jpg`),hit.i+1);
    });
  })();
} else {

/*
 * Galaxy Love 2.0 - 3D galaxy engine
 * Inspired by the radial star distribution and orbital scene in the
 * BSD-2-Clause Galaxy Visualization source shared by the user.
 * The original project's license notice is retained in README.txt.
 */

const stage = document.getElementById("galaxyStage");
if (!stage) throw new Error("Missing #galaxyStage");

const renderer = new THREE.WebGLRenderer({
  antialias: window.innerWidth >= 700,
  alpha: true,
  powerPreference: "default"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.6));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.domElement.id = "galaxy3dCanvas";
renderer.domElement.setAttribute("aria-label", "Thiên hà 3D có thể xoay bằng cảm ứng");
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x090414, 0.0017);

const camera = new THREE.PerspectiveCamera(
  48,
  stage.clientWidth / stage.clientHeight,
  0.1,
  1200
);
let cameraRadius = 105;
let yaw = 0.22;
let pitch = 0.42;
let targetYaw = yaw;
let targetPitch = pitch;
let targetRadius = cameraRadius;
const lookTarget = new THREE.Vector3(0, 0, 0);

function updateCamera() {
  const cp = Math.cos(pitch);
  camera.position.set(
    cameraRadius * Math.sin(yaw) * cp,
    cameraRadius * Math.sin(pitch),
    cameraRadius * Math.cos(yaw) * cp
  );
  camera.lookAt(lookTarget);
}
updateCamera();

// Lighting gives the central core real depth and specular highlights.
scene.add(new THREE.AmbientLight(0x9a78c9, 1.15));
const coreLight = new THREE.PointLight(0xffa5ff, 165, 105, 1.65);
coreLight.position.set(0, 0, 0);
scene.add(coreLight);
const coolLight = new THREE.PointLight(0x64cfff, 65, 90, 1.8);
coolLight.position.set(-22, 8, 12);
scene.add(coolLight);
const warmLight = new THREE.PointLight(0xff5da8, 55, 100, 1.7);
warmLight.position.set(18, -7, -15);
scene.add(warmLight);

// Radial distribution: dense nucleus plus several spiral arms.
const GALAXY_RADIUS = 43;
const STAR_COUNT = window.innerWidth < 700 ? 1500 : 3200;
const starPositions = new Float32Array(STAR_COUNT * 3);
const starColors = new Float32Array(STAR_COUNT * 3);
const starSizes = new Float32Array(STAR_COUNT);
const palette = [
  new THREE.Color("#fff7ff"),
  new THREE.Color("#d9c5ff"),
  new THREE.Color("#a8eaff"),
  new THREE.Color("#ffc4e8"),
  new THREE.Color("#ffe8b5")
];

function biasedRadius() {
  const n = Math.random();
  if (n < .10) return Math.random() * .12;
  if (n < .40) return Math.random() * .32;
  if (n < .60) return Math.random() * .56;
  if (n < .80) return Math.random() * .78;
  return Math.random();
}

for (let i = 0; i < STAR_COUNT; i++) {
  const r = Math.sqrt(biasedRadius()) * GALAXY_RADIUS;
  const arm = Math.floor(Math.random() * 5);
  const twist = r * 0.115;
  const spread = (Math.random() - .5) * (0.10 + r * .006);
  const angle = arm * (Math.PI * 2 / 5) + twist + spread;
  const x = Math.cos(angle) * r + (Math.random() - .5) * 1.8;
  const z = Math.sin(angle) * r + (Math.random() - .5) * 1.8;
  const thickness = (1 - r / GALAXY_RADIUS) * 5.5 + .35;
  const y = (Math.random() - .5) * thickness;
  const k = i * 3;
  starPositions[k] = x;
  starPositions[k + 1] = y;
  starPositions[k + 2] = z;

  const color = palette[Math.floor(Math.random() * palette.length)];
  const warmth = .72 + Math.random() * .55;
  starColors[k] = color.r * warmth;
  starColors[k + 1] = color.g * warmth;
  starColors[k + 2] = color.b * warmth;
  starSizes[i] = .55 + Math.random() * 1.65;
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
starGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

const starMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexColors: true,
  uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    uniform float uTime;
    uniform float uPixelRatio;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      float twinkle = 0.72 + 0.28 * sin(uTime*2.0 + position.x*1.7 + position.z);
      gl_PointSize = size * uPixelRatio * twinkle * (230.0 / max(1.0,-mv.z));
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main(){
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float a = smoothstep(0.5,0.05,d);
      float core = smoothstep(0.18,0.0,d);
      gl_FragColor = vec4(vColor * (0.85 + core*1.8), a);
    }
  `
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Distant star layer: broad, faint, and independent of the main spiral.
const farCount = window.innerWidth < 700 ? 300 : 850;
const farPositions = new Float32Array(farCount * 3);
for (let i = 0; i < farCount; i++) {
  const radius = 115 + Math.random() * 230;
  const a = Math.random() * Math.PI * 2;
  const b = Math.acos(2 * Math.random() - 1);
  farPositions[i*3] = radius * Math.sin(b) * Math.cos(a);
  farPositions[i*3+1] = radius * Math.cos(b);
  farPositions[i*3+2] = radius * Math.sin(b) * Math.sin(a);
}
const farGeo = new THREE.BufferGeometry();
farGeo.setAttribute("position", new THREE.BufferAttribute(farPositions,3));
const farStars = new THREE.Points(farGeo,new THREE.PointsMaterial({
  color:0xcdbdff,size:.52,transparent:true,opacity:.7,sizeAttenuation:true,depthWrite:false
}));
scene.add(farStars);

// Procedural luminous cloud texture used by nebula sprites.
function makeGlowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128,128,2,128,128,126);
  g.addColorStop(0, inner);
  g.addColorStop(.24, inner.replace(/[\d.]+\)$/,"0.34)"));
  g.addColorStop(.62, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
}
const nebulaGroup = new THREE.Group();
scene.add(nebulaGroup);
const nebulaColors = [
  ["rgba(255,180,250,0.95)","rgba(181,65,255,0.18)"],
  ["rgba(100,220,255,0.85)","rgba(86,70,255,0.15)"],
  ["rgba(255,115,190,0.9)","rgba(255,75,160,0.14)"],
  ["rgba(190,145,255,0.85)","rgba(90,60,210,0.14)"]
];
nebulaColors.forEach((pair,i)=>{
  const tex = makeGlowTexture(pair[0],pair[1]);
  const mat = new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.58});
  const sprite = new THREE.Sprite(mat);
  const angle = i * Math.PI * .5 + .3;
  sprite.position.set(Math.cos(angle)*17,(i%2?1:-1)*3,Math.sin(angle)*17);
  const size = 38 + (i%2)*16;
  sprite.scale.set(size,size*.68,1);
  nebulaGroup.add(sprite);
});

// Multi-layer planet core with colorful cloud texture and luminous corona.
function makePlanetTexture() {
  // A compact photo mosaic, including the supplied couple portrait.
  // The central portrait is tiled into the sphere texture instead of being
  // placed as a large flat card in front of the planet.
  const canvas = document.createElement("canvas");
  // Higher-resolution atlas keeps the photo tiles crisp when the globe is zoomed.
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#170b2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Keep the central globe focused on the original eight photos and the
  // couple portrait. Newly added memories (photo-9 onward) orbit OUTSIDE it.
  const paths = [
    ...Array.from({ length: 8 }, (_, i) => `assets/photo-${i + 1}.jpg`),
    "assets/central-couple.jpg"
  ];
  const images = paths.map((path) => {
    const image = new Image();
    image.onload = drawMosaic;
    image.onerror = drawMosaic;
    image.src = galaxyAsset(path);
    return image;
  });

  function drawCover(image, x, y, w, h) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const cellRatio = w / h;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (imageRatio > cellRatio) {
      sw = image.naturalHeight * cellRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / cellRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }

  function drawMosaic() {
    const cols = 6, rows = 3;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;
    // The couple portrait occupies the middle of the visible texture and
    // appears again in the surrounding rows as part of the photo-globe.
    const layout = [
      0, 1, 2, 3, 4, 8,
      6, 8, 8, 7, 5, 3,
      4, 5, 0, 1, 2, 6
    ];
    ctx.fillStyle = "#170b2b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellW;
        const y = row * cellH;
        const image = images[layout[row * cols + col]];
        if (image && image.complete && image.naturalWidth) {
          drawCover(image, x + 2, y + 2, cellW - 4, cellH - 4);
        } else {
          const gradient = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
          gradient.addColorStop(0, "#9d54ce");
          gradient.addColorStop(1, "#18204d");
          ctx.fillStyle = gradient;
          ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
        }
        // Preserve the original photo colors: no purple wash over the image tiles.
        ctx.strokeStyle = "rgba(255, 220, 255, .72)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);
      }
    }
    texture.needsUpdate = true;
  }

  drawMosaic();
  return texture;
}
const coreGroup = new THREE.Group();
scene.add(coreGroup);
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(9.2,48,48),
  new THREE.MeshBasicMaterial({
    map:makePlanetTexture(),
    // Basic material keeps the photo mosaic's real colors independent of
    // purple scene lights, while the separate atmosphere keeps the glow.
    toneMapped:false
  })
);
coreGroup.add(planet);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(9.75,32,32),
  new THREE.MeshBasicMaterial({color:0xc76cff,transparent:true,opacity:.13,side:THREE.BackSide})
);
coreGroup.add(atmosphere);

const corona = new THREE.Sprite(new THREE.SpriteMaterial({
  map:makeGlowTexture("rgba(255,210,255,0.95)","rgba(173,75,255,0.0)"),
  color:0xe5a4ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false
}));
corona.scale.set(38,38,1);
coreGroup.add(corona);

// Thin, tilted orbital rings around the central planet.
const rings = [];
[
  {r:13.2,tube:.075,color:0xffb8f1,opacity:.92,rx:1.12,rz:.28},
  {r:16.5,tube:.035,color:0x78eaff,opacity:.75,rx:.74,rz:.48},
  {r:20.5,tube:.025,color:0xc69aff,opacity:.48,rx:1.32,rz:.18}
].forEach((cfg)=>{
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(cfg.r,cfg.tube,6,96),
    new THREE.MeshBasicMaterial({color:cfg.color,transparent:true,opacity:cfg.opacity})
  );
  ring.rotation.x=cfg.rx;
  ring.rotation.z=cfg.rz;
  coreGroup.add(ring);
  rings.push(ring);
});

// A few orbiting luminous particles make the central area feel alive.
const moteCount=window.innerWidth < 700 ? 100 : 220;
const motePos=new Float32Array(moteCount*3);
for(let i=0;i<moteCount;i++){
  const a=Math.random()*Math.PI*2;
  const r=12+Math.random()*19;
  motePos[i*3]=Math.cos(a)*r;
  motePos[i*3+1]=(Math.random()-.5)*7;
  motePos[i*3+2]=Math.sin(a)*r;
}
const moteGeo=new THREE.BufferGeometry();
moteGeo.setAttribute("position",new THREE.BufferAttribute(motePos,3));
const motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({
  color:0xffd9ff,size:.42,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false
}));
coreGroup.add(motes);

// Photo cards are planes with real image textures. They always face the camera.
const photoMeshes=[];
const photoRaycast=[];
const photoTextures=[];
const photoStars=[];
const textureLoader=new THREE.TextureLoader();
const photoCount=13;
for(let i=0;i<photoCount;i++){
  const path=`assets/photo-${i+1}.jpg`;
  const tex=textureLoader.load(galaxyAsset(path));
  tex.colorSpace=THREE.SRGBColorSpace;
  photoTextures.push(tex);
  // Preserve detail on angled photo cards without allocating excessive GPU memory.
  tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps=true;
  tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.magFilter=THREE.LinearFilter;

  const landscape=(i===4 || i===6 || i===10 || i===12);
  // Slightly compact cards keep all memories readable without crowding the core.
  const w=landscape?8.8:7.6;
  const h=landscape?6.4:10.2;

  const cardGroup=new THREE.Group();
  const frame=new THREE.Mesh(
    new THREE.PlaneGeometry(w+.48,h+.48),
    new THREE.MeshBasicMaterial({color:0xf1c9ff,transparent:true,opacity:.96,side:THREE.DoubleSide})
  );
  frame.position.z=-.09;
  cardGroup.add(frame);

  const imagePlane=new THREE.Mesh(
    new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide})
  );
  imagePlane.userData.photoIndex=i+1;
  imagePlane.userData.photoPath=path;
  cardGroup.add(imagePlane);

  // Fine glowing edge and a small star pin above each photograph.
  const edge=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w+.58,h+.58)),
    new THREE.LineBasicMaterial({color:0xffcaff,transparent:true,opacity:.8})
  );
  edge.position.z=-.04;
  cardGroup.add(edge);

  cardGroup.userData={
    baseAngle:i*Math.PI*2/photoCount,
    radius:39+(i%4)*3.2,
    height:Math.sin(i*1.7)*9,
    speed:(i%2===0?1:-1)*(.042+(i%3)*.007),
    index:i+1
  };
  scene.add(cardGroup);
  photoMeshes.push(cardGroup);
  photoRaycast.push(imagePlane);
}

// The couple portrait is now part of the spherical photo mosaic texture.
// No flat center billboard is added, so the round 3D planet remains visible.

// The spiral arms are made from miniature photographs instead of ordinary dots.
// Each image is a tiny "photo-star", billboarded toward the viewer so it stays readable.
const photoStarCount = window.innerWidth < 700 ? 12 : 20;
const photoStarGlowTexture = makeGlowTexture(
  "rgba(255,220,255,.7)",
  "rgba(175,95,255,0)"
);
const photoStarGlowMaterial = new THREE.SpriteMaterial({
  map: photoStarGlowTexture,
  transparent: true,
  opacity: .5,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
for(let i=0;i<photoStarCount;i++){
  const arm=i%5;
  const along=Math.floor(i/5)/(Math.ceil(photoStarCount/5));
  const radius=10+along*39+Math.random()*2.4;
  const angle=arm*Math.PI*2/5+radius*.115+(Math.random()-.5)*.22;
  const width=1.65+Math.random()*1.0;
  const height=width*(.72+Math.random()*.5);
  const group=new THREE.Group();
  const back=new THREE.Mesh(
    new THREE.PlaneGeometry(width+.24,height+.24),
    new THREE.MeshBasicMaterial({color:0xf5caff,transparent:true,opacity:.86,side:THREE.DoubleSide})
  );
  back.position.z=-.08;group.add(back);
  const image=new THREE.Mesh(
    new THREE.PlaneGeometry(width,height),
    new THREE.MeshBasicMaterial({map:photoTextures[i%photoTextures.length],side:THREE.DoubleSide})
  );
  group.add(image);
  const glow=new THREE.Sprite(photoStarGlowMaterial);
  glow.scale.set(width*2.3,height*2.3,1);glow.position.z=-.12;group.add(glow);
  group.userData={
    baseAngle:angle,radius,heightY:(Math.random()-.5)*5,
    speed:(Math.random()>.5?1:-1)*(.018+Math.random()*.035),
    imageIndex:i%photoCount
  };
  scene.add(group);photoStars.push(group);
}

// Extra glowing dust around the full galaxy.
const dustCount=window.innerWidth < 700 ? 300 : 650;
const dustPositions=new Float32Array(dustCount*3);
const dustColors=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){
  const r=12+Math.random()*46;
  const a=Math.random()*Math.PI*2;
  dustPositions[i*3]=Math.cos(a)*r;
  dustPositions[i*3+1]=(Math.random()-.5)*(4+Math.random()*10);
  dustPositions[i*3+2]=Math.sin(a)*r;
  const c=palette[Math.floor(Math.random()*palette.length)];
  dustColors[i*3]=c.r; dustColors[i*3+1]=c.g; dustColors[i*3+2]=c.b;
}
const dustGeo=new THREE.BufferGeometry();
dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPositions,3));
dustGeo.setAttribute("color",new THREE.BufferAttribute(dustColors,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({
  size:.34,vertexColors:true,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false
}));
scene.add(dust);

// Pointer controls: drag to orbit, pinch to zoom. No extra control buttons.
const pointers=new Map();
let lastX=0,lastY=0,lastPinch=0;
let dragging=false;
let velocityYaw=0,velocityPitch=0;
let suppressClick=false;
const raycaster=new THREE.Raycaster();
const pointerNdc=new THREE.Vector2();
let downPoint=null;

renderer.domElement.addEventListener("pointerdown",(e)=>{
  renderer.domElement.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  downPoint={x:e.clientX,y:e.clientY};
  if(pointers.size===1){lastX=e.clientX;lastY=e.clientY;dragging=true;}
  if(pointers.size===2){
    const pts=[...pointers.values()];
    lastPinch=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    dragging=false;
  }
});
renderer.domElement.addEventListener("pointermove",(e)=>{
  if(!pointers.has(e.pointerId))return;
  const prev=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1 && dragging){
    const dx=e.clientX-lastX,dy=e.clientY-lastY;
    targetYaw-=dx*.0062;
    targetPitch=Math.max(-1.12,Math.min(1.12,targetPitch+dy*.0048));
    velocityYaw=-dx*.00045;
    velocityPitch=dy*.0003;
    lastX=e.clientX;lastY=e.clientY;
    if(Math.abs(e.clientX-downPoint.x)+Math.abs(e.clientY-downPoint.y)>7)suppressClick=true;
  }else if(pointers.size===2){
    const pts=[...pointers.values()];
    const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
    if(lastPinch>0){
      targetRadius=Math.max(24,Math.min(245,targetRadius*(lastPinch/dist)));
      suppressClick=true;
    }
    lastPinch=dist;
  }
});
function pointerEnd(e){
  pointers.delete(e.pointerId);
  if(pointers.size===1){
    const p=[...pointers.values()][0];lastX=p.x;lastY=p.y;dragging=true;
  }else{dragging=false;lastPinch=0;}
  if(pointers.size===0)setTimeout(()=>{suppressClick=false;},120);
}
renderer.domElement.addEventListener("pointerup",pointerEnd);
renderer.domElement.addEventListener("pointercancel",pointerEnd);
renderer.domElement.addEventListener("wheel",(e)=>{
  e.preventDefault();
  targetRadius=Math.max(24,Math.min(245,targetRadius+e.deltaY*.075));
},{passive:false});

// Camera interaction is gesture-only: drag to rotate, pinch to zoom.
// Tap a photo to open the original image viewer; tap the core to trigger the heart gift.
renderer.domElement.addEventListener("click",(e)=>{
  if(suppressClick)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointerNdc.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointerNdc.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointerNdc,camera);
  const photoHit=raycaster.intersectObjects(photoRaycast,false)[0];
  if(photoHit){
    const data=photoHit.object.userData;
    if(typeof window.showPhoto==="function")window.showPhoto(data.photoPath,data.photoIndex);
    return;
  }
  const coreHit=raycaster.intersectObject(planet,false)[0];
  if(coreHit)document.getElementById("coreButton")?.click();
});

// Auto-rotation pauses while the user is touching the scene, then resumes smoothly.
let lastTime=performance.now();
const clock=new THREE.Clock();
let lastRenderedAt=0;
const frameInterval=window.innerWidth<700?1000/30:1000/40;
function animate(now){
  requestAnimationFrame(animate);
  if (document.hidden) return;
  if(now-lastRenderedAt<frameInterval)return;
  lastRenderedAt=now;
  const dt=Math.min(clock.getDelta(),.05);
  const elapsed=now*.001;

  if(!dragging && pointers.size===0){
    targetYaw+=.00135*(dt*60);
    targetYaw+=velocityYaw;
    targetPitch+=velocityPitch;
    velocityYaw*=.94;
    velocityPitch*=.94;
  }
  yaw+=(targetYaw-yaw)*.085;
  pitch+=(targetPitch-pitch)*.085;
  cameraRadius+=(targetRadius-cameraRadius)*.09;
  updateCamera();

  stars.rotation.y+=dt*.012;
  farStars.rotation.y-=dt*.0015;
  nebulaGroup.rotation.y+=dt*.018;
  coreGroup.rotation.y+=dt*.11;
  coreGroup.rotation.x=Math.sin(elapsed*.32)*.055;
  planet.rotation.y+=dt*.13;
  rings.forEach((ring,i)=>{ring.rotation.z+=dt*(i%2?.035:-.025)});
  motes.rotation.y-=dt*.045;
  dust.rotation.y+=dt*.008;
  starMaterial.uniforms.uTime.value=elapsed;

  photoMeshes.forEach((card,i)=>{
    const d=card.userData;
    const a=d.baseAngle+elapsed*d.speed;
    const radius=d.radius;
    card.position.set(Math.cos(a)*radius, d.height+Math.sin(elapsed*0.7+i)*1.5, Math.sin(a)*radius);
    // Billboard orientation keeps the photograph readable during every camera rotation.
    card.quaternion.copy(camera.quaternion);
    const pulse=1+Math.sin(elapsed*2.1+i)*.025;
    card.scale.setScalar(pulse);
  });

  photoStars.forEach((star,i)=>{
    const d=star.userData;
    const angle=d.baseAngle+elapsed*d.speed;
    star.position.set(Math.cos(angle)*d.radius,
      d.heightY+Math.sin(elapsed*.45+i*.7)*.65,
      Math.sin(angle)*d.radius);
    star.quaternion.copy(camera.quaternion);
    const twinkle=.88+Math.sin(elapsed*2.4+i)*.12;
    star.scale.setScalar(twinkle);
  });

  renderer.render(scene,camera);
}
requestAnimationFrame(animate);

const resizeObserver=new ResizeObserver(()=>{
  const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.25:1.6));
  starMaterial.uniforms.uPixelRatio.value=renderer.getPixelRatio();
});
resizeObserver.observe(stage);

// Pause GPU work while the galaxy is hidden; the first visible frame remains current.
document.addEventListener("visibilitychange",()=>{
  if (!document.hidden) clock.getDelta();
});
}
