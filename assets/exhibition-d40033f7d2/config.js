export const ARTIFACT = {
  title: '龙泉窑青瓷缠枝牡丹纹凤尾尊',
  period: '元 · 13—14世纪',
  introduction: '一器青釉，千年窑火。喇叭口舒展，长颈挺拔，丰腹渐收；缠枝牡丹于釉下流转，静观之间，重见温润瓷光。',
  collection: '瓷光重现 · 修复典藏',
};

// Positions and targets are relative to the existing normalized 3.9-unit artifact.
export const TOUR_SHOTS = [
  { id: 'whole', label: '完整器型', thumbnail: 'theme-whole.png', eyebrow: '观其形', title: '亭亭器形，舒展如凤尾', description: '从外撇的口沿到内收的足部，循着起伏的轮廓，感受凤尾尊端庄而舒展的气度。', position: [0, .95, 8.6], target: [0, -.08, 0], duration: 1300 },
  { id: 'mouth', label: '瓶口', thumbnail: 'theme-mouth.png', eyebrow: '察其口', title: '一线舒展，气韵自生', description: '近看外撇的瓶口与修长颈部。柔光掠过口沿，显出器壁的厚薄与釉层的温润。', position: [.28, 2.95, 3.95], target: [0, 1.27, 0], duration: 1250 },
  { id: 'peony', label: '牡丹纹样', thumbnail: 'theme-peony.png', eyebrow: '赏其纹', title: '枝蔓回旋，花意绵延', description: '腹部缠枝牡丹随器身展开。花叶的浅浮雕在光影之间隐现，让纹饰与青釉相互映衬。', position: [-1.1, .62, 4.05], target: [0, -.18, 0], duration: 1350 },
  { id: 'glaze', label: '釉色', thumbnail: 'theme-glaze.png', eyebrow: '品其色', title: '青如远山，润似含玉', description: '由斜侧细观釉面。温和高光沿弧面游移，积釉处深浅相生，呈现青瓷含蓄的光泽。', position: [2.7, .9, 3.5], target: [0, .05, 0], duration: 1400 },
  { id: 'return', label: '完整器形（回归）', eyebrow: '复见全貌', title: '修复已成，瓷光重现', description: '从细节回望全器。此刻可自由旋转、缩放，继续寻找属于你的观赏角度。', position: [0, .95, 8.6], target: [0, -.08, 0], duration: 1500 },
];

export const UI_COPY = {
  brand: '瓷光重现', restored: '修复完成',
  current: '此刻 · 静观', auto: '自动观赏', exit: '退出导览',
  hint: '拖动旋转 · 滚轮缩放', tourHint: '正在自动观赏 · 镜头缓缓流转',
  museum: '返回博物馆', museumPort: '5175',
};
