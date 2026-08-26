/**
 * Algorithm Master - Leaderboard Module
 * จัดการระบบบันทึกและแสดงผลคะแนนสูงสุดตามหมวดเวลา (60s, 90s, 120s) บน Local Storage (GMT+7)
 */

const LEADERBOARD_STORAGE_KEY = 'algorithm_master_leaderboard';

// ฟังก์ชันแปลงเวลาเป็นรูปแบบ GMT+7 (เวลาประเทศไทย)
function formatToGMT7(date = new Date()) {
  const gmt7Formatter = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return gmt7Formatter.format(date) + ' น.';
}

// ข้อมูลตั้งต้นเพื่อความสวยงามในกรณีที่ยังไม่มีข้อมูล
const DEFAULT_LEADERBOARD = {
  "60": [
    { name: "ขนมปังโหดมาก", score: 85, date: "26 ส.ค. 2569, 18:30:15 น.", timestamp: 1787743815000 },
  ],
  "90": [
    { name: "ขนมปังโหดอีกแล้ว", score: 140, date: "26 ส.ค. 2569, 18:30:15 น.", timestamp: 1787743815000 },
  ],
  "120": [
    { name: "ขนมปังโหดสุด 👑", score: 195, date: "26 ส.ค. 2569, 20:10:05 น.", timestamp: 1787749805000 },
  ]
};

// ดึงข้อมูล Leaderboard ทั้งหมดจาก LocalStorage
function getLeaderboardData() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
      return DEFAULT_LEADERBOARD;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading leaderboard from LocalStorage:", e);
    return DEFAULT_LEADERBOARD;
  }
}

// บันทึกคะแนนใหม่
function saveScoreToLeaderboard(playerName, score, timeLimitSec) {
  const cleanName = (playerName || "Anonymous Player").trim().substring(0, 20);
  const timeKey = String(timeLimitSec);
  const data = getLeaderboardData();

  if (!data[timeKey]) {
    data[timeKey] = [];
  }

  const newEntry = {
    name: cleanName,
    score: score,
    date: formatToGMT7(new Date()),
    timestamp: Date.now()
  };

  data[timeKey].push(newEntry);
  // เรียงลำดับจากคะแนนมากไปน้อย ถ้าเท่ากันดูเวลาล่าสุด
  data[timeKey].sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  // เก็บสูงสุด 10 อันดับแรก
  data[timeKey] = data[timeKey].slice(0, 10);

  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(data));
  return newEntry;
}

// ดึงคะแนนตามหมวดเวลา
function getLeaderboardByTime(timeLimitSec) {
  const data = getLeaderboardData();
  return data[String(timeLimitSec)] || [];
}

// เรนเดอร์ตาราง Leaderboard ลงใน DOM
function renderLeaderboardUI(activeTime = "60") {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const records = getLeaderboardByTime(activeTime);

  if (records.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-zinc-500 font-prompt">
        <p class="text-2xl mb-1">📝</p>
        <p>ยังไม่มีสถิติในหมวด ${activeTime} วินาที</p>
        <p class="text-xs text-pink-500 font-bold mt-1">มาเป็นคนแรกที่พิชิตอันดับ 1 กันเลย!</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="overflow-x-auto">
      <table class="w-full text-left font-prompt border-collapse text-sm md:text-base">
        <thead>
          <tr class="border-b-2 border-zinc-800 dark:border-zinc-700 bg-pink-100/60 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200">
            <th class="py-2.5 px-3 text-center w-16">อันดับ</th>
            <th class="py-2.5 px-3">ผู้เล่น</th>
            <th class="py-2.5 px-3 text-right">คะแนน</th>
            <th class="py-2.5 px-3 text-right hidden sm:table-cell">วันที่ & เวลา (GMT+7)</th>
          </tr>
        </thead>
        <tbody>
  `;

  records.forEach((item, index) => {
    let rankBadge = '';
    let rowHighlight = '';
    if (index === 0) {
      rankBadge = '<span class="text-xl">🥇</span>';
      rowHighlight = 'bg-yellow-50/70 dark:bg-yellow-950/20 font-bold';
    } else if (index === 1) {
      rankBadge = '<span class="text-xl">🥈</span>';
      rowHighlight = 'bg-zinc-100/60 dark:bg-zinc-800/40 font-semibold';
    } else if (index === 2) {
      rankBadge = '<span class="text-xl">🥉</span>';
      rowHighlight = 'bg-orange-50/50 dark:bg-orange-950/20 font-medium';
    } else {
      rankBadge = `<span class="inline-block w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs flex items-center justify-center mx-auto">${index + 1}</span>`;
    }

    html += `
      <tr class="border-b border-zinc-200 dark:border-zinc-800 hover:bg-pink-50/40 dark:hover:bg-zinc-800/60 transition-colors ${rowHighlight}">
        <td class="py-2.5 px-3 text-center">${rankBadge}</td>
        <td class="py-2.5 px-3 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <span class="truncate max-w-[130px] sm:max-w-none">${escapeHTML(item.name)}</span>
        </td>
        <td class="py-2.5 px-3 text-right text-pink-600 dark:text-pink-400 font-extrabold text-base md:text-lg">
          ${item.score} <span class="text-xs font-normal text-zinc-500">แต้ม</span>
        </td>
        <td class="py-2.5 px-3 text-right text-xs text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
          ${item.date}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
