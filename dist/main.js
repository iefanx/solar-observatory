import * as T from "three";
import { cameraOffset, placeLabels } from "./view-state.js";
import { keplerPosition } from "./orbital-math.js";
import { icon, hydrateIcons } from "./icons.js";
hydrateIcons();
import { GeoMoon, RotateVector, Rotation_EQJ_ECL } from "./vendor/astronomy.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
const $ = (s) => document.querySelector(s),
  rad = Math.PI / 180,
  TAU = Math.PI * 2;
let labelBlockers = [],
  lastBlockerUpdate = 0;
let viewportWidth = window.visualViewport?.width || innerWidth;
let viewportHeight = window.visualViewport?.height || innerHeight;
function syncViewport() {
  const view = window.visualViewport;
  viewportWidth = view?.width || innerWidth;
  viewportHeight = view?.height || innerHeight;
  document.documentElement.style.setProperty(
    "--app-height",
    `${viewportHeight}px`,
  );
  document.body.style.width = `${viewportWidth}px`;
  document.body.style.height = `${viewportHeight}px`;
  document.body.style.left = `${view?.offsetLeft || 0}px`;
  document.body.style.top = `${view?.offsetTop || 0}px`;
}
syncViewport();
let renderer;
try {
  renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true,
  });
} catch (error) {
  $("#loading").textContent =
    "3D graphics are unavailable. Enable WebGL or try another browser.";
  throw error;
}
renderer.setPixelRatio(
  Math.min(
    devicePixelRatio,
    matchMedia("(max-width: 800px)").matches ? 1.5 : 2,
  ),
);
renderer.setSize(viewportWidth, viewportHeight);
renderer.setClearColor(0x020405);
$("#universe").append(renderer.domElement);
renderer.domElement.setAttribute(
  "aria-label",
  "Solar system: drag to orbit, pinch or scroll to zoom",
);
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  $("#loading").hidden = false;
  $("#loading").textContent =
    "Graphics interrupted. Refresh the page to continue.";
  graphicsLost = true;
  paused = true;
  $("#play").innerHTML = icon("play");
  $("#play").setAttribute("aria-label", "Play simulation");
});
renderer.domElement.addEventListener("webglcontextrestored", () => {
  graphicsLost = false;
  $("#loading").hidden = true;
});
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(
    48,
    viewportWidth / viewportHeight,
    0.000001,
    3000,
  );
camera.up.set(0, 0, 1);
camera.position.set(0, -7.5, 5.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.06;
controls.maxDistance = 150;
controls.target.set(0.35, 0, 0);
controls.addEventListener("start", () => {
  cameraTransition = null;
});
const loader = new T.TextureLoader();
let skyMesh = null;
loader.load("./assets/milky-way.jpg", (tex) => {
  tex.colorSpace = T.SRGBColorSpace;
  const sky = new T.Mesh(
    new T.SphereGeometry(700, 48, 32),
    new T.MeshBasicMaterial({
      map: tex,
      side: T.BackSide,
      color: 0x777777,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sky.renderOrder = -1000;
  sky.rotation.set(Math.PI / 2, 0.2, 1);
  sky.visible = $("#sky").checked;
  scene.add(sky);
  sky.position.copy(camera.position);
  skyMesh = sky;
  $("#sky").onchange = (e) => (sky.visible = e.target.checked);
});
let jd = Date.now() / 86400000 + 2440587.5,
  paused = false,
  speed = 30,
  selected = null,
  tab = "planets",
  lastTrackedPosition = null,
  cameraTransition = null,
  graphicsLost = false;
const planets = [
  [
    "Mercury",
    0.38709927,
    0.20563593,
    7.00497902,
    48.33076593,
    29.12703,
    174.792527,
    87.969,
    "#b8a5d8",
    2440,
  ],
  [
    "Venus",
    0.72333566,
    0.00677672,
    3.39467605,
    76.67984,
    54.92262,
    50.37663,
    224.701,
    "#e4b06e",
    6052,
  ],
  [
    "Earth",
    1.00000261,
    0.01671123,
    0,
    348.73936,
    114.20783,
    -2.47311,
    365.256,
    "#64bddb",
    6371,
  ],
  [
    "Mars",
    1.52371034,
    0.0933941,
    1.84969,
    49.55954,
    -73.50317,
    19.39019,
    686.98,
    "#ce7565",
    3390,
  ],
  [
    "Jupiter",
    5.202887,
    0.04838624,
    1.3044,
    100.47391,
    -85.74543,
    19.66796,
    4332.589,
    "#d1a77c",
    69911,
  ],
  [
    "Saturn",
    9.53667594,
    0.05386179,
    2.48599,
    113.66242,
    -21.06355,
    317.35537,
    10759.22,
    "#d8c495",
    58232,
  ],
  [
    "Uranus",
    19.18916464,
    0.04725744,
    0.77264,
    74.01693,
    96.93735,
    142.28383,
    30688.5,
    "#8dced1",
    25362,
  ],
  [
    "Neptune",
    30.06992276,
    0.00859048,
    1.77004,
    131.78423,
    -86.81946,
    259.91521,
    60182,
    "#678edb",
    24622,
  ],
].map(([name, a, e, i, om, w, ma, per, color, radius]) => ({
  name,
  full_name: name,
  a,
  e,
  i,
  om,
  w,
  ma,
  per,
  color,
  radius,
  epoch: 2451545,
  planet: true,
}));
const earth = planets.find((p) => p.name === "Earth");
const moon = {
  name: "Moon",
  full_name: "Moon",
  moon: true,
  a: 0.00256956,
  e: 0.0549,
  i: 5.145,
  per: 27.321661,
  color: "#c6c9cf",
  radius: 1737.4,
};
const bodies = [...planets, moon];
const lunarRotation = Rotation_EQJ_ECL();
let lunarDate = NaN,
  lunarOffset = new T.Vector3();
function moonOffset(j) {
  if (j !== lunarDate) {
    const v = RotateVector(lunarRotation, GeoMoon(j - 2451545));
    lunarOffset.set(v.x, v.y, v.z);
    lunarDate = j;
  }
  return lunarOffset.clone();
}
function pos(o, j = jd, anomaly) {
  if (o.moon) return pos(earth, j).add(moonOffset(j));
  return new T.Vector3(...keplerPosition(o, j, anomaly));
}
const orbitGroup = new T.Group();
scene.add(orbitGroup);
function orbit(o, color, opacity = 0.3) {
  const pts = Array.from({ length: 361 }, (_, i) =>
    pos(o, jd, (i / 360) * TAU),
  );
  const line = new T.Line(
    new T.BufferGeometry().setFromPoints(pts),
    new T.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  orbitGroup.add(line);
  return line;
}
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"),
    g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.06, "#fff");
  g.addColorStop(0.16, "#ffffffae");
  g.addColorStop(0.35, "#ffffff25");
  g.addColorStop(1, "#ffffff00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}
const glow = glowTexture();
function sprite(color, size) {
  const s = new T.Sprite(
    new T.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  s.scale.setScalar(size);
  scene.add(s);
  return s;
}
const sun = sprite("#fff0c0", 0.38),
  halo = sprite("#ffb73c", 0.8);
scene.add(
  new T.Mesh(
    new T.SphereGeometry(0.027, 32, 24),
    new T.MeshBasicMaterial({ color: 0xfff5d4 }),
  ),
);
scene.add(new T.PointLight(0xffffff, 2.5, 0, 0));
scene.add(new T.AmbientLight(0xffffff, 0.16));
for (const p of bodies) {
  if (!p.moon) p.line = orbit(p, p.color, 0.35);
  p.sprite = sprite(p.color, 0.1);
  p.mesh = new T.Mesh(
    new T.SphereGeometry(Math.max(0.007, (p.radius / 6371) * 0.006), 32, 24),
    new T.MeshStandardMaterial({ color: p.color, roughness: 1 }),
  );
  p.mesh.geometry.rotateX(Math.PI / 2);
  if (p === earth || p.moon) {
    const texture = loader.load(
      p.moon ? "./assets/moon.jpg" : "./assets/earth.jpg",
      undefined,
      undefined,
      () => {
        p.mesh.material.map = null;
        p.mesh.material.color.set(p.color);
        p.mesh.material.needsUpdate = true;
      },
    );
    texture.colorSpace = T.SRGBColorSpace;
    p.mesh.material.map = texture;
    p.mesh.material.color.set(0xffffff);
    p.mesh.material.needsUpdate = true;
  }
  scene.add(p.mesh);
  if (p.name === "Saturn") {
    const ring = new T.Mesh(
      new T.RingGeometry(0.075, 0.125, 64),
      new T.MeshBasicMaterial({
        color: p.color,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.5,
      }),
    );
    ring.rotation.x = 0.4;
    p.mesh.add(ring);
  }
  p.label = document.createElement("div");
  p.label.className = "label";
  p.label.textContent = p.name;
  $("#labels-layer").append(p.label);
  p.labelWidth = p.label.offsetWidth;
}
const lunarTrackPositions = new Float32Array(65 * 3);
const lunarTrackGeometry = new T.BufferGeometry();
lunarTrackGeometry.setAttribute(
  "position",
  new T.BufferAttribute(lunarTrackPositions, 3),
);
const lunarOrbit = new T.Line(
  lunarTrackGeometry,
  new T.LineBasicMaterial({
    color: 0xb0bacd,
    transparent: true,
    opacity: 0.38,
  }),
);
lunarOrbit.frustumCulled = false;
orbitGroup.add(lunarOrbit);
let lunarOrbitDay = -Infinity,
  lunarOrbitRefresh = -Infinity;
let data = [];
let cloud, selectedOrbit;
const marker = new T.Mesh(
  new T.RingGeometry(0.027, 0.029, 64),
  new T.MeshBasicMaterial({
    color: 0xcbead6,
    side: T.DoubleSide,
    depthTest: false,
  }),
);
marker.visible = false;
scene.add(marker);
try {
  data = (
    await (
      await fetch("./assets/asteroids.json", {
        signal: AbortSignal.timeout(10000),
      })
    ).json()
  )
    .filter(
      (o) =>
        ["a", "e", "i", "om", "w", "ma", "epoch", "per"].every((k) =>
          Number.isFinite(o[k]),
        ) &&
        o.a > 0 &&
        o.e >= 0 &&
        o.e < 1 &&
        o.per > 0,
    )
    .map((o) => ({
      ...o,
      name: o.name || o.full_name,
      color: "#ffffff",
      searchName: (o.full_name || "").toLowerCase(),
    }));
  const n = data.length,
    g = new T.BufferGeometry();
  g.setAttribute(
    "position",
    new T.Float32BufferAttribute(new Float32Array(n * 3), 3),
  );
  for (const [key, fn] of Object.entries({
    orb0: (o) => [o.a, o.e, o.i * rad, o.om * rad],
    orb1: (o) => [o.w * rad, o.ma * rad, TAU / o.per, o.epoch - 2451545],
    tint: (o, i) => {
      const c = new T.Color(i < 20 ? "#d4d57e" : "#bfc0cb");
      return [c.r, c.g, c.b, i < 20 ? 14 : 3.5 + (i % 7) * 0.65];
    },
  })) {
    g.setAttribute(key, new T.Float32BufferAttribute(data.flatMap(fn), 4));
  }
  const mat = new T.ShaderMaterial({
    uniforms: {
      days: { value: jd - 2451545 },
      brightness: { value: 1 },
      pixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 orb0;attribute vec4 orb1;attribute vec4 tint;uniform float days;uniform float pixelRatio;varying vec3 color;varying float visibility;void main(){float a=orb0.x,e=orb0.y,i=orb0.z,o=orb0.w,w=orb1.x;float M=mod(orb1.y+orb1.z*(days-orb1.w)+3.141592654,6.283185307)-3.141592654;float E=M+.85*e*(M<0.?-1.:1.);for(int k=0;k<12;k++){E-=(E-e*sin(E)-M)/(1.-e*cos(E));}float v=2.*atan(sqrt(1.+e)*sin(E/2.),sqrt(1.-e)*cos(E/2.));float r=a*(1.-e*cos(E));float c=cos(v+w),s=sin(v+w);vec3 p=r*vec3(cos(o)*c-sin(o)*s*cos(i),sin(o)*c+cos(o)*s*cos(i),s*sin(i));vec4 viewPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*viewPosition;float attenuation=min(1.,8./max(8.,-viewPosition.z));float pointSize=tint.w*pixelRatio*attenuation;gl_PointSize=max(1.,pointSize);visibility=attenuation*min(1.,pointSize*pointSize);color=tint.rgb;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
varying vec3 color;varying float visibility;uniform float brightness;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=exp(-d*d*9.)*.65+exp(-d*d*80.)*.6;
#include <logdepthbuf_fragment>
gl_FragColor=vec4(color,a*brightness*visibility);}`,
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  cloud = new T.Points(g, mat);
  cloud.frustumCulled = false;
  scene.add(cloud);
  $("#count").textContent = `${n.toLocaleString()} real asteroid orbits loaded`;
  $("#brightness").oninput = (e) =>
    (mat.uniforms.brightness.value = +e.target.value);
  $("#asteroids").onchange = (e) => (cloud.visible = e.target.checked);
} catch (e) {
  $("#count").textContent = "Asteroid catalogue unavailable";
  console.error(e);
}
$("#loading").hidden = true;
function choose(o) {
  cameraTransition = null;
  controls.minDistance = o
    ? Math.max(0.000045, ((o.radius || 0) / 149597870.7) * 1.4)
    : 0.06;
  selected = o;
  lastTrackedPosition = o ? pos(o) : null;
  $("#focus-name").textContent = o ? o.name : "Solar system";
  $("#view-kind").textContent = o
    ? "TRACKING " + (o.moon ? "MOON" : o.planet ? "PLANET" : "ASTEROID")
    : "HELIOCENTRIC VIEW";
  setDetails(false);
  if (selectedOrbit) {
    orbitGroup.remove(selectedOrbit);
    selectedOrbit.geometry.dispose();
    selectedOrbit.material.dispose();
    selectedOrbit = null;
  }
  marker.visible = false;
  if (o) {
    if (!o.planet && !o.moon) selectedOrbit = orbit(o, "#c8dd96", 0.7);
    // Flush old damping before starting a new focus so it cannot fight the camera.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    const v = pos(o),
      oldTarget = controls.target.clone();
    if (o === earth || o === moon) {
      const distance = o.moon ? 0.00015 : 0.00042;
      cameraTransition = {
        start: performance.now(),
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 850,
        from: camera.position.clone().sub(v).toArray(),
        to: [0, -distance, distance * 0.35],
        targetFrom: oldTarget.sub(v).toArray(),
      };
      if (o === earth) {
        speed = 1;
        $("#speed").textContent = "1 day / sec";
      }
    } else {
      controls.target.copy(v);
      controls.update();
    }
    if (matchMedia("(max-width: 800px)").matches) setExplore(false);
  }
  buildDetails();
  renderList();
}
function buildDetails() {
  const o = selected,
    panel = $("#details");
  panel.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = o ? o.full_name : "Solar system";
  panel.append(title);
  const type = document.createElement("p");
  type.className = "detail-caption";
  type.textContent = o
    ? o.moon
      ? "Earth’s natural satellite"
      : o.planet
        ? "Planet · J2000 orbital model"
        : "Asteroid · local catalogue"
    : "Eight planets, one Moon, and 14,999 asteroid orbits.";
  panel.append(type);
  if (o) {
    const rows = [
      [
        "Semi-major axis",
        o.moon ? "384,400 km (mean)" : o.a.toFixed(4) + " AU",
      ],
      [
        "Orbital period",
        o.moon ? "27.32 days" : (o.per / 365.256).toFixed(2) + " years",
      ],
      ["Eccentricity", o.e.toFixed(4)],
      ["Inclination", o.i.toFixed(2) + "°"],
    ];
    if (o.radius) rows.push(["Mean radius", o.radius.toLocaleString() + " km"]);
    if (o.spec) rows.push(["Spectral type", String(o.spec)]);
    const dl = document.createElement("dl");
    for (const [label, value] of rows) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    }
    panel.append(dl);
    const live = document.createElement("p");
    live.id = "live-distance";
    live.className = "detail-caption";
    panel.append(live);
    const actions = document.createElement("div");
    actions.className = "panel-actions";
    if (o === earth || o === moon) {
      const system = document.createElement("button");
      system.id = "system-view";
      system.innerHTML = icon("orbit") + "Earth–Moon view";
      system.onclick = () => {
        cameraTransition = null;
        const current = pos(o);
        camera.position.copy(current).add(new T.Vector3(0, -0.012, 0.008));
        controls.target.copy(current);
        setDetails(false);
      };
      actions.append(system);
    }
    const stop = document.createElement("button");
    stop.id = "unfollow";
    stop.innerHTML = icon("close") + "Stop tracking";
    stop.onclick = reset;
    actions.append(stop);
    panel.append(actions);
  } else {
    const note = document.createElement("p");
    note.className = "detail-caption";
    note.textContent =
      "Select an object in Explore to follow its orbit. Overview markers are enlarged for visibility.";
    panel.append(note);
  }
}
function setDetails(open) {
  lastBlockerUpdate = 0;
  $("#details").hidden = !open;
  $("#focus-toggle").setAttribute("aria-expanded", String(open));
  if (open) {
    setControls(false);
    if (matchMedia("(max-width: 800px)").matches) setExplore(false);
  }
}
function setControls(open) {
  lastBlockerUpdate = 0;
  $("#control-panel").hidden = !open;
  $("#settings").setAttribute("aria-expanded", String(open));
  if (open) {
    setDetails(false);
    if (matchMedia("(max-width: 800px)").matches) setExplore(false);
  }
}
$("#focus-toggle").onclick = () => setDetails($("#details").hidden);
buildDetails();

function renderList() {
  const q = $("#search").value.toLowerCase(),
    list = q
      ? [...bodies, ...data].filter((o) =>
          (o.searchName || o.full_name.toLowerCase()).includes(q),
        )
      : tab === "planets"
        ? bodies
        : data;
  $("#objects").replaceChildren();
  if (!q && tab === "planets") {
    const b = document.createElement("button");
    b.className = "object" + (!selected ? " active" : "");
    b.innerHTML = `<span class="dot" style="--color:#ffdb8c"></span><span class="name">Sun<small>Center of our solar system</small></span><span class="distance">${icon("sun")}</span>`;
    b.onclick = () => {
      choose(null);
      reset();
    };
    $("#objects").append(b);
  }
  for (const o of list.slice(0, 60)) {
    const b = document.createElement("button");
    b.className = "object" + (selected === o ? " active" : "");
    b.innerHTML = `<span class="dot" style="--color:${o.color}"></span><span class="name"></span><span class="distance">${o.moon ? "Earth’s moon" : o.a.toFixed(2) + " AU"}</span>`;
    b.querySelector(".name").textContent = o.name;
    b.onclick = () => choose(o);
    $("#objects").append(b);
  }
  if (!list.length) $("#objects").textContent = "No objects found";
  $("#result-summary").textContent =
    list.length > 60
      ? `Showing 60 of ${list.length.toLocaleString()} · refine your search`
      : "";
}
renderList();
const exploreButton = $("#explore-toggle");
function setExplore(open) {
  lastBlockerUpdate = 0;
  document.body.classList.toggle("explore-closed", !open);
  $("#catalog").inert = !open;
  exploreButton.setAttribute("aria-expanded", String(open));
  exploreButton.innerHTML =
    icon(open ? "close" : "menu") + "<span>Explore</span>";
  if (open) {
    setControls(false);
    setDetails(false);
  }
}
setExplore(!matchMedia("(max-width: 800px)").matches);
exploreButton.onclick = () => {
  setExplore(document.body.classList.contains("explore-closed"));
};
let searchTimer;
$("#search").oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderList, 100);
};
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      document
        .querySelectorAll("[data-tab]")
        .forEach(
          (x) => (
            x.classList.toggle("active", x === b),
            x.setAttribute("aria-pressed", String(x === b))
          ),
        );
      renderList();
    }),
);
$("#settings").onclick = () => setControls($("#control-panel").hidden);
$("#orbits").onchange = (e) => (orbitGroup.visible = e.target.checked);
$("#labels").onchange = (e) => ($("#labels-layer").hidden = !e.target.checked);
function reset() {
  cameraTransition = null;
  choose(null);
  camera.position.set(0, -7.5, 5.2);
  controls.target.set(0.35, 0, 0);
  controls.addEventListener("start", () => {
    cameraTransition = null;
  });
  controls.update();
}
$("#home").onclick = reset;
$("#reset").onclick = reset;
$("#top").onclick = () => {
  cameraTransition = null;
  choose(null);
  camera.position.set(0, -0.001, 9);
  controls.target.set(0, 0, 0);
};
function zoom(factor) {
  cameraTransition = null;
  const offset = camera.position.clone().sub(controls.target);
  offset.setLength(
    T.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    ),
  );
  camera.position.copy(controls.target).add(offset);
  controls.update();
}
$("#zoom-in").onclick = () => zoom(0.7);
$("#zoom-out").onclick = () => zoom(1.4);
$("#fullscreen").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
};
if (!document.fullscreenEnabled) $("#fullscreen").hidden = true;
document.addEventListener("fullscreenchange", () =>
  $("#fullscreen").setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  ),
);
$("#play").onclick = () => {
  paused = !paused;
  $("#play").innerHTML = icon(paused ? "play" : "pause");
  $("#play").setAttribute(
    "aria-label",
    paused ? "Play simulation" : "Pause simulation",
  );
};
const speeds = [0.1, 1, 10, 30, 100, 365, 3650];
function setSpeed(d) {
  speed =
    speeds[Math.max(0, Math.min(speeds.length - 1, speeds.indexOf(speed) + d))];
  $("#speed").textContent = `${speed} ${speed === 1 ? "day" : "days"} / sec`;
}
$("#slower").onclick = () => setSpeed(-1);
$("#faster").onclick = () => setSpeed(1);
$("#speed").onclick = () =>
  setSpeed(speeds.indexOf(speed) === speeds.length - 1 ? -6 : 1);
$("#now").onclick = () => (jd = Date.now() / 86400000 + 2440587.5);
$("#date").onchange = (e) => {
  const t = Date.parse(e.target.value);
  if (
    Number.isFinite(t) &&
    t >= Date.parse("1800-01-01") &&
    t <= Date.parse("2200-12-31")
  )
    jd = t / 86400000 + 2440587.5;
};
let returnFocus;
function closeAbout() {
  $("#modal").hidden = true;
  returnFocus?.focus();
}
$("#about").onclick = () => {
  returnFocus = document.activeElement;
  $("#modal").hidden = false;
  $("#close-modal").focus();
};
$("#close-modal").onclick = closeAbout;
$("#modal").onclick = (e) => {
  if (e.target === $("#modal")) closeAbout();
};
addEventListener("keydown", (e) => {
  if (!$("#modal").hidden) {
    if (e.key === "Escape") {
      closeAbout();
      return;
    }
    if (e.key === "Tab") {
      const nodes = [...$("#modal").querySelectorAll("button,a[href]")],
        first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (e.key === "Escape") {
    setExplore(false);
    setDetails(false);
    setControls(false);
    return;
  }
  if (e.target.matches("input,select,textarea")) return;
  if (e.key === "/") {
    e.preventDefault();
    setExplore(true);
    $("#search").focus();
  }
  if (e.code === "Space" && e.target.tagName !== "BUTTON") {
    e.preventDefault();
    $("#play").click();
  }
  if (e.key === "Escape") {
    setExplore(false);
    setDetails(false);
    setControls(false);
  }
  if (e.key === "f") $("#fullscreen").click();
});
let down;
const pointers = new Set();
renderer.domElement.addEventListener("pointerdown", (e) => {
  setDetails(false);
  setControls(false);
  cameraTransition = null;
  pointers.add(e.pointerId);
  down = pointers.size === 1 ? [e.clientX, e.clientY] : null;
});
renderer.domElement.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
  down = null;
});
renderer.domElement.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  if (
    e.button !== 0 ||
    !down ||
    Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5
  )
    return;
  let best = null,
    dist = 18;
  for (const p of bodies) {
    const v = pos(p).project(camera),
      d = Math.hypot(
        ((v.x + 1) * viewportWidth) / 2 -
          (e.clientX - renderer.domElement.getBoundingClientRect().left),
        ((1 - v.y) * viewportHeight) / 2 -
          (e.clientY - renderer.domElement.getBoundingClientRect().top),
      );
    if (v.z < 1 && d < dist) {
      best = p;
      dist = d;
    }
  }
  down = null;
  if (best) choose(best);
});
function resizeViewport() {
  syncViewport();
  lastBlockerUpdate = 0;
  camera.aspect = viewportWidth / viewportHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth <= 800 ? 1.5 : 2),
  );
  renderer.setSize(viewportWidth, viewportHeight);
  if (cloud)
    cloud.material.uniforms.pixelRatio.value = renderer.getPixelRatio();
}
addEventListener("resize", resizeViewport);
window.visualViewport?.addEventListener("resize", resizeViewport);
window.visualViewport?.addEventListener("scroll", syncViewport);

let last = performance.now(),
  lastDetailUpdate = 0,
  lastDate = "";
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (document.hidden || graphicsLost) return;
  controls.dampingFactor = 1 - Math.exp(-3.7 * dt);
  if (!paused) jd = Math.min(2524957.5, jd + dt * speed);
  if (selected) {
    const v = pos(selected);
    const delta = v.clone().sub(lastTrackedPosition || v);
    camera.position.add(delta);
    controls.target.add(delta);
    lastTrackedPosition = v.clone();
    marker.position.copy(v);
    marker.quaternion.copy(camera.quaternion);
    marker.scale.setScalar(camera.position.distanceTo(v) * 0.16);
    marker.visible =
      !(selected === earth || selected.moon) ||
      camera.position.distanceTo(v) > 0.003;
  }
  if (cameraTransition && selected) {
    const t = cameraTransition.duration
      ? Math.min(1, (now - cameraTransition.start) / cameraTransition.duration)
      : 1;
    const center = pos(selected),
      offset = cameraOffset(cameraTransition.from, cameraTransition.to, t),
      ease = t * t * (3 - 2 * t);
    camera.position.copy(center).add(new T.Vector3(...offset));
    controls.target
      .copy(center)
      .add(
        new T.Vector3(...cameraTransition.targetFrom).multiplyScalar(
          Math.pow(1 - ease, 6),
        ),
      );
    if (t >= 1) cameraTransition = null;
  }
  controls.update();
  const nearPlane = Math.max(
    0.0000001,
    Math.min(0.01, camera.position.distanceTo(controls.target) * 0.0001),
  );
  if (Math.abs(camera.near - nearPlane) > nearPlane * 0.05) {
    camera.near = nearPlane;
    camera.updateProjectionMatrix();
  }
  const labelCandidates = [];
  const earthMoonSelected = selected === earth || selected === moon;
  const localScaleBlend = earthMoonSelected
    ? 1 -
      T.MathUtils.smoothstep(
        camera.position.distanceTo(controls.target),
        0.015,
        0.06,
      )
    : 0;
  if (cloud) cloud.material.uniforms.days.value = jd - 2451545;
  for (const p of bodies) {
    const v = pos(p);
    p.sprite.position.copy(v);
    p.mesh.position.copy(v);
    const distance = camera.position.distanceTo(v),
      base = Math.max(0.007, (p.radius / 6371) * 0.006),
      actual = p.radius / 149597870.7;
    const blend = p === earth || p === moon ? localScaleBlend : 0;
    const visualRadius = T.MathUtils.lerp(
      Math.max(actual, Math.min(base, distance * 0.009)),
      actual,
      blend,
    );
    p.mesh.scale.setScalar(visualRadius / base);
    p.sprite.scale.setScalar(Math.min(p.moon ? 0.012 : 0.1, distance * 0.04));
    p.sprite.material.opacity = 1 - blend;
    p.sprite.visible = blend < 0.999;
    if (p === earth) {
      p.mesh.rotation.z = (((jd - 2451545) / 0.99726968) * TAU) % TAU;
    } else if (p.moon) {
      const offset = moonOffset(jd);
      p.mesh.rotation.z = Math.atan2(-offset.y, -offset.x);
    } else if (!paused) {
      p.mesh.rotation.z += dt * 0.15;
    }
    const projected = v.clone().project(camera);
    p.label.hidden = true;
    if (
      $("#labels").checked &&
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 1 &&
      Math.abs(projected.y) < 1 &&
      (!p.moon || distance < 0.12)
    ) {
      const radiusPixels =
        ((visualRadius / Math.max(distance, 1e-9)) * viewportHeight) /
        (2 * Math.tan((camera.fov * Math.PI) / 360));
      const x =
          ((projected.x + 1) * viewportWidth) / 2 +
          Math.min(radiusPixels + 8, viewportWidth * 0.3),
        y = ((1 - projected.y) * viewportHeight) / 2 - 6;
      labelCandidates.push({
        id: p.name,
        x,
        y,
        width: p.labelWidth || p.name.length * 6 + 22,
        height: 13,
        priority: selected === p ? 100 : p.moon ? 50 : p === earth ? 40 : 10,
        order: bodies.indexOf(p),
        element: p.label,
      });
    }
  }
  if (now - lastBlockerUpdate > 200) {
    const root = document.body.getBoundingClientRect();
    labelBlockers = [
      ...document.querySelectorAll(
        "header,footer,.view-meta,#catalog,#control-panel",
      ),
    ]
      .filter(
        (el) => !el.hidden && getComputedStyle(el).visibility !== "hidden",
      )
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - root.left,
          y: r.top - root.top,
          width: r.width,
          height: r.height,
        };
      });
    lastBlockerUpdate = now;
  }
  for (const label of placeLabels(
    labelCandidates,
    viewportWidth,
    viewportHeight,
    labelBlockers,
  )) {
    label.element.hidden = false;
    label.element.style.transform = `translate(${label.x}px,${label.y}px)`;
  }

  const earthPosition = pos(earth);
  lunarOrbit.position.copy(earthPosition);
  lunarOrbit.visible = camera.position.distanceTo(earthPosition) < 0.3;
  if (
    lunarOrbit.visible &&
    Math.abs(jd - lunarOrbitDay) > 0.5 &&
    now - lunarOrbitRefresh > 300
  ) {
    for (let k = 0; k < 65; k++) {
      const point = moonOffset(jd + (k / 64) * 27.321661);
      point.toArray(lunarTrackPositions, k * 3);
    }
    lunarTrackGeometry.attributes.position.needsUpdate = true;
    lunarOrbitDay = jd;
    lunarOrbitRefresh = now;
  }
  if (now - lastDetailUpdate > 250) {
    const date = new Date((jd - 2440587.5) * 86400000)
      .toISOString()
      .slice(0, 10);
    if (date !== lastDate && document.activeElement !== $("#date")) {
      $("#date").value = date;
      lastDate = date;
    }
    if (selected && !$("#details").hidden) {
      const distance = selected.moon
        ? moonOffset(jd).length() * 149597870.7
        : pos(selected).length();
      $("#live-distance").textContent = selected.moon
        ? `Earth distance · ${Math.round(distance).toLocaleString()} km`
        : `Sun distance · ${distance.toFixed(4)} AU`;
    }
    lastDetailUpdate = now;
  }
  if (skyMesh) skyMesh.position.copy(camera.position);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

addEventListener("visibilitychange", () => {
  last = performance.now();
  pointers.clear();
  down = null;
});
