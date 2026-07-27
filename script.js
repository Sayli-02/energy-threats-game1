// Audio Engine using Web Audio API (No external files needed)
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playLaser() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playPowerUp() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playGameOver() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

const soundEngine = new SoundEngine();

// Keyboard Debug Controls (Press 1-5 to simulate gestures if camera is off)
window.addEventListener('keydown', (e) => {
  if (['1','2','3','4','5'].includes(e.key)) {
    let label = '🖐 Open Hand';
    if (e.key === '1') label = '☝ Point';
    if (e.key === '2') label = '🖐 Open Hand';
    if (e.key === '3') label = '✊ Fist';
    if (e.key === '4') label = '✌ Peace';
    if (e.key === '5') {
      drawSupernova(canvas.width / 2, canvas.height / 2);
      soundEngine.playExplosion();
      return;
    }
    
    // Simulate active hand landmark at screen center
    const simLandmarks = Array.from({length: 21}, (_, idx) => {
      if (idx === 8) return { x: 0.5, y: 0.3, z: 0 }; // index tip
      if (idx === 6) return { x: 0.5, y: 0.4, z: 0 };
      return { x: 0.5, y: 0.5, z: 0 };
    });

    handsData = [{
      landmarks: simLandmarks,
      gesture: { label, confidence: 0.95 }
    }];
  }
});

/* ============================================================
   GAME STATE & PHASE 2 ENHANCEMENTS
   ============================================================ */
let score = 0;
let health = 100;
let gameState = 'PLAYING'; // 'PLAYING' or 'GAMEOVER'
let threats = [];
let lastSpawnTime = 0;
let spawnRate = 1200;
let highScore = localStorage.getItem('energyThreatsHighScore') || 0;

// Phase 2 Additions
let currentWave = 1;
let threatsSpawnedInWave = 0;
let threatsPerWave = 10;
let waveState = 'WAVE_ACTIVE'; // 'WAVE_ACTIVE', 'WAVE_CLEAR', 'BOSS_WAVE'
let waveClearTimer = 0;

let comboCount = 0;
let lastKillTime = 0;
let scoreMultiplier = 1;

let powerUps = [];

// Spell Cooldowns (in seconds)
const spellCooldowns = {
  laser: 0,
  shield: 0,
  gravity: 0,
  sigil: 0,
  supernova: 0
};

const SPELL_COOLDOWN_MAX = {
  laser: 0,
  shield: 4.0,
  gravity: 8.0,
  sigil: 6.0,
  supernova: 20.0
};

function updateUI() {
  document.getElementById('score-val').innerText = score;
  document.getElementById('high-score-val').innerText = highScore;
  const hb = document.getElementById('health-bar-fill');
  hb.style.width = health + '%';
  if (health > 60) hb.style.background = '#39ff6a';
  else if (health > 30) hb.style.background = '#ff8c00';
  else hb.style.background = '#ff3cac';
  hb.style.boxShadow = `0 0 10px ${hb.style.background}`;

  // Wave UI element update
  let waveEl = document.getElementById('wave-board');
  if (!waveEl) {
    const gameUi = document.getElementById('game-ui');
    waveEl = document.createElement('div');
    waveEl.id = 'wave-board';
    waveEl.style.cssText = 'font-size: 14px; color: #00eaff; margin-bottom: 8px; letter-spacing: 0.15em;';
    gameUi.insertBefore(waveEl, document.getElementById('health-board'));
  }
  waveEl.innerText = `WAVE ${currentWave} | COMBO ×${scoreMultiplier}`;
}

function takeDamage(amt) {
  if (gameState !== 'PLAYING') return;
  health -= amt;
  comboCount = 0;
  scoreMultiplier = 1;
  if (health <= 0) {
    health = 0;
    gameOver();
  }
  updateUI();
}

function addScore(amt) {
  if (gameState !== 'PLAYING') return;
  score += amt * scoreMultiplier;
  updateUI();
}

function registerKill() {
  const now = time;
  if (now - lastKillTime < 1.5) {
    comboCount++;
    scoreMultiplier = Math.min(10, 1 + Math.floor(comboCount / 2));
  } else {
    comboCount = 1;
    scoreMultiplier = 1;
  }
  lastKillTime = now;
}

async function gameOver() {
  gameState = 'GAMEOVER';
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('energyThreatsHighScore', highScore);
  }
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('final-score').innerText = score;
  updateUI();

  // Cloud Save to Supabase
  if (window.getCurrentUser && window.gameSupabase) {
    try {
      const user = await window.getCurrentUser();
      if (user) {
        const supabase = window.gameSupabase;

        // 1. Insert Game Session
        await supabase.from('game_sessions').insert({
          user_id: user.id,
          score: score,
          waves_survived: 1, // Will scale in Phase 2
          kills: Math.floor(score / 10),
          duration_sec: Math.floor(time)
        });

        // 2. Fetch current stats
        const { data: stats } = await supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const currentHighScore = stats ? Math.max(stats.high_score || 0, score) : score;
        const totalGames = (stats?.total_games || 0) + 1;
        const totalKills = (stats?.total_kills || 0) + Math.floor(score / 10);
        const totalTime = (stats?.total_playtime_sec || 0) + Math.floor(time);

        // 3. Update Player Stats
        await supabase.from('player_stats').upsert({
          user_id: user.id,
          high_score: currentHighScore,
          total_games: totalGames,
          total_kills: totalKills,
          total_playtime_sec: totalTime,
          last_played_at: new Date()
        });

        // 4. Calculate Level & XP
        const addedXP = score;
        const { data: profile } = await supabase.from('profiles').select('xp, level').eq('id', user.id).single();
        const currentXP = (profile?.xp || 0) + addedXP;
        const newLevel = Math.floor(currentXP / 100) + 1;

        let title = 'Energy Initiate';
        if (newLevel >= 15) title = 'Thread God';
        else if (newLevel >= 10) title = 'Energy Lord';
        else if (newLevel >= 7) title = 'Archmage';
        else if (newLevel >= 4) title = 'Energy Mage';
        else if (newLevel >= 2) title = 'Apprentice';

        await supabase.from('profiles').update({
          xp: currentXP,
          level: newLevel,
          title: title
        }).eq('id', user.id);

        const statusEl = document.getElementById('cloud-save-status');
        if (statusEl) statusEl.style.display = 'block';
      }
    } catch (err) {
      console.error('Failed to sync score to cloud:', err);
    }
  }
}

function restartGame() {
  gameState = 'PLAYING';
  score = 0;
  health = 100;
  threats = [];
  powerUps = [];
  currentWave = 1;
  threatsSpawnedInWave = 0;
  threatsPerWave = 10;
  waveState = 'WAVE_ACTIVE';
  comboCount = 0;
  scoreMultiplier = 1;
  lastSpawnTime = time;
  document.getElementById('game-over').style.display = 'none';
  updateUI();
}

function spawnThreat() {
  if (threatsSpawnedInWave >= threatsPerWave) return;

  const x = Math.random() * (canvas.width - 100) + 50;
  const y = -50;
  
  // Enemy Types: Standard (60%), Speeder (20%), Tank (10%), Splitter (10%)
  const typeRand = Math.random();
  let type = 'STANDARD';
  let radius = 20;
  let hp = 1;
  let speed = 3.0 + (currentWave * 0.4);
  let color = '#ff0055';

  if (typeRand > 0.9) {
    type = 'SPLITTER';
    color = '#00eaff';
    radius = 22;
  } else if (typeRand > 0.8) {
    type = 'TANK';
    color = '#bf00ff';
    radius = 32;
    hp = 3;
    speed *= 0.6;
  } else if (typeRand > 0.6) {
    type = 'SPEEDER';
    color = '#ff8c00';
    radius = 14;
    speed *= 1.6;
  }

  threats.push({ x, y, radius, speed, hp, maxHp: hp, type, color, active: true, vx: type === 'SPEEDER' ? 2 : 0 });
  threatsSpawnedInWave++;
}

function spawnPowerUp(x, y) {
  if (Math.random() > 0.2) return; // 20% chance to drop
  const types = ['HEALTH', 'SCORE', 'SHIELD'];
  const pType = types[Math.floor(Math.random() * types.length)];
  let color = '#39ff6a';
  if (pType === 'SCORE') color = '#ff8c00';
  if (pType === 'SHIELD') color = '#00eaff';

  powerUps.push({ x, y, radius: 15, type: pType, color, vy: 1.5, active: true });
}

function updateThreats() {
  if (gameState !== 'PLAYING') return;

  // Wave Manager
  if (waveState === 'WAVE_ACTIVE') {
    if (time - lastSpawnTime > Math.max(0.4, 1.2 - currentWave * 0.08)) {
      spawnThreat();
      lastSpawnTime = time;
    }

    if (threatsSpawnedInWave >= threatsPerWave && threats.length === 0) {
      waveState = 'WAVE_CLEAR';
      waveClearTimer = time;
    }
  } else if (waveState === 'WAVE_CLEAR') {
    // 3 second wave transition
    ctx.save();
    ctx.font = '900 36px Orbitron, sans-serif';
    ctx.fillStyle = '#00eaff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00eaff';
    ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${currentWave} CLEARED!`, canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('PREPARE FOR NEXT WAVE...', canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();

    if (time - waveClearTimer > 3.0) {
      currentWave++;
      threatsSpawnedInWave = 0;
      threatsPerWave = 10 + currentWave * 5;
      waveState = 'WAVE_ACTIVE';
      health = Math.min(100, health + 15); // Wave heal bonus
      updateUI();
    }
    return;
  }

  // Update and render Threats
  for (let i = threats.length - 1; i >= 0; i--) {
    const t = threats[i];
    if (!t.active) {
      threats.splice(i, 1);
      continue;
    }
    
    t.y += t.speed;
    if (t.type === 'SPEEDER') {
      t.x += Math.sin(time * 8) * 3;
    }
    
    // Render threat
    ctx.save();
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 20 + Math.sin(time * 10) * 10;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // HP Ring for Tanks
    if (t.hp > 1) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius + 6, 0, (Math.PI * 2) * (t.hp / t.maxHp));
      ctx.stroke();
    }

    ctx.restore();
    
    // Bottom breach check
    if (t.y > canvas.height + t.radius) {
      t.active = false;
      takeDamage(15);
    }
  }

  // Update and render PowerUps
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    if (!p.active) {
      powerUps.splice(i, 1);
      continue;
    }

    p.y += p.vy;

    ctx.save();
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type.charAt(0), p.x, p.y);
    ctx.restore();

    // Collection check via hand position
    for (let hd of handsData) {
      const palm = toC(hd.landmarks[9]);
      if (Math.hypot(palm.x - p.x, palm.y - p.y) < p.radius + 40) {
        p.active = false;
        if (p.type === 'HEALTH') health = Math.min(100, health + 25);
        if (p.type === 'SCORE') addScore(100);
        if (p.type === 'SHIELD') health = Math.min(100, health + 10);
        updateUI();
        for (let k = 0; k < 10; k++) spawnParticle(p.x, p.y, p.color);
      }
    }

    if (p.y > canvas.height + 20) p.active = false;
  }
}

function destroyThreat(t) {
  t.hp--;
  if (t.hp <= 0) {
    t.active = false;
    registerKill();
    addScore(10);
    soundEngine.playExplosion();
    spawnPowerUp(t.x, t.y);

    if (t.type === 'SPLITTER') {
      threats.push({ x: t.x - 15, y: t.y, radius: 12, speed: t.speed * 1.2, hp: 1, maxHp: 1, type: 'STANDARD', color: '#00eaff', active: true });
      threats.push({ x: t.x + 15, y: t.y, radius: 12, speed: t.speed * 1.2, hp: 1, maxHp: 1, type: 'STANDARD', color: '#00eaff', active: true });
    }

    for (let i = 0; i < 15; i++) {
      spawnParticle(t.x, t.y, t.color);
      spawnParticle(t.x, t.y, '#ffffff');
    }
  } else {
    soundEngine.playLaser();
    for (let i = 0; i < 5; i++) spawnParticle(t.x, t.y, t.color);
  }
}

// Helper for Line-Circle collision
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2);
  if (l2 === 0) return Math.hypot(px-x1, py-y1);
  let t = ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*(x2-x1)), py - (y1 + t*(y2-y1)));
}

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

function toC(lm){
  return {
    x:(1-lm.x)*canvas.width,
    y:lm.y*canvas.height
  };
}

function convexHull(pts){
  if(pts.length<3) return pts;
  let s = pts.reduce((a,b)=>a.x<b.x?a:b);
  let hull=[],cur=s;
  do{
    hull.push(cur);
    let nxt=pts[0];
    for(let p of pts){
      let cr=(nxt.x-cur.x)*(p.y-cur.y)-(nxt.y-cur.y)*(p.x-cur.x);
      if(nxt===cur||cr<0) nxt=p;
    }
    cur=nxt;
  } while(cur!==s && hull.length<=pts.length+2);
  return hull;
}

function drawCrystal(lms, alpha){
  const pts = lms.map(lm=>toC(lm));
  const hull = convexHull(pts);
  if(hull.length<3) return;

  const cx=hull.reduce((s,p)=>s+p.x,0)/hull.length;
  const cy=hull.reduce((s,p)=>s+p.y,0)/hull.length;

  ctx.save();
  ctx.globalAlpha=alpha*0.07;
  ctx.beginPath();
  ctx.moveTo(hull[0].x,hull[0].y);
  hull.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle='#ffffff';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha=alpha*0.75;

  for(let i=0;i<hull.length;i++){
    const a=hull[i], b=hull[(i+1)%hull.length];
    const c=COLORS[i%COLORS.length];
    ctx.shadowColor=c;
    ctx.shadowBlur=10;
    ctx.strokeStyle=c;
    ctx.lineWidth=1.3;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

  ctx.globalAlpha=alpha*0.18;
  hull.forEach((p,i)=>{
    ctx.strokeStyle=COLORS[i%COLORS.length];
    ctx.shadowColor=COLORS[i%COLORS.length];
    ctx.shadowBlur=8;
    ctx.lineWidth=0.6;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  });

  ctx.restore();
}

function drawDot(x,y,color,r,a){
  ctx.save();
  ctx.globalAlpha=a;
  ctx.shadowColor=color;
  ctx.shadowBlur=22;

  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=color;
  ctx.fill();

  ctx.shadowBlur=5;
  ctx.beginPath();
  ctx.arc(x,y,r*0.38,0,Math.PI*2);
  ctx.fillStyle='#fff';
  ctx.fill();

  ctx.restore();
}

function drawThread(x1,y1,x2,y2,color,bright,lw,a){
  const dist=Math.hypot(x2-x1,y2-y1);
  const maxD=Math.hypot(canvas.width,canvas.height)*0.7;
  const stretch=Math.min(dist/maxD,1);

  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.sqrt(dx*dx+dy*dy)||1;

  const nx=-dy/len, ny=dx/len;
  const wave=Math.sin(time*2.5+stretch*8)*stretch*9;

  const qx=mx+nx*wave, qy=my+ny*wave;

  const glow=bright?(0.45+stretch*0.55):0.28;
  const blur=bright?(12+stretch*26):5;

  ctx.save();
  ctx.globalAlpha=a*glow;
  ctx.shadowColor=color;
  ctx.shadowBlur=blur;
  ctx.strokeStyle=color;
  ctx.lineWidth=lw;
  ctx.lineCap='round';

  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo(qx,qy,x2,y2);
  ctx.stroke();

  if(bright){
    ctx.globalAlpha=a*glow*0.45;
    ctx.shadowBlur=blur*0.3;
    ctx.lineWidth=lw*0.3;
    ctx.strokeStyle='#fff';

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.quadraticCurveTo(qx,qy,x2,y2);
    ctx.stroke();
  }

  ctx.restore();
}

function blend(i,j){
  const a=COLORS_RGB[i], b=COLORS_RGB[j];
  return `rgb(${Math.round((a[0]+b[0])/2)},${Math.round((a[1]+b[1])/2)},${Math.round((a[2]+b[2])/2)})`;
}

/* ============================================================
   MAGIC SPELLS RENDERERS (With Collision)
   ============================================================ */
function drawLaser(x1, y1, angle, color) {
  const length = Math.hypot(canvas.width, canvas.height);
  const x2 = x1 + Math.cos(angle) * length;
  const y2 = y1 + Math.sin(angle) * length;

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#fff';
  ctx.shadowBlur = 5;
  ctx.stroke();
  ctx.restore();

  for(let i=0; i<3; i++) {
    const t = Math.random();
    spawnParticle(x1 + (x2-x1)*t, y1 + (y2-y1)*t, color);
  }

  // Combat Collision
  if (gameState === 'PLAYING') {
    for (let t of threats) {
      if (t.active && distToSegment(t.x, t.y, x1, y1, x2, y2) < t.radius + 10) {
        destroyThreat(t);
      }
    }
  }
}

function drawShield(x, y, color) {
  const radius = 60 + Math.sin(time * 5) * 5;
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.stroke();

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  
  activeForces.push({ type: 'repel', x, y, strength: 3.5, radius: 250 });

  // Combat Collision
  if (gameState === 'PLAYING') {
    for (let t of threats) {
      if (t.active) {
        const dist = Math.hypot(t.x - x, t.y - y);
        if (dist < radius + t.radius) destroyThreat(t);
      }
    }
  }
}

function drawGravityWell(x, y) {
  const radius = 25 + Math.sin(time * 8) * 3;
  ctx.save();
  ctx.shadowColor = '#bf00ff';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = '#bf00ff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.2, time*2, time*2 + Math.PI);
  ctx.stroke();
  ctx.restore();

  activeForces.push({ type: 'attract', x, y, strength: 2.5, radius: 600 });

  // Combat Collision (Suck in threats and destroy)
  if (gameState === 'PLAYING') {
    for (let t of threats) {
      if (t.active) {
        const dist = Math.hypot(t.x - x, t.y - y);
        if (dist < radius) {
          destroyThreat(t);
        } else if (dist < 400) {
          t.x += (x - t.x) * 0.05;
          t.y += (y - t.y) * 0.05;
        }
      }
    }
  }
}

function drawSigil(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 1.5);
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  
  const r1 = 30, r2 = 45;
  ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI*2); ctx.stroke();
  
  for(let i=0; i<3; i++) {
    ctx.rotate(Math.PI*2 / 3);
    ctx.beginPath();
    ctx.moveTo(0, -r2);
    ctx.lineTo(r2*0.866, r2*0.5);
    ctx.lineTo(-r2*0.866, r2*0.5);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSupernova(x, y) {
  const pulse = Math.sin(time * 15) * 10;
  const radius = 50 + pulse;
  ctx.save();
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 50 + pulse * 2;
  ctx.fillStyle = '#00eaff';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  activeForces.push({ type: 'repel', x, y, strength: 8, radius: 800 });
  
  for(let i=0; i<10; i++) {
    spawnParticle(x, y, '#00eaff');
  }

  // Combat Collision: Clear screen
  if (gameState === 'PLAYING') {
    for (let t of threats) {
      if (t.active) destroyThreat(t);
    }
  }
}

function render(){
  time+=0.016;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const pulse=Math.sin(time*2)*0.5+0.5;
  
  activeForces = [];

  if(handsData.length===2){
    statusEl.style.display='none';

    const lms0=handsData[0].landmarks;
    const lms1=handsData[1].landmarks;

    drawCrystal(lms0,0.82+pulse*0.18);
    drawCrystal(lms1,0.82+pulse*0.18);

    const t0=FINGERTIPS.map(i=>toC(lms0[i]));
    const t1=FINGERTIPS.map(i=>toC(lms1[i]));

    for(let i=0;i<5;i++) for(let j=0;j<5;j++){
      if(i===j) continue;
      drawThread(t0[i].x,t0[i].y,t1[j].x,t1[j].y,blend(i,j),false,0.75,0.22);
    }

    for(let h=0;h<2;h++){
      const t=h===0?t0:t1;
      for(let i=0;i<5;i++) for(let j=i+1;j<5;j++){
        drawThread(t[i].x,t[i].y,t[j].x,t[j].y,blend(i,j),false,0.55,0.14);
      }
    }

    for(let i=0;i<5;i++){
      drawThread(t0[i].x,t0[i].y,t1[i].x,t1[i].y,COLORS[i],true,2.4,1.0);
      // FEATURE 2 — spawn particles along each primary thread
      for(let s=0;s<2;s++){
        const tp=Math.random();
        spawnParticle(
          t0[i].x + (t1[i].x-t0[i].x)*tp,
          t0[i].y + (t1[i].y-t0[i].y)*tp,
          COLORS[i]
        );
      }
    }

    for(let i=0;i<5;i++){
      drawDot(t0[i].x,t0[i].y,COLORS[i],7,0.95);
      drawDot(t1[i].x,t1[i].y,COLORS[i],7,0.95);
    }

  } else {
    statusEl.style.display='block';

    if(handsData.length===1){
      statusEl.innerHTML='One hand detected<div class="sub">show your other hand to activate</div>';
      const lms=handsData[0].landmarks;

      drawCrystal(lms,0.5);

      FINGERTIPS.forEach((fi,i)=>{
        const p=toC(lms[fi]);
        drawDot(p.x,p.y,COLORS[i],5,0.5);
      });

    } else {
      statusEl.innerHTML='Show both hands<div class="sub">bring close · pull apart · feel the energy</div>';
    }
  }

  // Evaluate Spells for each hand
  for (let h = 0; h < handsData.length; h++) {
    const hd = handsData[h];
    if (hd.gesture && hd.gesture.confidence > 0.8) {
      const lms = hd.landmarks;
      const cx = toC(lms[9]).x;
      const cy = toC(lms[9]).y;
      
      switch (hd.gesture.label) {
        case '☝ Point':
          const tip = toC(lms[8]);
          const pip = toC(lms[6]);
          const angle = Math.atan2(tip.y - pip.y, tip.x - pip.x);
          drawLaser(tip.x, tip.y, angle, COLORS[1]); // Cyan
          break;
        case '🖐 Open Hand':
          drawShield(cx, cy, COLORS[2]); // Green
          break;
        case '✊ Fist':
          drawGravityWell(cx, cy); // Purple
          break;
        case '✌ Peace':
          const tipIdx = toC(lms[8]);
          const tipMid = toC(lms[12]);
          const midX = (tipIdx.x + tipMid.x) / 2;
          const midY = (tipIdx.y + tipMid.y) / 2 - 50;
          drawSigil(midX, midY, COLORS[3]); // Orange
          // Game Over Restart mechanic
          if (gameState === 'GAMEOVER') restartGame();
          break;
      }
    }
  }

  // Evaluate Supernova (two hands close together)
  if (handsData.length === 2) {
    const c1 = toC(handsData[0].landmarks[9]);
    const c2 = toC(handsData[1].landmarks[9]);
    const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
    if (dist < 120) {
      drawSupernova((c1.x + c2.x) / 2, (c1.y + c2.y) / 2);
    }
  }

  // FEATURE 2 — draw particles
  updateParticles();
  
  // FEATURE 4 — GAME LOOP
  updateThreats();

  // FEATURE 3 — update classifier panel
  updateClassifierUI();

  requestAnimationFrame(render);
}

// MediaPipe setup
const handsMP = new Hands({
  locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

handsMP.setOptions({
  maxNumHands:2,
  modelComplexity:1,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.6
});

handsMP.onResults(results=>{
  handsData=[];
  if(results.multiHandLandmarks){
    results.multiHandLandmarks.forEach((lm,i)=>{
      handsData.push({
        landmarks:lm,
        handedness:results.multiHandedness[i],
        gesture: classifyGesture(lm)   // FEATURE 1 — gesture tag
      });
    });
  }
});

async function startCamera(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{
        width:{ideal:1280},
        height:{ideal:720},
        facingMode:'user'
      }
    });

    video.srcObject=stream;

    video.onloadedmetadata=()=>{
      video.play();
      loadingEl.style.display='none';
      statusEl.style.display='block';

      render();

      const cam=new Camera(video,{
        onFrame:async()=>{ await handsMP.send({image:video}); },
        width:1280,
        height:720
      });

      cam.start();
    };

  } catch(e){
    loadingEl.innerHTML='<span style="color:#ff5555">Camera access denied</span><br><span style="font-size:10px;color:rgba(255,255,255,0.3)">Allow camera permission and reload</span>';
  }
}

startCamera();

/* ============================================================
   FEATURE 1 — Gesture Recognition
   ============================================================ */
/**
 * Pure function: classifies a 21-landmark MediaPipe hand into a gesture.
 * Uses tip-vs-PIP Y comparison for index→pinky, and tip-vs-MCP X for thumb.
 * @param {Array} landmarks  Array of 21 {x,y,z} normalised landmarks
 * @returns {{ label: string, confidence: number }}
 */
function classifyGesture(landmarks) {
  // Landmark indices for each finger
  // [tip, pip, mcp]
  const FINGERS = [
    [8,  6,  5],   // index
    [12, 10, 9],   // middle
    [16, 14, 13],  // ring
    [20, 18, 17]   // pinky
  ];
  const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2, WRIST = 0;

  // A finger is "extended" when tip Y is clearly above PIP Y (smaller y = higher on screen)
  const extended = FINGERS.map(([tip, pip]) => landmarks[tip].y < landmarks[pip].y - 0.03);
  // Thumb: extended when tip X is further from palm centre than IP joint
  // We use the wrist→thumb_mcp direction as reference; simpler: compare x distance
  const thumbExt = Math.abs(landmarks[THUMB_TIP].x - landmarks[WRIST].x) >
                   Math.abs(landmarks[THUMB_MCP].x - landmarks[WRIST].x) + 0.04;

  const [idxExt, midExt, ringExt, pinkyExt] = extended;
  const anyFolded = !idxExt || !midExt || !ringExt || !pinkyExt;

  // ---- Decision tree ----

  // FIST — all four fingers folded, thumb may be anything
  if (!idxExt && !midExt && !ringExt && !pinkyExt) {
    const conf = 0.70 + (!thumbExt ? 0.20 : 0.10);
    return { label: '✊ Fist', confidence: Math.min(conf, 0.95) };
  }

  // THUMBS UP — only thumb extended, all fingers folded
  if (thumbExt && !idxExt && !midExt && !ringExt && !pinkyExt) {
    return { label: '👍 Thumbs Up', confidence: 0.90 };
  }

  // POINT — only index extended
  if (idxExt && !midExt && !ringExt && !pinkyExt) {
    const conf = thumbExt ? 0.78 : 0.88;
    return { label: '☝ Point', confidence: conf };
  }

  // PEACE — index + middle extended, ring + pinky folded
  if (idxExt && midExt && !ringExt && !pinkyExt) {
    return { label: '✌ Peace', confidence: 0.88 };
  }

  // OPEN HAND — all four fingers extended
  if (idxExt && midExt && ringExt && pinkyExt) {
    const conf = thumbExt ? 0.95 : 0.82;
    return { label: '🖐 Open Hand', confidence: conf };
  }

  // Fallback — partial gesture
  return { label: '··· Unknown', confidence: 0.40 };
}


/* ============================================================
   FEATURE 2 — Particle System
   ============================================================ */
const particles = [];
const MAX_PARTICLES = 400;

/**
 * Spawns one glowing particle at (x, y) with a given color.
 */
function spawnParticle(x, y, color) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 1.4,
    vy: (Math.random() - 0.5) * 1.4 - 0.5,  // slight upward drift
    life: 1.0,          // 1 = fresh, 0 = dead
    decay: 0.025 + Math.random() * 0.03,
    r: 1.5 + Math.random() * 2,
    color
  });
}

/**
 * Updates and draws all active particles.
 * Must be called once per render frame.
 */
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Apply active forces (spells)
    for (let f of activeForces) {
      const dx = p.x - f.x;
      const dy = p.y - f.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < f.radius) {
        // Linear falloff
        const force = (1 - dist / f.radius) * f.strength;
        const nx = dx / dist;
        const ny = dy / dist;
        if (f.type === 'repel') {
          p.vx += nx * force;
          p.vy += ny * force;
        } else if (f.type === 'attract') {
          p.vx -= nx * force;
          p.vy -= ny * force;
        }
      }
    }

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96; // slightly stronger friction for better force control
    p.vy *= 0.96;

    const a = p.life * p.life;   // quadratic fade for a sharper trail

    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 10 * p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    // Bright white core
    ctx.globalAlpha = a * 0.5;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}


/* ============================================================
   FEATURE 3 — Gesture Classifier UI
   ============================================================ */
const clfName  = [document.getElementById('clf-name0'),  document.getElementById('clf-name1')];
const clfBar   = [document.getElementById('clf-bar0'),   document.getElementById('clf-bar1')];
const clfConf  = [document.getElementById('clf-conf0'),  document.getElementById('clf-conf1')];

/**
 * Refreshes the classifier panel with current gesture data.
 * Called every render frame.
 */
function updateClassifierUI() {
  for (let i = 0; i < 2; i++) {
    if (handsData[i] && handsData[i].gesture) {
      const { label, confidence } = handsData[i].gesture;
      const pct = Math.round(confidence * 100);
      clfName[i].textContent = label;
      clfName[i].classList.remove('inactive');
      clfBar[i].style.width  = pct + '%';
      clfConf[i].textContent = pct + '% confidence';
    } else {
      clfName[i].textContent = '\u2013\u2013 no hand \u2013\u2013';
      clfName[i].classList.add('inactive');
      clfBar[i].style.width  = '0%';
      clfConf[i].textContent = '';
    }
  }
}
