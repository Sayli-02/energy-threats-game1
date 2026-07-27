import { supabase } from './supabase.js';
import { getCurrentUser, logOut } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // Bind Buttons
  document.getElementById('btn-logout').addEventListener('click', logOut);
  document.getElementById('btn-play-game').addEventListener('click', () => {
    window.location.href = 'game.html';
  });

  await loadUserProfile(user);
  await loadStats(user);
  await loadLeaderboard();
  await loadGameHistory(user);
});

async function loadUserProfile(user) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Profile fetch error:', error);
    return;
  }

  const username = profile.username || user.email.split('@')[0];
  document.getElementById('user-name').textContent = username;
  document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
  document.getElementById('user-title').textContent = profile.title || 'Energy Initiate';
  document.getElementById('user-level').textContent = profile.level || 1;

  // XP calculation
  const currentXP = profile.xp || 0;
  const nextLevelXP = (profile.level || 1) * 100;
  const pct = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));

  document.getElementById('user-xp').textContent = `${currentXP} / ${nextLevelXP} XP`;
  document.getElementById('xp-bar-fill').style.width = `${pct}%`;
}

async function loadStats(user) {
  const { data: stats, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Stats fetch error:', error);
    return;
  }

  document.getElementById('stat-highscore').textContent = stats.high_score || 0;
  document.getElementById('stat-kills').textContent = stats.total_kills || 0;
  document.getElementById('stat-games').textContent = stats.total_games || 0;
  document.getElementById('stat-wave').textContent = stats.best_wave || 0;
}

async function loadLeaderboard() {
  const { data: leaderboard, error } = await supabase
    .from('global_leaderboard')
    .select('*')
    .limit(10);

  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';

  if (error || !leaderboard || leaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-td">No leaderboard entries yet. Be the first!</td></tr>';
    return;
  }

  leaderboard.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:bold; color:${idx === 0 ? '#ff8c00' : idx === 1 ? '#00eaff' : idx === 2 ? '#39ff6a' : '#fff'}">#${idx + 1}</td>
      <td><strong>${entry.username || 'Commander'}</strong></td>
      <td>Lvl ${entry.level || 1}</td>
      <td style="color:#ff8c00; font-weight:bold;">${entry.high_score}</td>
      <td>${entry.total_kills}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadGameHistory(user) {
  const { data: history, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })
    .limit(10);

  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '';

  if (error || !history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-td">No games logged yet. Launch game to set your first score!</td></tr>';
    renderCharts([], []);
    renderAchievements({});
    return;
  }

  history.forEach(item => {
    const tr = document.createElement('tr');
    const dateStr = new Date(item.played_at).toLocaleDateString();
    tr.innerHTML = `
      <td style="color:#00eaff; font-weight:bold;">${item.score}</td>
      <td>Wave ${item.waves_survived}</td>
      <td>${item.kills}</td>
      <td>${item.duration_sec}s</td>
      <td style="color:rgba(255,255,255,0.4);">${dateStr}</td>
    `;
    tbody.appendChild(tr);
  });

  renderCharts(history);
  renderAchievements({ games: history.length, maxScore: Math.max(...history.map(h => h.score)) });
}

function renderCharts(history) {
  const ctxScore = document.getElementById('scoreChart').getContext('2d');
  const reversedHistory = [...history].reverse();

  new Chart(ctxScore, {
    type: 'line',
    data: {
      labels: reversedHistory.map((_, i) => `Game ${i + 1}`),
      datasets: [{
        label: 'Score',
        data: reversedHistory.map(h => h.score),
        borderColor: '#00eaff',
        backgroundColor: 'rgba(0, 234, 255, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  const ctxSpell = document.getElementById('spellChart').getContext('2d');
  new Chart(ctxSpell, {
    type: 'radar',
    data: {
      labels: ['Laser', 'Shield', 'Gravity', 'Sigil', 'Supernova'],
      datasets: [{
        label: 'Spells Cast',
        data: [45, 25, 15, 10, 5],
        borderColor: '#bf00ff',
        backgroundColor: 'rgba(191, 0, 255, 0.2)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderAchievements(stats) {
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '';

  const list = [
    { name: 'First Spark', desc: 'Play your first game', icon: '⚡', unlocked: stats.games >= 1 },
    { name: 'Centurion', desc: 'Reach 100+ score', icon: '🎯', unlocked: stats.maxScore >= 100 },
    { name: 'Sharpshooter', desc: 'Reach 500+ score', icon: '🏹', unlocked: stats.maxScore >= 500 },
    { name: 'Thread Master', desc: 'Reach 1,000+ score', icon: '🌌', unlocked: stats.maxScore >= 1000 },
    { name: 'Veteran Commander', desc: 'Play 10+ games', icon: '🎖️', unlocked: stats.games >= 10 },
    { name: 'Thread God', desc: 'Reach Level 15', icon: '👑', unlocked: stats.maxScore >= 2000 }
  ];

  list.forEach(ach => {
    const card = document.createElement('div');
    card.className = `achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <span class="ach-icon">${ach.icon}</span>
      <div class="ach-info">
        <h4>${ach.name}</h4>
        <p>${ach.desc}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}
