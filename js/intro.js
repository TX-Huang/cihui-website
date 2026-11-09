// 開場「從凡間升入瑤池」的時間軸（純計算，方便測試；畫面在 js/intro-view.js）。
//
// 鏡頭往上升：
//   0 ~ 2.2 秒　夜裡的凡間（稻田、小鎮燈火），慢慢往下沉
//   1.0 ~ 3.2 秒　雲海從下方升上來、越來越近，最後整個畫面都在雲裡（白茫茫）
//   2.7 ~ 3.2 秒　在雲裡的時候，夜色退去（看不到的時候換場景）
//   3.2 ~ 5.2 秒　雲散開，瑤池和大門出現，從稍大慢慢收到正常大小（像停下來站穩）
//
// 每一層用「關鍵格」描述：[時間(毫秒), 數值]，中間用 smoothstep 過渡。

export const INTRO_MS = 5200;
export const SKIP_TO = 3400; // 按「略過」：直接跳到雲散開那一段

const TRACKS = {
  earth: {
    y: [[0, 0], [3000, 100]], // 往下沉：0 = 起點，100 = 整張直圖往下移到底（看到最上面的雲霧）
    scale: [[0, 1.04], [3000, 1.18]],
    opacity: [[0, 1], [2200, 1], [3000, 0]]
  },
  back: {
    y: [[0, 80], [3600, -20]],
    scale: [[0, 1], [3600, 1.35]],
    opacity: [[0, 0], [700, 0], [1500, 1], [3600, 1], [4400, 0]]
  },
  front: {
    y: [[0, 120], [1200, 60], [3200, -10], [4600, -60]],
    scale: [[0, 1.1], [1200, 1.3], [3200, 2.4], [4600, 3.2]],
    opacity: [[0, 0], [1000, 0], [2000, 1], [3500, 1], [4500, 0]]
  },
  veil: { opacity: [[0, 0], [2100, 0], [2700, 0.92], [3500, 0.92], [4700, 0]] },
  night: { opacity: [[0, 1], [2700, 1], [3200, 0]] },
  site: {
    scale: [[0, 1.14], [3000, 1.14], [INTRO_MS, 1]],
    opacity: [[0, 0], [2700, 0], [3300, 1]]
  }
};

function smooth(x) {
  return x * x * (3 - 2 * x);
}

function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

export function introFrame(t) {
  const time = Math.min(Math.max(0, t), INTRO_MS);
  const frame = { done: time >= INTRO_MS };
  for (const [layer, props] of Object.entries(TRACKS)) {
    frame[layer] = {};
    for (const [prop, keys] of Object.entries(props)) frame[layer][prop] = track(keys, time);
  }
  return frame;
}

// 誰要看開場：這次造訪第一次進來、沒有要求減少動畫、不是直接連到其他神明
export function shouldPlayIntro({ seen, reduceMotion, hash }) {
  if (seen || reduceMotion) return false;
  return hash === "" || hash === "#" || hash === "#jinmu";
}
