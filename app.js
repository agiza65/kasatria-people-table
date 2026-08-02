import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

/* =========================================================================
   1. GOOGLE SIGN-IN GATE
   ========================================================================= */
window.onload = () => {
  if (!window.google || !CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.startsWith("YOUR_")) {
    document.getElementById("login-error").textContent =
      "Google Sign-In isn't configured yet — add your OAuth Client ID in config.js.";
    return;
  }

  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: onSignIn
  });

  google.accounts.id.renderButton(
    document.getElementById("g_id_signin"),
    { theme: "outline", size: "large", text: "signin_with" }
  );
};

function decodeJwt(token) {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

function onSignIn(response) {
  const profile = decodeJwt(response.credential);
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("user-badge").textContent = `Signed in as ${profile.email}`;
  initApp();
}

/* =========================================================================
   2. DATA LOADING (Google Sheets API, falls back to local data.json)
   ========================================================================= */
async function loadData() {
  if (CONFIG.USE_GOOGLE_SHEETS) {
    try {
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}` +
        `/values/${encodeURIComponent(CONFIG.SHEET_RANGE)}?key=${CONFIG.GOOGLE_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Sheets API error ${res.status}`);
      const json = await res.json();
      const rows = json.values || [];
      if (!rows.length) throw new Error("Sheet returned no rows");
      return rows.map(r => ({
        name: r[0] || "",
        photo: r[1] || "",
        age: Number(r[2]) || 0,
        country: r[3] || "",
        interest: r[4] || "",
        netWorth: parseFloat(String(r[5]).replace(/[$,]/g, "")) || 0
      }));
    } catch (err) {
      console.warn("Falling back to local data.json —", err.message);
    }
  }
  const res = await fetch("data.json");
  return res.json();
}

/* =========================================================================
   3. THREE.JS CSS3D PERIODIC-TABLE VISUALIZATION
   (structure adapted from the official three.js css3d_periodictable example)
   ========================================================================= */
let camera, scene, renderer, controls;
let objects = [];
let targets = { table: [], sphere: [], helix: [], grid: [] };
let animFrame = null;

async function initApp() {
  if (renderer) return; // prevent double-init

  const people = await loadData();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 3000;

  scene = new THREE.Scene();

  people.forEach((person) => {
    const element = buildTileElement(person);
    const object = new CSS3DObject(element);
    object.position.x = Math.random() * 4000 - 2000;
    object.position.y = Math.random() * 4000 - 2000;
    object.position.z = Math.random() * 4000 - 2000;
    scene.add(object);
    objects.push(object);
  });

  buildTableTargets(people.length);   // 20 x 10
  buildSphereTargets(people.length);
  buildDoubleHelixTargets(people.length);
  buildGridTargets(people.length);    // 5 x 4 x 10

  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  document.getElementById("table").addEventListener("click", () => transform(targets.table, "table"));
  document.getElementById("sphere").addEventListener("click", () => transform(targets.sphere, "sphere"));
  document.getElementById("helix").addEventListener("click", () => transform(targets.helix, "helix"));
  document.getElementById("grid").addEventListener("click", () => transform(targets.grid, "grid"));

  transform(targets.table, "table");

  window.addEventListener("resize", onWindowResize);
  animate();
}

function buildTileElement(person) {
  const netWorth = person.netWorth;
  let colorClass = "red";
  if (netWorth > 200000) colorClass = "green";
  else if (netWorth > 100000) colorClass = "orange";

  const el = document.createElement("div");
  el.className = `element ${colorClass}`;

  const img = document.createElement("img");
  img.className = "photo";
  img.src = person.photo;
  img.onerror = () => { img.style.background = "#333"; img.removeAttribute("src"); };
  el.appendChild(img);

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = person.name;
  el.appendChild(name);

  const details = document.createElement("div");
  details.className = "details";
  details.textContent = `${person.age} · ${person.country} · ${person.interest}`;
  el.appendChild(details);

  const nw = document.createElement("div");
  nw.className = "networth";
  nw.textContent = `$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  el.appendChild(nw);

  return el;
}

/* ---- Layout 1: TABLE — 20 columns x 10 rows (requirement #7) ---- */
function buildTableTargets(count) {
  const COLS = 20, ROWS = 10;
  const spacingX = 140, spacingY = 180;
  for (let i = 0; i < count; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS) % ROWS;
    const target = new THREE.Object3D();
    target.position.x = col * spacingX - (COLS * spacingX) / 2 + spacingX / 2;
    target.position.y = -(row * spacingY) + (ROWS * spacingY) / 2 - spacingY / 2;
    target.position.z = 0;
    targets.table.push(target);
  }
}

/* ---- Layout 2: SPHERE — fibonacci sphere, faces point outward ---- */
function buildSphereTargets(count) {
  const vector = new THREE.Vector3();
  // Larger radius so ~200 tiles don't overlap as badly as r=800
  const radius = 1000;

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;

    const target = new THREE.Object3D();
    target.position.setFromSphericalCoords(radius, phi, theta);

    // Look outward from the sphere center (same as three.js example)
    vector.copy(target.position).multiplyScalar(2);
    target.lookAt(vector);

    targets.sphere.push(target);
  }
}

/* ---- Layout 3: DOUBLE HELIX (requirement #8) ----
   Two intertwined strands: even indices → strand A, odd → strand B,
   offset by 180° so they spiral around each other like DNA. ---- */
function buildDoubleHelixTargets(count) {
  const vector = new THREE.Vector3();
  const radius = 900;
  // Match three.js single-helix pitch density per strand item
  const angleStep = 0.175;
  const yStep = 8;
  const yOffset = 450;

  for (let i = 0; i < count; i++) {
    const strand = i % 2;             // 0 = strand A, 1 = strand B
    const step = Math.floor(i / 2);   // shared height index along the axis
    const theta = step * angleStep + Math.PI + strand * Math.PI;
    const y = -(step * yStep) + yOffset;

    const target = new THREE.Object3D();
    target.position.setFromCylindricalCoords(radius, theta, y);

    vector.x = target.position.x * 2;
    vector.y = target.position.y;
    vector.z = target.position.z * 2;
    target.lookAt(vector);

    targets.helix.push(target);
  }
}

/* ---- Layout 4: GRID — 5 x 4 x 10 (requirement #9) ---- */
function buildGridTargets(count) {
  const COLS = 5;
  const ROWS = 4;
  const spacingXY = 400;
  const spacingZ = 1000; // deep layers so the 10-deep stack reads clearly in 3D

  for (let i = 0; i < count; i++) {
    const target = new THREE.Object3D();
    const layer = Math.floor(i / (COLS * ROWS)); // 0 .. 9 for 200 items

    target.position.x = (i % COLS) * spacingXY - ((COLS - 1) * spacingXY) / 2;
    target.position.y = -(Math.floor(i / COLS) % ROWS) * spacingXY + ((ROWS - 1) * spacingXY) / 2;
    target.position.z = layer * spacingZ - ((10 - 1) * spacingZ) / 2;

    targets.grid.push(target);
  }
}

/* ---- Tween between layouts (rotation + position, cancel in-flight) ---- */
function transform(targetList, activeId) {
  document.querySelectorAll("#menu button").forEach(b => b.classList.remove("active"));
  document.getElementById(activeId).classList.add("active");

  if (animFrame !== null) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }

  const duration = 2000;
  const start = performance.now();

  const startStates = objects.map(o => ({
    pos: o.position.clone(),
    rot: o.rotation.clone()
  }));

  // Ensure target Euler rotations are synced from lookAt quaternions
  for (let i = 0; i < targetList.length; i++) {
    targetList[i].rotation.setFromQuaternion(targetList[i].quaternion);
  }

  function easeInOutExpo(t) {
    return t === 0 ? 0
      : t === 1 ? 1
      : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = easeInOutExpo(t);

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const from = startStates[i];
      const to = targetList[i];
      if (!to) continue;

      obj.position.x = from.pos.x + (to.position.x - from.pos.x) * e;
      obj.position.y = from.pos.y + (to.position.y - from.pos.y) * e;
      obj.position.z = from.pos.z + (to.position.z - from.pos.z) * e;

      obj.rotation.x = from.rot.x + (to.rotation.x - from.rot.x) * e;
      obj.rotation.y = from.rot.y + (to.rotation.y - from.rot.y) * e;
      obj.rotation.z = from.rot.z + (to.rotation.z - from.rot.z) * e;
    }
    render();

    if (t < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      animFrame = null;
    }
  }
  animFrame = requestAnimationFrame(step);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (controls && typeof controls.handleResize === "function") {
    controls.handleResize();
  }
  render();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}

// Expose to window for debugging/testing
window.onSignIn = onSignIn;
window.initApp = initApp;
window.transform = transform;
window.targets = targets;
window.objects = objects;
