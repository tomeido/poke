const $ = (id) => document.getElementById(id);

// ============================================================
// THEMES & CONSTANTS
// ============================================================
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
  light:  { color: '#e3c200', label: '빛',   en: 'LIGHT'  },
  dark:   { color: '#5b3c89', label: '어둠', en: 'DARK'   },
  earth:  { color: '#82592c', label: '땅',   en: 'EARTH'  },
  water:  { color: '#2b71b9', label: '물',   en: 'WATER'  },
  fire:   { color: '#d33b3b', label: '불',   en: 'FIRE'   },
  wind:   { color: '#1f9c70', label: '바람', en: 'WIND'   },
  divine: { color: '#d4af37', label: '신',   en: 'DIVINE' }
};

const KOREAN_FONT = '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Segoe UI", sans-serif';
const SERIF_FONT = '"Times New Roman", "Nanum Myeongjo", serif';

// ============================================================
// STATE
// ============================================================
let originalImage = null;
let aiImage = null;
let lastFile = null;
let stream = null;

const canvas = $('card-canvas');
const ctx = canvas.getContext('2d');

function getStyle() { return $('card-style').value; }

function readState() {
  const style = getStyle();
  const aiOn = $('ai-toggle').checked;
  if (style === 'yugioh') {
    return {
      style: 'yugioh',
      name: $('y-name').value || '???',
      frame: $('y-frame').value,
      attribute: $('y-attribute').value,
      level: parseInt($('y-level').value, 10) || 0,
      race: $('y-race').value,
      atk: $('y-atk').value,
      def: $('y-def').value,
      effect: $('y-effect').value,
      cardNo: $('y-card-no').value,
      aiOn
    };
  }
  return {
    style: 'pokemon',
    name: $('name').value || '???',
    hp: $('hp').value || '?',
    type: $('type').value,
    atk1: { cost: $('atk1-cost').value, name: $('atk1-name').value, damage: $('atk1-damage').value, desc: $('atk1-desc').value },
    atk2: { cost: $('atk2-cost').value, name: $('atk2-name').value, damage: $('atk2-damage').value, desc: $('atk2-desc').value },
    weakness: $('weakness').value || '-',
    resistance: $('resistance').value || '-',
    retreat: $('retreat').value || '-',
    illustrator: $('illustrator').value,
    setNumber: $('set-number').value,
    aiOn
  };
}

// ============================================================
// CANVAS UTILITIES
// ============================================================
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

function wrapTextByChar(text, maxWidth, fontSize, maxLines, fontFamily = KOREAN_FONT, weight = '') {
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
    const lastIdx = maxLines - 1;
    let last = lines[lastIdx];
    // If we ran out of room mid-text, add ellipsis
    const consumed = lines.join('').length;
    if (consumed < [...text].length) {
      while (last.length > 0 && ctx.measureText(last + '…').width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[lastIdx] = last + '…';
    }
  }
  return lines;
}

function fitTextToWidth(text, maxWidth, startSize, minSize, fontFamily = KOREAN_FONT, weight = 'bold') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

function drawImageCover(image, x, y, w, h, cornerRadius = 0) {
  ctx.save();
  if (cornerRadius > 0) {
    roundRect(ctx, x, y, w, h, cornerRadius);
    ctx.clip();
  }
  const ar = image.width / image.height;
  const tAr = w / h;
  let sx, sy, sw, sh;
  if (ar > tAr) {
    sh = image.height;
    sw = sh * tAr;
    sx = (image.width - sw) / 2;
    sy = 0;
  } else {
    sw = image.width;
    sh = sw / tAr;
    sx = 0;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
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

function getDisplayImage(state) {
  return (state.aiOn && aiImage) ? aiImage : originalImage;
}

// ============================================================
// POKEMON RENDERER
// ============================================================
function renderPokemon(s) {
  const theme = TYPE_THEME[s.type];
  const W = canvas.width, H = canvas.height;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, theme.accent);
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fillStyle = grad;
  ctx.fill();

  // Yellow frame
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#f7d046';
  roundRect(ctx, 9, 9, W - 18, H - 18, 20);
  ctx.stroke();

  // Inner cream panel
  ctx.fillStyle = '#fffdf2';
  roundRect(ctx, 32, 32, W - 64, H - 64, 12);
  ctx.fill();

  // Header bar
  const headerY = 50, headerH = 70;
  const headerCenterY = headerY + headerH / 2;
  ctx.fillStyle = theme.accent;
  roundRect(ctx, 50, headerY, W - 100, headerH, 10);
  ctx.fill();

  // Compute right-side widths first so name area can be sized properly
  ctx.font = `bold 38px ${KOREAN_FONT}`;
  const hpNumW = ctx.measureText(String(s.hp)).width;
  ctx.font = `bold 14px ${KOREAN_FONT}`;
  const hpLabelW = ctx.measureText('HP').width;

  // Layout (right to left): [icon emoji] [HP num] [HP label]
  const iconCx = W - 62;
  const iconR = 22;
  const hpNumRight = iconCx - iconR - 6;
  const hpLabelRight = hpNumRight - hpNumW - 4;
  const nameMaxX = hpLabelRight - hpLabelW - 10;
  const nameAreaWidth = nameMaxX - 68;

  // Name (with auto-shrink)
  const nameSize = fitTextToWidth(s.name, nameAreaWidth, 34, 16);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold ${nameSize}px ${KOREAN_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(s.name, 68, headerCenterY);

  // HP label + value
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 14px ${KOREAN_FONT}`;
  ctx.fillStyle = '#b71c1c';
  ctx.fillText('HP', hpLabelRight, headerCenterY - 10);
  ctx.font = `bold 36px ${KOREAN_FONT}`;
  ctx.fillText(String(s.hp), hpNumRight, headerCenterY + 4);

  // Type icon (top right, no overlapping circle — draw emoji directly)
  ctx.beginPath();
  ctx.arc(iconCx, headerCenterY, iconR, 0, Math.PI * 2);
  ctx.fillStyle = '#fffbe6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `24px ${KOREAN_FONT}`;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(theme.icon, iconCx, headerCenterY + 1);

  // Image window
  const imgX = 50, imgY = 140, imgW = W - 100, imgH = 340;
  ctx.fillStyle = '#0a0a0a';
  roundRect(ctx, imgX - 4, imgY - 4, imgW + 8, imgH + 8, 8);
  ctx.fill();
  ctx.fillStyle = '#e8eaf0';
  roundRect(ctx, imgX, imgY, imgW, imgH, 6);
  ctx.fill();

  const displayImage = getDisplayImage(s);
  if (displayImage) {
    drawImageCover(displayImage, imgX, imgY, imgW, imgH, 6);
  } else {
    ctx.fillStyle = '#9e9e9e';
    ctx.font = `18px ${KOREAN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷 사진을 추가하세요', W / 2, imgY + imgH / 2);
  }

  // Type label under image
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `12px ${KOREAN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`타입: ${theme.name}`, imgX + 6, imgY + imgH + 18);

  // Attacks
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

    // Attack name (auto-shrink, leave space for damage)
    const damageW = atk.damage ? ctx.measureText(String(atk.damage)).width + 20 : 0;
    const attackNameMax = W - 56 - damageW - 170;
    const aSize = fitTextToWidth(atk.name, attackNameMax, 22, 14);
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
      const lines = wrapTextByChar(atk.desc, W - 130, 14, 2);
      for (const line of lines) {
        ctx.fillText(line, 70, y);
        y += 18;
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, y + 4);
    ctx.lineTo(W - 56, y + 4);
    ctx.stroke();
    y += 14;
  };

  drawAttack(s.atk1);
  drawAttack(s.atk2);

  // Footer: weakness / resistance / retreat
  const fy = H - 130;
  ctx.fillStyle = theme.accent;
  roundRect(ctx, 50, fy, W - 100, 56, 8);
  ctx.fill();
  const colW = (W - 100) / 3;
  ctx.fillStyle = '#1a1a1a';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = `11px ${KOREAN_FONT}`;
  ctx.fillText('약점',     50 + colW * 0.5, fy + 6);
  ctx.fillText('저항력',   50 + colW * 1.5, fy + 6);
  ctx.fillText('후퇴 비용', 50 + colW * 2.5, fy + 6);
  ctx.font = `bold 16px ${KOREAN_FONT}`;
  ctx.fillText(s.weakness,   50 + colW * 0.5, fy + 26);
  ctx.fillText(s.resistance, 50 + colW * 1.5, fy + 26);
  ctx.fillText(s.retreat,    50 + colW * 2.5, fy + 26);

  // Credits
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `11px ${KOREAN_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (s.illustrator) ctx.fillText(`Illus. ${s.illustrator}`, 56, H - 50);
  ctx.textAlign = 'right';
  if (s.setNumber) ctx.fillText(s.setNumber, W - 56, H - 50);

  // AI badge
  if (s.aiOn && aiImage) drawAIBadge(imgX + 8, imgY + 8);
}

function drawAIBadge(x, y) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, x, y, 56, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 11px ${KOREAN_FONT}`;
  ctx.fillText('AI 변환', x + 6, y + 11);
}

// ============================================================
// YU-GI-OH RENDERER
// ============================================================
function renderYugioh(s) {
  const frame = YUGI_FRAME[s.frame] || YUGI_FRAME.normal;
  const attr = YUGI_ATTR[s.attribute] || YUGI_ATTR.light;
  const W = canvas.width, H = canvas.height;
  const isMonster = !['spell', 'trap'].includes(s.frame);
  const isXyz = s.frame === 'xyz';
  const textColor = frame.text;

  // Outer black border + rounded corners
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // Card frame (colored area)
  ctx.fillStyle = frame.bg;
  roundRect(ctx, 18, 18, W - 36, H - 36, 16);
  ctx.fill();

  // Inner panel (lighter)
  ctx.fillStyle = frame.inner;
  roundRect(ctx, 36, 36, W - 72, H - 72, 8);
  ctx.fill();

  // Name banner
  ctx.fillStyle = textColor;
  const nameMaxW = isMonster ? W - 180 : W - 100;
  const nameSize = fitTextToWidth(s.name, nameMaxW - 50, 36, 18);
  ctx.font = `bold ${nameSize}px ${KOREAN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.name, 50, 75);

  // Attribute circle (top right) — for monsters AND spell/trap show different label
  const attrCx = W - 80, attrCy = 75, attrR = 32;
  ctx.beginPath();
  ctx.arc(attrCx, attrCy, attrR, 0, Math.PI * 2);
  ctx.fillStyle = attr.color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
  // Attribute label inside circle
  ctx.fillStyle = '#fff';
  ctx.font = `bold 18px ${KOREAN_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (s.frame === 'spell') {
    // Spell uses green circle with magic emblem; override
    ctx.fillStyle = '#1da97e';
    ctx.beginPath(); ctx.arc(attrCx, attrCy, attrR, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText('마법', attrCx, attrCy + 1);
  } else if (s.frame === 'trap') {
    ctx.fillStyle = '#b94d8c';
    ctx.beginPath(); ctx.arc(attrCx, attrCy, attrR, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText('함정', attrCx, attrCy + 1);
  } else {
    ctx.fillText(attr.label, attrCx, attrCy + 1);
  }

  // Level / Rank stars
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
        // Inner highlight
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#444';
        ctx.fillRect(-starR * 0.4, -starR * 0.4, starR * 0.8, starR * 0.8);
        ctx.restore();
      } else {
        drawStar(ctx, cx, cy, starR, '#d68f1c', '#5b3a0a');
      }
    }
  }

  // Image window
  const artX = 60, artY = 155, artW = W - 120, artH = 340;
  // Dark border
  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, artX - 4, artY - 4, artW + 8, artH + 8, 4);
  ctx.fill();
  ctx.fillStyle = '#e8eaf0';
  ctx.fillRect(artX, artY, artW, artH);
  const img = getDisplayImage(s);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(artX, artY, artW, artH);
    ctx.clip();
    const ar = img.width / img.height;
    const tAr = artW / artH;
    let sx, sy, sw, sh;
    if (ar > tAr) {
      sh = img.height; sw = sh * tAr;
      sx = (img.width - sw) / 2; sy = 0;
    } else {
      sw = img.width; sh = sw / tAr;
      sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, artX, artY, artW, artH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#9e9e9e';
    ctx.font = `18px ${KOREAN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷 사진을 추가하세요', W / 2, artY + artH / 2);
  }

  // Type/race bar
  const typeY = artY + artH + 14;
  let typeText = '';
  if (isMonster) {
    let frameLabel = '';
    if (s.frame === 'normal') frameLabel = '/통상';
    else if (s.frame === 'effect') frameLabel = '/효과';
    else if (s.frame === 'ritual') frameLabel = '/의식/효과';
    else if (s.frame === 'fusion') frameLabel = '/융합/효과';
    else if (s.frame === 'synchro') frameLabel = '/싱크로/효과';
    else if (s.frame === 'xyz') frameLabel = '/엑시즈/효과';
    else if (s.frame === 'link') frameLabel = '/링크/효과';
    typeText = `【${s.race || '몬스터'}${frameLabel}】`;
  } else {
    typeText = `【${frame.label}】`;
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold 15px ${KOREAN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(typeText, 56, typeY);

  // Effect / flavor text box
  const effX = 56, effY = typeY + 26, effW = W - 112, effH = 170;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(effX, effY, effW, effH);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(effX, effY, effW, effH);

  if (s.effect) {
    const isFlavor = s.frame === 'normal';
    ctx.fillStyle = '#1a1a1a';
    const lines = wrapTextByChar(s.effect, effW - 14, 13, 9, KOREAN_FONT, isFlavor ? 'italic' : '');
    ctx.font = `${isFlavor ? 'italic ' : ''}13px ${KOREAN_FONT}`;
    let ty = effY + 10;
    for (const line of lines) {
      ctx.fillText(line, effX + 7, ty);
      ty += 17;
    }
  }

  // ATK / DEF (monster only)
  if (isMonster) {
    const statY = effY + effH + 8;
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 16px ${SERIF_FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const defText = s.frame === 'link' ? '' : `DEF/${s.def || '0'}`;
    if (defText) {
      ctx.fillText(defText, W - 60, statY);
      const defWidth = ctx.measureText(defText).width;
      ctx.fillText(`ATK/${s.atk || '0'}`, W - 60 - defWidth - 30, statY);
    } else {
      ctx.fillText(`ATK/${s.atk || '0'}`, W - 60, statY);
    }
  }

  // Card number bottom
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `10px ${KOREAN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (s.cardNo) ctx.fillText(s.cardNo, 50, H - 48);
  ctx.textAlign = 'right';
  ctx.fillText('© KAZUKI ', W - 50, H - 48);

  // AI badge
  if (s.aiOn && aiImage) drawAIBadge(artX + 8, artY + 8);
}

// ============================================================
// MAIN RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = readState();
  if (s.style === 'yugioh') {
    renderYugioh(s);
  } else {
    renderPokemon(s);
  }
}

// ============================================================
// STYLE TOGGLE
// ============================================================
function updateStyleVisibility() {
  const style = getStyle();
  document.querySelectorAll('[data-style]').forEach((el) => {
    el.hidden = el.dataset.style !== style;
  });
  // Spell/trap → hide monster-only fields
  if (style === 'yugioh') {
    const isMonster = !['spell', 'trap'].includes($('y-frame').value);
    $('y-monster-fields').hidden = !isMonster;
  }
  render();
}

$('card-style').addEventListener('change', updateStyleVisibility);
$('y-frame')?.addEventListener('change', updateStyleVisibility);

// ============================================================
// INPUT BINDINGS
// ============================================================
document.querySelectorAll('input, select, textarea').forEach((el) => {
  if (el.id === 'file-input' || el.id === 'api-key') return;
  el.addEventListener('input', render);
  el.addEventListener('change', render);
});

// ============================================================
// FILE / CAMERA
// ============================================================
$('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await setImageFromFile(file);
});

async function loadImage(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = src;
  });
  return img;
}

async function setImageFromFile(file) {
  lastFile = file;
  aiImage = null;
  const url = URL.createObjectURL(file);
  try {
    originalImage = await loadImage(url);
  } catch (err) {
    showAIStatus('이미지를 불러올 수 없습니다.', 'error');
    return;
  }
  render();
  if ($('ai-toggle').checked) await runAI(file);
}

$('btn-camera').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    $('camera-video').srcObject = stream;
    $('camera-stage').hidden = false;
  } catch (err) {
    alert('카메라를 사용할 수 없습니다: ' + err.message);
  }
});

$('btn-capture').addEventListener('click', () => {
  const video = $('camera-video');
  const c = document.createElement('canvas');
  c.width = video.videoWidth || 1280;
  c.height = video.videoHeight || 960;
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  c.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
    stopCamera();
    await setImageFromFile(file);
  }, 'image/png');
});

$('btn-cancel-camera').addEventListener('click', stopCamera);

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $('camera-stage').hidden = true;
  $('camera-video').srcObject = null;
}

// ============================================================
// AI
// ============================================================
$('ai-toggle').addEventListener('change', async () => {
  if (!$('ai-toggle').checked) { render(); return; }
  if (!lastFile) {
    showAIStatus('먼저 사진을 업로드하거나 촬영하세요.', 'error');
    $('ai-toggle').checked = false;
    return;
  }
  if (!aiImage) {
    await runAI(lastFile);
  } else {
    render();
  }
});

const apiKeyInput = $('api-key');
apiKeyInput.value = localStorage.getItem('poke_openai_api_key') || '';
apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('poke_openai_api_key', apiKeyInput.value.trim());
});

function showAIStatus(msg, kind = '') {
  const el = $('ai-status');
  el.textContent = msg;
  el.className = 'ai-status' + (kind ? ' ' + kind : '');
  el.hidden = false;
}

async function runAI(file) {
  const apiKey = (apiKeyInput.value || localStorage.getItem('poke_openai_api_key') || '').trim();
  if (!apiKey) {
    showAIStatus('AI 변환을 사용하려면 OpenAI API 키를 입력하세요.', 'error');
    $('ai-toggle').checked = false;
    return;
  }
  const style = getStyle();
  const prompt = style === 'yugioh'
    ? '이 사진의 주제를 유희왕 트레이딩 카드 일러스트로 변환해주세요. 일본 카드게임 스타일, 디테일하고 다이나믹한 포즈, 강렬한 색감과 빛 효과, 판타지 배경. 원본 피사체를 알아볼 수 있게 유지하세요.'
    : '이 사진의 주제를 클래식 포켓몬 트레이딩 카드 일러스트로 변환해주세요. 포켓몬 애니메이션 스타일, 비비드한 색감, 부드러운 셰이딩, 판타지 배경, 카툰풍, 귀엽고 매력적으로. 원본 피사체를 알아볼 수 있게 유지하세요.';

  showAIStatus('AI 변환 중... (10~40초 소요)', '');
  try {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', file);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    form.append('n', '1');
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });
    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try { msg = JSON.parse(errText).error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('응답에 이미지 데이터가 없습니다.');
    aiImage = await loadImage('data:image/png;base64,' + b64);
    showAIStatus('AI 변환 완료!', 'success');
    render();
  } catch (err) {
    console.error(err);
    showAIStatus('AI 변환 실패: ' + err.message, 'error');
    $('ai-toggle').checked = false;
    render();
  }
}

// ============================================================
// DOWNLOAD
// ============================================================
$('btn-download').addEventListener('click', () => {
  const link = document.createElement('a');
  const name = getStyle() === 'yugioh' ? ($('y-name').value || 'yugioh') : ($('name').value || 'pokemon');
  link.download = `${name.replace(/\s+/g, '_')}_card.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ============================================================
// INIT
// ============================================================
updateStyleVisibility();
render();
