const $ = (s) => document.querySelector(s);

// Sao nền chuyển động
const starfield = $("#starfield");
for (let i = 0; i < (window.innerWidth <= 700 ? 90 : 180); i++) {
  const star = document.createElement("i");
  star.className = "bg-star";
  star.style.left = `${Math.random()*100}%`;
  star.style.top = `${Math.random()*100}%`;
  star.style.opacity = `${0.18 + Math.random()*0.82}`;
  star.style.setProperty("--dur", `${0.8 + Math.random()*3.8}s`);
  star.style.setProperty("--size", `${Math.random() < 0.12 ? 3 : (Math.random() < 0.35 ? 2 : 1)}px`);
  if (Math.random() < 0.16) star.classList.add("bright");
  star.style.animationDelay = `${Math.random()*4}s`;
  starfield.appendChild(star);
}

function spawnShootingStar(){
  const streak=document.createElement("i");
  streak.className="shooting-star";
  streak.style.left=`${15+Math.random()*85}%`;
  streak.style.top=`${Math.random()*65}%`;
  starfield.appendChild(streak);
  streak.addEventListener("animationend",()=>streak.remove());
}
setInterval(spawnShootingStar, 2200);

const photoPaths = Array.from({length:13},(_,i)=>{
  const path=`assets/photo-${i+1}.jpg`;
  return (window.GALAXY_ASSETS && window.GALAXY_ASSETS[path]) || path;
});
const photoGrid = $("#photoGrid");

// Keep the album gallery in the DOM, but let the 3D engine render the
// orbiting photo-stars. The old hidden CSS orbiters duplicated work every
// animation frame and caused needless layout/transform calculations.
photoPaths.forEach((src,index)=>{
  const galleryImage = document.createElement("img");
  galleryImage.src = src;
  galleryImage.alt = `Kỷ niệm ${index+1}`;
  galleryImage.loading = "lazy";
  galleryImage.decoding = "async";
  photoGrid.appendChild(galleryImage);
  galleryImage.addEventListener("click",()=>showPhoto(src,index+1));
});

// Gesture controls are handled once by the active Canvas/WebGL renderer.
// Avoid attaching a second pointer controller to the parent stage.
let suppressNextClick=false;

const intro=$("#introScreen");
const galaxy=$("#galaxyScreen");
const audio=$("#loveAudio");
const musicButton=$("#musicButton");
const album=$("#albumModal");
const help=$("#helpModal");
const viewer=$("#photoViewer");

async function startGalaxy(){
  intro.classList.add("leaving");
  galaxy.classList.add("visible");
  galaxy.setAttribute("aria-hidden","false");
  intro.setAttribute("aria-hidden","true");
  // Chạm để vào thiên hà là thao tác hợp lệ để bắt đầu phát nhạc.
  try{
    await audio.play();
    musicButton.classList.add("active");
    musicButton.setAttribute("aria-label","Tắt nhạc");
  }catch(err){
    // Một số trình duyệt vẫn có thể yêu cầu nhấn nút nhạc riêng.
    console.info("Nhấn nút nhạc để phát:",err);
  }
}
$("#enterGalaxy").addEventListener("click",startGalaxy);
$("#homeButton").addEventListener("click",(e)=>{
  e.preventDefault();
  galaxy.classList.remove("visible");
  intro.classList.remove("leaving");
  galaxy.setAttribute("aria-hidden","true");
  intro.setAttribute("aria-hidden","false");
});
$("#backIntro").addEventListener("click",()=>{
  galaxy.classList.remove("visible");
  intro.classList.remove("leaving");
  galaxy.setAttribute("aria-hidden","true");
  intro.setAttribute("aria-hidden","false");
});

// Trái tim hạt sáng: tạo hình từ hàng nghìn điểm, đập nhịp rồi bung thành bụi sao.
const heartReveal = $("#heartReveal");
const heartCanvas = $("#heartCanvas");
const heartCtx = heartCanvas.getContext("2d", { alpha: true });
let heartAnimationId = 0;
let heartParticles = [];
let heartStartedAt = 0;
let heartDpr = Math.min(window.devicePixelRatio || 1, 2);

function heartPoint(t) {
  return {
    x: 16 * Math.pow(Math.sin(t), 3),
    y: 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)
  };
}
function resizeHeartCanvas(){
  heartDpr = Math.min(window.devicePixelRatio || 1, 2);
  heartCanvas.width = Math.round(innerWidth * heartDpr);
  heartCanvas.height = Math.round(innerHeight * heartDpr);
  heartCanvas.style.width = `${innerWidth}px`;
  heartCanvas.style.height = `${innerHeight}px`;
  heartCtx.setTransform(heartDpr,0,0,heartDpr,0,0);
}
window.addEventListener("resize",resizeHeartCanvas);
resizeHeartCanvas();

function buildHeartParticles(){
  const count = Math.min(1900, Math.max(1000, Math.floor(innerWidth*innerHeight/520)));
  heartParticles = [];
  for(let i=0;i<count;i++){
    const t=Math.random()*Math.PI*2;
    const edge=heartPoint(t);
    // Phân bố thêm hạt phía trong để trái tim đặc, rõ nét khi nhìn trên điện thoại.
    const fill=Math.sqrt(Math.random())*(Math.random()<.28?1:.86);
    const jitter=(Math.random()-.5)*.22;
    const x=(edge.x+jitter)*fill;
    const y=(edge.y+jitter)*fill;
    heartParticles.push({
      x,y,
      size:.65+Math.random()*1.8,
      phase:Math.random()*Math.PI*2,
      twinkle:.5+Math.random()*1.2,
      color:["#fff8ff","#ffd1ed","#f58bcf","#c9a6ff","#8feaff"][Math.floor(Math.random()*5)],
      drift:(Math.random()-.5)*.22,
      scatterX:(Math.random()-.5)*2,
      scatterY:(Math.random()-.5)*2
    });
  }
}

function launchHeartGift(){
  if(heartAnimationId) cancelAnimationFrame(heartAnimationId);
  buildHeartParticles();
  heartReveal.classList.add("active");
  heartReveal.setAttribute("aria-hidden","false");
  heartStartedAt=performance.now();
  const maxSize=Math.min(innerWidth*.027, innerHeight*.034, 17);
  const scale=Math.min(innerWidth,innerHeight)*.0185;
  const duration=3900;

  function frame(now){
    const elapsed=now-heartStartedAt;
    const seconds=elapsed/1000;
    const pulse=1 + .055*Math.sin(seconds*5.2) + .018*Math.sin(seconds*10.4);
    const explodeStart=2850;
    const explode=Math.max(0,Math.min(1,(elapsed-explodeStart)/900));
    heartCtx.clearRect(0,0,innerWidth,innerHeight);

    // Quầng sáng mờ phía sau trái tim.
    const glow=heartCtx.createRadialGradient(innerWidth/2,innerHeight/2,4,innerWidth/2,innerHeight/2,Math.min(innerWidth,innerHeight)*.48);
    glow.addColorStop(0,`rgba(218,112,220,${.18*(1-explode)})`);
    glow.addColorStop(.45,`rgba(119,91,220,${.09*(1-explode)})`);
    glow.addColorStop(1,"rgba(0,0,0,0)");
    heartCtx.fillStyle=glow;
    heartCtx.fillRect(0,0,innerWidth,innerHeight);

    const cx=innerWidth/2;
    const cy=innerHeight*.48;
    heartParticles.forEach((p,i)=>{
      const twinkle=.62+.38*Math.sin(seconds*3.8+p.phase)*p.twinkle;
      const wave=Math.sin(seconds*2.6+p.phase)*.025;
      const targetX=p.x*scale*pulse;
      const targetY=-p.y*scale*pulse;
      const angle=p.phase+seconds*(.18+p.drift);
      const ex=Math.cos(angle)*scale*(.3+explode*5)*p.scatterX;
      const ey=Math.sin(angle)*scale*(.3+explode*5)*p.scatterY;
      const x=cx+targetX*(1-explode)+ex*explode;
      const y=cy+targetY*(1-explode)+ey*explode;
      const alpha=(1-explode*.92)*twinkle;
      const size=p.size*(1+wave)*(1+explode*.7);
      heartCtx.globalAlpha=alpha;
      heartCtx.fillStyle=p.color;
      heartCtx.shadowBlur=explode>0?8:12;
      heartCtx.shadowColor=p.color;
      heartCtx.beginPath();
      heartCtx.arc(x,y,size*(maxSize/13),0,Math.PI*2);
      heartCtx.fill();
    });
    heartCtx.globalAlpha=1;
    heartCtx.shadowBlur=0;

    if(elapsed<duration){
      heartAnimationId=requestAnimationFrame(frame);
    }else{
      heartReveal.classList.remove("active");
      heartReveal.setAttribute("aria-hidden","true");
      heartCtx.clearRect(0,0,innerWidth,innerHeight);
      heartAnimationId=0;
      $("#albumTitle").classList.remove("gift-title-in");
      void $("#albumTitle").offsetWidth;
      $("#albumTitle").classList.add("gift-title-in");
      openModal(album);
    }
  }
  heartAnimationId=requestAnimationFrame(frame);
}

$("#coreButton").addEventListener("click",()=>{
  if(!suppressNextClick) launchHeartGift();
});
$("#helpButton").addEventListener("click",()=>openModal(help));

musicButton.addEventListener("click",async()=>{
  try{
    if(audio.paused){
      await audio.play();
      musicButton.classList.add("active");
      musicButton.setAttribute("aria-label","Tắt nhạc");
    }else{
      audio.pause();
      musicButton.classList.remove("active");
      musicButton.setAttribute("aria-label","Bật nhạc");
    }
  }catch(err){
    alert("Không phát được nhạc. Hãy kiểm tra file assets/love-song.mp3.");
    console.error(err);
  }
});

function openModal(el){el.classList.add("open");el.setAttribute("aria-hidden","false")}
function closeModal(el){el.classList.remove("open");el.setAttribute("aria-hidden","true")}
document.querySelectorAll("[data-close]").forEach(btn=>{
  btn.addEventListener("click",()=>closeModal(document.getElementById(btn.dataset.close)));
});
function showPhoto(src,n){
  $("#viewerImage").src=src;
  $("#viewerText").textContent=`Một kỷ niệm nhỏ trong vũ trụ của chúng ta · ${n} ✨`;
  openModal(viewer);
}
document.querySelectorAll("[data-close-viewer]").forEach(btn=>btn.addEventListener("click",()=>closeModal(viewer)));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){[album,help,viewer].forEach(closeModal)}
});
