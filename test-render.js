// Render-test script: uses node-canvas to render Pokemon and Yu-Gi-Oh cards
// with various states and save PNG files for visual inspection.
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register a Korean font so measureText returns accurate widths in node-canvas.
// Without this, sans-serif falls back to a Latin font for measurement while
// drawing Korean from a different glyph source — leading to mis-sized text.
const KO_FONT_CANDIDATES = [
  'C:\\Windows\\Fonts\\malgun.ttf',
  'C:\\Windows\\Fonts\\malgunbd.ttf',
  '/System/Library/Fonts/AppleSDGothicNeo.ttc',
  '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
];
let KOREAN_FAMILY = 'sans-serif';
for (const p of KO_FONT_CANDIDATES) {
  if (fs.existsSync(p)) {
    try {
      registerFont(p, { family: 'KoTest' });
      KOREAN_FAMILY = 'KoTest';
      console.log('Registered Korean font:', p);
      break;
    } catch (e) { /* try next */ }
  }
}

const TYPE_THEME = {
  fire:      { bg: '#ffd180', accent: '#ff7043', name: '불',     icon: '🔥' },
  water:     { bg: '#90caf9', accent: '#42a5f5', name: '물',     icon: '💧' },
  grass:     { bg: '#a5d6a7', accent: '#66bb6a', name: '풀',     icon: '🌿' },
  lightning: { bg: '#fff59d', accent: '#fdd835', name: '번개',   icon: '⚡' },
  psychic:   { bg: '#ce93d8', accent: '#ab47bc', name: '심리',   icon: '🔮' },
  fighting:  { bg: '#bcaaa4', accent: '#8d6e63', name: '격투',   icon: '👊' },
  darkness:  { bg: '#90a4ae', accent: '#455a64', name: '악',     icon: '🌑' },
  metal:     { bg: '#cfd8dc', accent: '#90a4ae', name: '강철',   icon: '⚙️' },
  fairy:     { bg: '#f8bbd0', accent: '#f48fb1', name: '페어리', icon: '🧚' },
  dragon:    { bg: '#ffcc80', accent: '#ffa726', name: '드래곤', icon: '🐉' },
  colorless: { bg: '#eceff1', accent: '#bdbdbd', name: '노말',   icon: '⭐' }
};

const YUGI_FRAME = {
  normal:  { bg: '#d9a55b', inner: '#f7e4c1', text: '#1a1a1a', label: '일반 몬스터' },
  effect:  { bg: '#b8542a', inner: '#f3b89a', text: '#1a1a1a', label: '효과 몬스터' },
  ritual:  { bg: '#4a86c7', inner: '#b8d6f1', text: '#1a1a1a', label: '의식 몬스터' },
  fusion:  { bg: '#886baa', inner: '#cfbdd9', text: '#1a1a1a', label: '융합 몬스터' },
  synchro: { bg: '#e8e3d3', inner: '#f8f5ec', text: '#1a1a1a', label: '싱크로 몬스터' },
  xyz:     { bg: '#2d2d2d', inner: '#7a7a7a', text: '#ffffff', label: '엑시즈 몬스터' },
  link:    { bg: '#1c4e80', inner: '#7faed1', text: '#ffffff', label: '링크 몬스터' },
  spell:   { bg: '#1da97e', inner: '#a8e6cf', text: '#1a1a1a', label: '마법 카드' },
  trap:    { bg: '#b94d8c', inner: '#f1b9d6', text: '#1a1a1a', label: '함정 카드' }
};

const YUGI_ATTR = {
  light:  { color: '#e3c200', label: '빛' },
  dark:   { color: '#5b3c89', label: '어둠' },
  earth:  { color: '#82592c', label: '땅' },
  water:  { color: '#2b71b9', label: '물' },
  fire:   { color: '#d33b3b', label: '불' },
  wind:   { color: '#1f9c70', label: '바람' },
  divine: { color: '#d4af37', label: '신' }
};

const KOREAN_FONT = KOREAN_FAMILY;
const SERIF_FONT = 'serif';

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function makeFitter(ctx) {
  return function fitTextToWidth(text, maxWidth, startSize, minSize, fontFamily = KOREAN_FONT, weight = 'bold') {
    let size = startSize;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 1;
      ctx.font = `${weight} ${size}px ${fontFamily}`;
    }
    return size;
  };
}

function makeWrap(ctx) {
  return function wrapTextByChar(text, maxWidth, fontSize, maxLines, fontFamily = KOREAN_FONT, weight = '') {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`.trim();
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ch === '\n') {
        lines.push(line);
        line = '';
        if (lines.length >= maxLines) break;
        continue;
      }
      if (ctx.measureText(line + ch).width > maxWidth) {
        lines.push(line);
        line = ch;
        if (lines.length >= maxLines) break;
      } else {
        line += ch;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines) {
      const consumed = lines.join('').length;
      if (consumed < [...text].length) {
        let last = lines[maxLines - 1];
        while (last.length > 0 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
        lines[maxLines - 1] = last + '…';
      }
    }
    return lines;
  };
}

function drawStar(c, cx, cy, r, fill, stroke = null) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = 1.5;
    c.strokeStyle = stroke;
    c.stroke();
  }
}

function drawDiamondRank(c, cx, cy, r, fill) {
  c.save();
  c.translate(cx, cy);
  c.rotate(Math.PI / 4);
  c.fillStyle = fill;
  c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
  c.restore();
}

function renderPokemon(canvas, s, image) {
  const ctx = canvas.getContext('2d');
  const fit = makeFitter(ctx);
  const wrap = makeWrap(ctx);
  const theme = TYPE_THEME[s.type];
  const W = canvas.width, H = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, theme.accent);
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fillStyle = grad; ctx.fill();

  ctx.lineWidth = 18;
  ctx.strokeStyle = '#f7d046';
  roundRect(ctx, 9, 9, W - 18, H - 18, 20);
  ctx.stroke();

  ctx.fillStyle = '#fffdf2';
  roundRect(ctx, 32, 32, W - 64, H - 64, 12);
  ctx.fill();

  const headerY = 50, headerH = 70;
  const headerCenterY = headerY + headerH / 2;
  ctx.fillStyle = theme.accent;
  roundRect(ctx, 50, headerY, W - 100, headerH, 10);
  ctx.fill();

  ctx.font = `bold 38px ${KOREAN_FONT}`;
  const hpNumW = ctx.measureText(String(s.hp)).width;
  ctx.font = `bold 14px ${KOREAN_FONT}`;
  const hpLabelW = ctx.measureText('HP').width;

  const iconCx = W - 62;
  const iconR = 22;
  const hpNumRight = iconCx - iconR - 6;
  const hpLabelRight = hpNumRight - hpNumW - 4;
  const nameMaxX = hpLabelRight - hpLabelW - 10;
  const nameAreaWidth = nameMaxX - 68;

  const nameSize = fit(s.name, nameAreaWidth, 34, 16);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold ${nameSize}px ${KOREAN_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(s.name, 68, headerCenterY);

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 14px ${KOREAN_FONT}`;
  ctx.fillStyle = '#b71c1c';
  ctx.fillText('HP', hpLabelRight, headerCenterY - 10);
  ctx.font = `bold 36px ${KOREAN_FONT}`;
  ctx.fillText(String(s.hp), hpNumRight, headerCenterY + 4);

  ctx.beginPath();
  ctx.arc(iconCx, headerCenterY, iconR, 0, Math.PI * 2);
  ctx.fillStyle = '#fffbe6'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `24px ${KOREAN_FONT}`;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(theme.icon, iconCx, headerCenterY + 1);

  const imgX = 50, imgY = 140, imgW = W - 100, imgH = 340;
  ctx.fillStyle = '#0a0a0a';
  roundRect(ctx, imgX - 4, imgY - 4, imgW + 8, imgH + 8, 8);
  ctx.fill();
  ctx.fillStyle = '#e8eaf0';
  roundRect(ctx, imgX, imgY, imgW, imgH, 6);
  ctx.fill();

  if (image) {
    ctx.save();
    roundRect(ctx, imgX, imgY, imgW, imgH, 6);
    ctx.clip();
    const ar = image.width / image.height;
    const tAr = imgW / imgH;
    let sx, sy, sw, sh;
    if (ar > tAr) { sh = image.height; sw = sh * tAr; sx = (image.width - sw) / 2; sy = 0; }
    else { sw = image.width; sh = sw / tAr; sx = 0; sy = (image.height - sh) / 2; }
    ctx.drawImage(image, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#9e9e9e';
    ctx.font = `18px ${KOREAN_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📷 사진을 추가하세요', W / 2, imgY + imgH / 2);
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.font = `12px ${KOREAN_FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`타입: ${theme.name}`, imgX + 6, imgY + imgH + 18);

  let y = imgY + imgH + 40;
  const attackBottomLimit = H - 150;

  const drawAttack = (atk) => {
    if (!atk.name) return;
    if (y > attackBottomLimit) return;
    ctx.fillStyle = '#1a1a1a';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `22px ${KOREAN_FONT}`;
    ctx.fillText(atk.cost || '', 56, y);
    const damageW = atk.damage ? (ctx.measureText(String(atk.damage)).width + 20) : 0;
    const attackNameMax = W - 56 - damageW - 170;
    const aSize = fit(atk.name, attackNameMax, 22, 14);
    ctx.font = `bold ${aSize}px ${KOREAN_FONT}`;
    ctx.fillText(atk.name, 170, y);
    if (atk.damage) {
      ctx.textAlign = 'right';
      ctx.font = `bold 26px ${KOREAN_FONT}`;
      ctx.fillText(String(atk.damage), W - 56, y);
      ctx.textAlign = 'left';
    }
    y += 28;
    if (atk.desc) {
      ctx.font = `14px ${KOREAN_FONT}`;
      ctx.fillStyle = '#3a3a3a';
      ctx.textBaseline = 'alphabetic';
      const lines = wrap(atk.desc, W - 130, 14, 2);
      for (const line of lines) { ctx.fillText(line, 70, y); y += 18; }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y + 4); ctx.lineTo(W - 56, y + 4); ctx.stroke();
    y += 14;
  };
  drawAttack(s.atk1);
  drawAttack(s.atk2);

  const fy = H - 130;
  ctx.fillStyle = theme.accent;
  roundRect(ctx, 50, fy, W - 100, 56, 8);
  ctx.fill();
  const colW = (W - 100) / 3;
  ctx.fillStyle = '#1a1a1a';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = `11px ${KOREAN_FONT}`;
  ctx.fillText('약점', 50 + colW * 0.5, fy + 6);
  ctx.fillText('저항력', 50 + colW * 1.5, fy + 6);
  ctx.fillText('후퇴 비용', 50 + colW * 2.5, fy + 6);
  ctx.font = `bold 16px ${KOREAN_FONT}`;
  ctx.fillText(s.weakness, 50 + colW * 0.5, fy + 26);
  ctx.fillText(s.resistance, 50 + colW * 1.5, fy + 26);
  ctx.fillText(s.retreat, 50 + colW * 2.5, fy + 26);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = `11px ${KOREAN_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (s.illustrator) ctx.fillText(`Illus. ${s.illustrator}`, 56, H - 50);
  ctx.textAlign = 'right';
  if (s.setNumber) ctx.fillText(s.setNumber, W - 56, H - 50);
}

function renderYugioh(canvas, s, image) {
  const ctx = canvas.getContext('2d');
  const fit = makeFitter(ctx);
  const wrap = makeWrap(ctx);
  const frame = YUGI_FRAME[s.frame] || YUGI_FRAME.normal;
  const attr = YUGI_ATTR[s.attribute] || YUGI_ATTR.light;
  const W = canvas.width, H = canvas.height;
  const isMonster = !['spell', 'trap'].includes(s.frame);
  const isXyz = s.frame === 'xyz';
  const textColor = frame.text;

  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  ctx.fillStyle = frame.bg;
  roundRect(ctx, 18, 18, W - 36, H - 36, 16);
  ctx.fill();

  ctx.fillStyle = frame.inner;
  roundRect(ctx, 36, 36, W - 72, H - 72, 8);
  ctx.fill();

  ctx.fillStyle = textColor;
  const nameMaxW = isMonster ? W - 180 : W - 100;
  const nameSize = fit(s.name, nameMaxW - 50, 36, 18);
  ctx.font = `bold ${nameSize}px ${KOREAN_FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(s.name, 50, 75);

  const attrCx = W - 80, attrCy = 75, attrR = 32;
  ctx.beginPath();
  ctx.arc(attrCx, attrCy, attrR, 0, Math.PI * 2);
  if (s.frame === 'spell')      ctx.fillStyle = '#1da97e';
  else if (s.frame === 'trap')  ctx.fillStyle = '#b94d8c';
  else                          ctx.fillStyle = attr.color;
  ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 18px ${KOREAN_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (s.frame === 'spell')     ctx.fillText('마법', attrCx, attrCy + 1);
  else if (s.frame === 'trap') ctx.fillText('함정', attrCx, attrCy + 1);
  else                         ctx.fillText(attr.label, attrCx, attrCy + 1);

  if (isMonster && s.level > 0) {
    const starR = 13;
    const starSpacing = 22;
    const maxStars = Math.min(s.level, 12);
    const startX = W - 50 - (maxStars - 1) * starSpacing;
    for (let i = 0; i < maxStars; i++) {
      const cx = startX + i * starSpacing;
      const cy = 130;
      if (isXyz) {
        drawDiamondRank(ctx, cx, cy, starR, '#1a1a1a');
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#444';
        ctx.fillRect(-starR * 0.4, -starR * 0.4, starR * 0.8, starR * 0.8);
        ctx.restore();
      } else {
        drawStar(ctx, cx, cy, starR, '#d68f1c', '#5b3a0a');
      }
    }
  }

  const artX = 60, artY = 155, artW = W - 120, artH = 340;
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, artX - 4, artY - 4, artW + 8, artH + 8, 4);
  ctx.fill();
  ctx.fillStyle = '#e8eaf0';
  ctx.fillRect(artX, artY, artW, artH);

  if (image) {
    ctx.save();
    ctx.beginPath(); ctx.rect(artX, artY, artW, artH); ctx.clip();
    const ar = image.width / image.height;
    const tAr = artW / artH;
    let sx, sy, sw, sh;
    if (ar > tAr) { sh = image.height; sw = sh * tAr; sx = (image.width - sw) / 2; sy = 0; }
    else { sw = image.width; sh = sw / tAr; sx = 0; sy = (image.height - sh) / 2; }
    ctx.drawImage(image, sx, sy, sw, sh, artX, artY, artW, artH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#9e9e9e';
    ctx.font = `18px ${KOREAN_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📷 사진을 추가하세요', W / 2, artY + artH / 2);
  }

  const typeY = artY + artH + 14;
  let typeText = '';
  if (isMonster) {
    let frameLabel = '';
    if (s.frame === 'normal')       frameLabel = '/통상';
    else if (s.frame === 'effect')  frameLabel = '/효과';
    else if (s.frame === 'ritual')  frameLabel = '/의식/효과';
    else if (s.frame === 'fusion')  frameLabel = '/융합/효과';
    else if (s.frame === 'synchro') frameLabel = '/싱크로/효과';
    else if (s.frame === 'xyz')     frameLabel = '/엑시즈/효과';
    else if (s.frame === 'link')    frameLabel = '/링크/효과';
    typeText = `【${s.race || '몬스터'}${frameLabel}】`;
  } else {
    typeText = `【${frame.label}】`;
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold 15px ${KOREAN_FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(typeText, 56, typeY);

  const effX = 56, effY = typeY + 26, effW = W - 112, effH = 170;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(effX, effY, effW, effH);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(effX, effY, effW, effH);

  if (s.effect) {
    const isFlavor = s.frame === 'normal';
    ctx.fillStyle = '#1a1a1a';
    const lines = wrap(s.effect, effW - 14, 13, 9, KOREAN_FONT, isFlavor ? 'italic' : '');
    ctx.font = `${isFlavor ? 'italic ' : ''}13px ${KOREAN_FONT}`;
    let ty = effY + 10;
    for (const line of lines) { ctx.fillText(line, effX + 7, ty); ty += 17; }
  }

  if (isMonster) {
    const statY = effY + effH + 8;
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 16px ${SERIF_FONT}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const defText = s.frame === 'link' ? '' : `DEF/${s.def || '0'}`;
    if (defText) {
      ctx.fillText(defText, W - 60, statY);
      const defWidth = ctx.measureText(defText).width;
      ctx.fillText(`ATK/${s.atk || '0'}`, W - 60 - defWidth - 30, statY);
    } else {
      ctx.fillText(`ATK/${s.atk || '0'}`, W - 60, statY);
    }
  }

  ctx.fillStyle = '#1a1a1a';
  ctx.font = `10px ${KOREAN_FONT}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (s.cardNo) ctx.fillText(s.cardNo, 50, H - 48);
  ctx.textAlign = 'right';
  ctx.fillText('© KAZUKI ', W - 50, H - 48);
}

// ---- Sample test cases ----
const pokemonCases = [
  {
    file: 'test_pikachu.png',
    state: {
      name: '피카츄', hp: '60', type: 'lightning',
      atk1: { cost: '⚡⭐', name: '전기 충격', damage: '20', desc: '동전을 던져 앞면이 나오면 상대를 마비시킨다.' },
      atk2: { cost: '⚡⚡⭐', name: '볼트 태클', damage: '90', desc: '이 포켓몬도 30 데미지를 입는다.' },
      weakness: '격투 ×2', resistance: '강철 -20', retreat: '⭐',
      illustrator: 'Mitsuhiro Arita', setNumber: '025/151'
    }
  },
  {
    file: 'test_long_name.png',
    state: {
      name: '리자몽엑스아주매우긴이름', hp: '320', type: 'fire',
      atk1: { cost: '🔥🔥🔥', name: '대문자식대화염방사기술', damage: '250', desc: '에너지 2개를 트래쉬한다. 모든 효과를 무시한다. 이 공격은 상대 벤치 포켓몬 1마리에게도 50 데미지를 입힌다.' },
      atk2: { cost: '', name: '', damage: '', desc: '' },
      weakness: '물 ×2', resistance: '-', retreat: '⭐⭐⭐⭐',
      illustrator: 'Test Artist with Very Long Name', setNumber: '999/999'
    }
  },
  {
    file: 'test_minimal.png',
    state: {
      name: '???', hp: '?', type: 'colorless',
      atk1: { cost: '', name: '', damage: '', desc: '' },
      atk2: { cost: '', name: '', damage: '', desc: '' },
      weakness: '-', resistance: '-', retreat: '-',
      illustrator: '', setNumber: ''
    }
  }
];

const yugiCases = [
  {
    file: 'test_yugi_normal.png',
    state: {
      name: '푸른 눈의 백룡', frame: 'normal', attribute: 'light', level: 8,
      race: '드래곤족',
      effect: '높은 공격력을 자랑하는 전설의 드래곤. 어떤 상대도 꺾어버리는 그 모습은 보는 이를 압도한다.',
      atk: '3000', def: '2500', cardNo: 'LOB-KR001'
    }
  },
  {
    file: 'test_yugi_effect.png',
    state: {
      name: '엘리멘틀 히어로 네오스', frame: 'effect', attribute: 'light', level: 7,
      race: '전사족',
      effect: '이 카드는 "네오 스페이시언" 1장과 함께 융합 소환을 할 수 있다. 융합 소환 후 엔드 페이즈에 이 카드를 엑스트라 덱으로 되돌린다.',
      atk: '2500', def: '2000', cardNo: 'POTD-KR001'
    }
  },
  {
    file: 'test_yugi_xyz.png',
    state: {
      name: '굴완야수왕 바르바로스 Ur', frame: 'xyz', attribute: 'earth', level: 4,
      race: '야수전사족',
      effect: '레벨 4 몬스터 × 2. 1턴에 1번, 이 카드의 엑시즈 소재 1개를 제거하고 발동할 수 있다: 상대 필드의 카드 1장을 골라 파괴한다.',
      atk: '1900', def: '1200', cardNo: 'GENF-KR040'
    }
  },
  {
    file: 'test_yugi_synchro.png',
    state: {
      name: '스타더스트 드래곤', frame: 'synchro', attribute: 'wind', level: 8,
      race: '드래곤족',
      effect: '튜너 + 튜너 이외의 몬스터 1장 이상. 카드의 효과 발동시, 이 카드를 릴리스하고 발동할 수 있다: 그 발동을 무효로 하고 파괴한다.',
      atk: '2500', def: '2000', cardNo: 'TDGS-KR040'
    }
  },
  {
    file: 'test_yugi_spell.png',
    state: {
      name: '죽은 자의 소생', frame: 'spell', attribute: 'light', level: 0,
      race: '',
      effect: '자신 또는 상대의 묘지에서 몬스터 1장을 고르고, 자신 필드 위에 특수 소환한다.',
      atk: '', def: '', cardNo: 'LOB-KR052'
    }
  },
  {
    file: 'test_yugi_trap.png',
    state: {
      name: '성스러운 방어막 거울의 힘', frame: 'trap', attribute: 'light', level: 0,
      race: '',
      effect: '상대 몬스터의 공격 선언시에 발동할 수 있다. 공격 표시인 상대 몬스터를 전부 파괴한다.',
      atk: '', def: '', cardNo: 'MRD-KR138'
    }
  },
  {
    file: 'test_yugi_long_name.png',
    state: {
      name: '엄청나게긴이름의카드네임테스트용도', frame: 'fusion', attribute: 'dark', level: 12,
      race: '드래곤족/융합',
      effect: '레벨 8 이상의 어둠 속성 몬스터 + 어둠 속성 몬스터 2장. 이 카드는 융합 소환으로만 엑스트라 덱에서 특수 소환할 수 있다. 매우 긴 효과 텍스트의 줄바꿈을 테스트하기 위한 내용입니다. 충분히 길게 작성해서 글자가 잘리는지 잘 들어가는지 확인합니다. 이만하면 충분히 길어졌네요.',
      atk: '4000', def: '4000', cardNo: 'TEST-KR999'
    }
  }
];

(async () => {
  // Synthetic test image
  const testImg = createCanvas(600, 600);
  const tctx = testImg.getContext('2d');
  const gr = tctx.createLinearGradient(0, 0, 600, 600);
  gr.addColorStop(0, '#4fc3f7');
  gr.addColorStop(1, '#1565c0');
  tctx.fillStyle = gr;
  tctx.fillRect(0, 0, 600, 600);
  tctx.fillStyle = 'white';
  tctx.font = 'bold 48px sans-serif';
  tctx.textAlign = 'center';
  tctx.fillText('TEST', 300, 320);

  const outDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const tc of pokemonCases) {
    const c = createCanvas(600, 840);
    renderPokemon(c, tc.state, tc.file === 'test_minimal.png' ? null : testImg);
    fs.writeFileSync(path.join(outDir, tc.file), c.toBuffer('image/png'));
    console.log('Wrote', tc.file);
  }
  for (const tc of yugiCases) {
    const c = createCanvas(600, 840);
    renderYugioh(c, tc.state, testImg);
    fs.writeFileSync(path.join(outDir, tc.file), c.toBuffer('image/png'));
    console.log('Wrote', tc.file);
  }
  console.log('Done. Files in:', outDir);
})();
