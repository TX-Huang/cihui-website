// 魚怎麼決定往哪游（純計算、不碰畫面，方便測試）。
// f：一隻魚 { x, y, angle, speed, cruise, phase, wander, fear, len }
// env：{ mouse: { x, y, speed, still }, w, h, random }
//
// 為什麼不會原地轉圈：
// 1) 平常不是「隨機一直轉」，而是挑池子裡遠一點的一個點游過去，到了再挑下一個。
// 2) 游到滑鼠旁邊聞一聞就會「膩了」，一陣子不理滑鼠，游去別處。
// 3) 游得慢時轉得也慢（真的魚停下來也沒辦法原地打轉）。

// 聞過滑鼠之後就膩了：滑鼠沒換地方就不再理它（最多膩這麼久，格；60 格 ≈ 1 秒）
const BORED_MIN = 1200;
const BORED_MAX = 1800;
const NEW_SPOT = 80; // 滑鼠移動超過這麼多像素，算「換地方了」，又會好奇

export function steer(f, env) {
  const { mouse: m, w, h } = env;
  const random = env.random ?? Math.random;
  const mdx = m.x - f.x;
  const mdy = m.y - f.y;
  const md = Math.hypot(mdx, mdy);
  f.bored = Math.max(0, (f.bored ?? 0) - 1);
  if (f.bored && f.boredAt && Math.hypot(m.x - f.boredAt.x, m.y - f.boredAt.y) > NEW_SPOT) f.bored = 0;

  // 滑鼠揮很快又很近 → 害怕
  if (md < 180 && m.speed > 28) f.fear = 1;
  const scared = f.fear > 0.05;
  const curious = !scared && !f.bored && md < 420 && m.still < 240;

  let target;
  if (scared) {
    target = Math.atan2(-mdy, -mdx); // 往反方向逃
  } else if (curious) {
    target = Math.atan2(mdy, mdx); // 好奇，游過去
    if (md < f.len * 0.7) {
      // 聞過了：一陣子不理滑鼠，挑個遠一點的地方游走
      f.bored = BORED_MIN + random() * (BORED_MAX - BORED_MIN);
      f.boredAt = { x: m.x, y: m.y };
      setGoal(f, w, h, random);
    }
  } else {
    // 往目標點游；到了或游太久就換一個
    f.goalTime = (f.goalTime ?? 0) - 1;
    if (!f.goal || f.goalTime <= 0 || Math.hypot(f.goal.x - f.x, f.goal.y - f.y) < f.len * 0.8) {
      setGoal(f, w, h, random);
    }
    // 路線不要是死板的直線：輕輕左右飄
    f.wander += 0.012 + random() * 0.006;
    target = Math.atan2(f.goal.y - f.y, f.goal.x - f.x) + Math.sin(f.wander) * 0.35;
  }

  // 別游出畫面：靠邊時轉回中間
  const margin = f.len * 0.8;
  if (f.x < margin || f.x > w - margin || f.y < h * 0.2 || f.y > h - margin * 0.6) {
    target = Math.atan2(h * 0.62 - f.y, w / 2 - f.x);
  }

  // 慢慢轉向。游得越慢轉得越慢，所以轉彎半徑不會小到變成原地打轉
  let diff = target - f.angle;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const turn = scared ? 0.09 : Math.min(0.025, 0.004 + f.speed * 0.03);
  f.angle += Math.max(-turn, Math.min(turn, diff));

  // 靠近滑鼠時放慢，像在聞
  let want = f.cruise;
  if (scared) want = 4.5;
  else if (curious && md < 90) want = 0.15;
  f.speed += (want - f.speed) * 0.05;
  f.fear *= 0.97;

  f.x += Math.cos(f.angle) * f.speed;
  f.y += Math.sin(f.angle) * f.speed;
  // 擺尾的速度跟游速有關
  f.phase += 0.06 + f.speed * 0.09;
}

// 換一個目標點。給的時間 = 照平常速度游過去要多久再多一些（太短的話游到一半就換、掉頭）
function setGoal(f, w, h, random) {
  f.goal = pickGoal(f, w, h, random);
  const d = Math.hypot(f.goal.x - f.x, f.goal.y - f.y);
  f.goalTime = (d / Math.max(0.3, f.cruise)) * 1.6 + 120;
}

// 在池子裡挑一個點：試幾個，挑「夠遠、又大致在前方」的（一直掉頭很不自然）
function pickGoal(f, w, h, random) {
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < 5; i++) {
    const g = { x: w * (0.12 + random() * 0.76), y: h * (0.32 + random() * 0.56) };
    const d = Math.hypot(g.x - f.x, g.y - f.y);
    const ahead = (1 + Math.cos(Math.atan2(g.y - f.y, g.x - f.x) - f.angle)) / 2; // 正前方 1、正後方 0
    const score = d * (0.3 + 0.7 * ahead);
    if (score > bestScore) {
      best = g;
      bestScore = score;
    }
  }
  return best;
}
