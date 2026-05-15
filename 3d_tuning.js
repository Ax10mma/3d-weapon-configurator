import * as THREE from 'https://esm.sh/three@0.150.1';
import { GLTFLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'https://esm.sh/three@0.150.1/examples/jsm/loaders/DRACOLoader.js';

// ── DOM ────────────────────────────────────────────────
const canvas      = document.getElementById('viewport');
const loadScreen  = document.getElementById('loading-screen');
const loadBar     = document.getElementById('loading-bar');
const loadText    = document.getElementById('loading-text');
const gunLabel    = document.getElementById('gun-label');
const summary     = document.getElementById('selected-summary');
const panel       = document.getElementById('panel');
const toggleBtn   = document.getElementById('toggle-panel');

// ── Renderer ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scene & Camera ─────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2c3e50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0.2, 1.2);

// ── Controls ───────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 0.3;
controls.maxDistance = 4;
controls.maxPolarAngle = Math.PI * 0.75;

// ── Lighting ───────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(3, 4, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const floorGeo = new THREE.PlaneGeometry(10, 10);
const floorMat = new THREE.ShadowMaterial({ opacity: 0.2 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5;
floor.receiveShadow = true;
scene.add(floor);

// ── Loader ─────────────────────────────────────────────
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(dracoLoader);

let baseModel = null;
let currentGun = 'ak74';
const activeAccessories = {};
const selectedItems = {};

// ── Ціни (з синхронізацією) ─────────────────────────────
let accessoryPrices = {
  'holo_scope-v1':   { name: 'EOTech Holographic', price: 2800 },
  'acog_scope-v1':   { name: 'ACOG 4×32',           price: 3500 },
  'light_grip-v1':   { name: 'Light Grip',          price: 650  },
  'tactical_grip':   { name: 'Tactical Grip',       price: 850  },
  'stock_pt1':       { name: 'Приклад ПТ-1',        price: 1200 },
  'stock_aps_black': { name: 'APS Black',           price: 1500 },
  'flashlight-v1':   { name: 'Flashlight',          price: 750  },
  'laser-v1':        { name: 'Laser',               price: 950  },
  'mag_meh_120':     { name: 'Магазин 120 BBs',     price: 400  },
  'mag_bunk_500':    { name: 'Магазин 500 BBs',     price: 650  },
  'flash_hider-v1':  { name: 'Flash Hider',         price: 350  },
  'silencer-v1':     { name: 'Silencer',            price: 1100 },
};

async function syncPrices() {
  try {
    const res = await fetch('http://localhost:3000/api/items');
    if (res.ok) {
      const data = await res.json();
      data.forEach(i => { accessoryPrices[i.id] = { name: i.name, price: i.price }; });
    }
  } catch (e) { console.log("Використовуємо локальні ціни"); }
}
syncPrices();

const gunPrices = {
  'ak74': { name: 'AK-74', price: 8500 },
  'm4a1': { name: 'M4A1',  price: 9500 },
};

// ── Конфіг аксесуарів ──────────────────────────────────
const accessoryConfigs = {
  ak74: {
    'holo_scope-v1':   { pos: [0,  0.12,  0.05], rot: [0, 0, 0], scale: 1 },
    'acog_scope-v1':   { pos: [0,  0.12,  0.05], rot: [0, 0, 0], scale: 1 },
    'light_grip-v1':   { pos: [0, -0.05,  0.30], rot: [0, 0, 0], scale: 1 },
    'tactical_grip':   { pos: [0, -0.05,  0.30], rot: [0, 0, 0], scale: 1 },
    'stock_pt1':       { pos: [0,  0.00, -0.35], rot: [0, 0, 0], scale: 1 },
    'stock_aps_black': { pos: [0,  0.00, -0.35], rot: [0, 0, 0], scale: 1 },
    'flashlight-v1':   { pos: [0, -0.04,  0.15], rot: [0, 0, 0], scale: 1 },
    'laser-v1':        { pos: [0, -0.04,  0.15], rot: [0, 0, 0], scale: 1 },
    'mag_meh_120':     { pos: [0, -0.18,  0.05], rot: [0, 0, 0], scale: 1 },
    'mag_bunk_500':    { pos: [0, -0.18,  0.05], rot: [0, 0, 0], scale: 1 },
    'flash_hider-v1':  { pos: [0,  0.00,  0.50], rot: [0, 0, 0], scale: 1 },
    'silencer-v1':     { pos: [0,  0.00,  0.50], rot: [0, 0, 0], scale: 1 },
  },
  m4a1: {
    'holo_scope-v1':   { pos: [-0.4, 0.61, 0.01], rot: [0, Math.PI, 0], scale: 0.05 },
    'acog_scope-v1':   { pos: [-0.4, 0.41, 0.01], rot: [0, Math.PI, 0], scale: 7 },
    'light_grip-v1':   { pos: [0.85, 0.2,  0.008], rot: [0, ((Math.PI)/2)*Math.PI, 0], scale: 0.3 },
    'tactical_grip':   { pos: [0.85, -0.1, 0.008], rot: [0, 0, 0], scale: 0.3 },
    'stock_pt1':       { pos: [0,  0.00, -0.40], rot: [0, 0, 0], scale: 1 },
    'stock_aps_black': { pos: [0,  0.00, -0.40], rot: [0, 0, 0], scale: 1 },
    'flashlight-v1':   { pos: [1.850, -1.940, -0.400], rot: [(Math.PI)/2, 0, 0], scale: 6 },
    'laser-v1':        { pos: [0.850, 0.360, 0.100], rot: [((Math.PI)/2)*Math.PI, -(Math.PI)/2, Math.PI], scale: 6 },
    'mag_meh_120':     { pos: [0, -0.18,  0.00], rot: [0, 0, 0], scale: 1 },
    'mag_bunk_500':    { pos: [0, -0.18,  0.00], rot: [0, 0, 0], scale: 1 },
    'flash_hider-v1':  { pos: [2.4,  0.35, -0.1], rot: [0, ((Math.PI)/2)*Math.PI, 0], scale: 0.5 },
    'silencer-v1':     { pos: [0,  0.00,  0.5],   rot: [0, ((Math.PI)/4), 0], scale: 0.1 },
  },
};

// ── Завантаження моделей ───────────────────────────────
function loadBaseModel(src, label) {
  loadScreen.style.display = 'flex';
  loadScreen.style.opacity = '1';
  loadBar.style.width = '0%';
  loadText.textContent = 'Завантаження моделі...';
  if (baseModel) { scene.remove(baseModel); baseModel = null; }
  Object.keys(activeAccessories).forEach(cat => { if (activeAccessories[cat]) { scene.remove(activeAccessories[cat]); activeAccessories[cat] = null; } });

  loader.load(src, (gltf) => {
    baseModel = gltf.scene;
    baseModel.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    scene.add(baseModel);
    const box = new THREE.Box3().setFromObject(baseModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    baseModel.position.sub(center);
    floor.position.y = -size * 0.3;
    controls.target.set(0, 0, 0);
    camera.position.set(0, size * 0.15, size * 2.5);
    controls.update();
    if (label) gunLabel.textContent = label;
    loadScreen.style.opacity = '0';
    setTimeout(() => { loadScreen.style.display = 'none'; }, 600);
  });
}

function attachAccessory(category, accessoryFile) {
  if (activeAccessories[category]) scene.remove(activeAccessories[category]);
  loader.load(`acsses_models/${category}/${accessoryFile}.glb`, (gltf) => {
    const obj = gltf.scene;
    const cfg = accessoryConfigs[currentGun]?.[accessoryFile];
    if (cfg) { obj.position.set(...cfg.pos); obj.rotation.set(...cfg.rot); obj.scale.setScalar(cfg.scale); }
    scene.add(obj);
    activeAccessories[category] = obj;
  });
}

function detachAccessory(category) { if (activeAccessories[category]) { scene.remove(activeAccessories[category]); delete activeAccessories[category]; } }

function updateSummary() {
  const items = Object.values(selectedItems).filter(Boolean);
  summary.textContent = items.length > 0 ? `Обрано: ${items.join(', ')}` : 'Нічого не обрано';
}

// ── ОРИГІНАЛЬНЕ МОДАЛЬНЕ ВІКНО + DB ───────────────────
function openOrderModal() {
  const gun = gunPrices[currentGun];
  let total = gun.price;
  let itemsDB = [];

  let itemsHTML = `<div class="order-item"><span class="order-item-name">🔫 ${gun.name}</span><span class="order-item-price">${gun.price.toLocaleString()} грн</span></div>`;

  Object.keys(selectedItems).forEach(cat => {
    const card = document.querySelector(`.accessory-card.selected[data-category="${cat}"]`);
    if (card) {
      const key = card.dataset.accessory;
      const item = accessoryPrices[key];
      if (item) { total += item.price; itemsDB.push(item.name); itemsHTML += `<div class="order-item"><span class="order-item-name">• ${item.name}</span><span class="order-item-price">${item.price.toLocaleString()} грн</span></div>`; }
    }
  });

  itemsHTML += `<div class="order-total"><span>РАЗОМ</span><span>${total.toLocaleString()} грн</span></div>`;

  const modal = document.createElement('div');
  modal.id = 'order-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-box">
      <div class="modal-header"><div class="modal-title">TUNE<span>3D</span> — Замовлення</div><button class="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="order-summary"><h3>Ваша конфігурація</h3>${itemsHTML}</div>
        <div class="order-form">
          <h3>Контактні дані</h3>
          <div class="form-group"><label>Ім'я</label><input type="text" id="order-name" placeholder="Введіть ім'я" /></div>
          <div class="form-group"><label>Телефон</label><input type="tel" id="order-phone" placeholder="+380 XX XXX XX XX" /></div>
          <div class="form-group"><label>Email</label><input type="email" id="order-email" placeholder="your@email.com" /></div>
          <div class="form-group"><label>Коментар</label><textarea id="order-comment" placeholder="Додаткові побажання..."></textarea></div>
        </div>
      </div>
      <div class="modal-footer"><button class="modal-cancel">Скасувати</button><button class="modal-submit">Підтвердити замовлення →</button></div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 300); };
  modal.querySelector('.modal-backdrop').onclick = close;
  modal.querySelector('.modal-close').onclick = close;
  modal.querySelector('.modal-cancel').onclick = close;

  modal.querySelector('.modal-submit').onclick = async () => {
    const name = document.getElementById('order-name').value.trim();
    const phone = document.getElementById('order-phone').value.trim();
    if (!name || !phone) return alert('Будь ласка, заповніть ім\'я та телефон');

    const orderData = { customer: { name, phone, email: document.getElementById('order-email').value }, weapon: gun.name, items: itemsDB, totalPrice: total, comment: document.getElementById('order-comment').value };

    try {
      const res = await fetch('http://localhost:3000/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
      if (res.ok) {
        modal.querySelector('.modal-box').innerHTML = `<div class="modal-success"><div class="success-icon">✓</div><h2>Замовлення прийнято!</h2><p>Ми отримали вашу конфігурацію.</p><button class="modal-submit" style="margin-top:24px" onclick="location.reload()">Закрити</button></div>`;
      }
    } catch (e) { alert("Сервер вимкнено!"); }
  };
}

// ── РЕШТА КОДУ ────────────────────────────────────────
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });

document.querySelectorAll('.tab-btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); const cat = btn.dataset.category; document.querySelectorAll('.accessory-group').forEach(g => g.classList.toggle('active-group', g.dataset.category === cat)); }; });
document.querySelectorAll('.accessory-card').forEach(card => { card.onclick = () => { const file = card.dataset.accessory, cat = card.dataset.category, name = card.querySelector('.card-name').textContent; if (card.classList.contains('selected')) { card.classList.remove('selected'); detachAccessory(cat); delete selectedItems[cat]; } else { document.querySelectorAll(`.accessory-card[data-category="${cat}"]`).forEach(c => c.classList.remove('selected')); card.classList.add('selected'); attachAccessory(cat, file); selectedItems[cat] = name; } updateSummary(); }; });
document.querySelectorAll('.weapon-btn').forEach(btn => { btn.onclick = () => { if (btn.classList.contains('active')) return; document.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentGun = btn.dataset.gun; document.querySelectorAll('.accessory-card').forEach(c => c.classList.remove('selected')); for (let k in selectedItems) delete selectedItems[k]; updateSummary(); loadBaseModel(btn.dataset.src, btn.textContent); }; });

document.getElementById('order-btn').onclick = openOrderModal;
toggleBtn.onclick = () => panel.classList.toggle('collapsed');
loadBaseModel('ak-74__upgrade.glb', 'AK-74');