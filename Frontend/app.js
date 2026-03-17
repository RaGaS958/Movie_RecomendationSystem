/* ══════════════════════════════════════════
   CINEMATRIX — app.js
   FastAPI · Three.js · GSAP · Framer-style
══════════════════════════════════════════ */

const API = "https://movie-recomendationsystem.onrender.com";  // FastAPI server address

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const state = {
  trendingCount: 5,
  topRatedCount: 5,
  discoverCount: 5,
  recommendCount: 5,
  activeGenre: null,
  genres: [],
};

/* ─────────────────────────────────────────
   THREE.JS — PARTICLE STARFIELD
───────────────────────────────────────── */
(function initThree() {
  const canvas = document.getElementById("bg-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 600;

  // Particles
  const COUNT = 1200;
  const positions = new Float32Array(COUNT * 3);
  const colors    = new Float32Array(COUNT * 3);
  const colorPalette = [
    new THREE.Color("#e50914"),
    new THREE.Color("#9b5de5"),
    new THREE.Color("#00d4ff"),
    new THREE.Color("#f5a623"),
    new THREE.Color("#ffffff"),
  ];

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 2400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1200;
    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);

  // Floating ring
  const ringGeo = new THREE.TorusGeometry(220, 0.8, 8, 120);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#e50914"),
    transparent: true,
    opacity: 0.12,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  scene.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(340, 0.5, 8, 120),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#9b5de5"), transparent: true, opacity: 0.07 })
  );
  ring2.rotation.x = -Math.PI / 4;
  ring2.rotation.y = Math.PI / 6;
  scene.add(ring2);

  let mouseX = 0, mouseY = 0, scrollY = 0;

  document.addEventListener("mousemove", e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener("scroll", () => { scrollY = window.scrollY; });

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.004;

    stars.rotation.y = t * 0.06 + mouseX * 0.04;
    stars.rotation.x = mouseY * 0.02 + scrollY * 0.00008;

    ring.rotation.z  = t * 0.12;
    ring2.rotation.z = -t * 0.08;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
})();

/* ─────────────────────────────────────────
   GSAP — HERO ENTRANCE
───────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

window.addEventListener("DOMContentLoaded", () => {
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, delay: 0.2 })
    .to(".ht-line", { opacity: 1, y: 0, stagger: 0.12, duration: 0.8 }, "-=0.4")
    .to(".hero-sub",  { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
    .to(".hero-cta",  { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
    .to(".hero-stats",{ opacity: 1, y: 0, duration: 0.5 }, "-=0.2");

  // Section reveals
  gsap.utils.toArray(".section").forEach(sec => {
    gsap.from(sec.querySelector(".section-header"), {
      scrollTrigger: { trigger: sec, start: "top 80%", once: true },
      opacity: 0, y: 30, duration: 0.7, ease: "power3.out"
    });
  });
});

/* ─────────────────────────────────────────
   NAV
───────────────────────────────────────── */
const navbar    = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navLinks  = document.getElementById("nav-links");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 30);
  updateActiveNavLink();
});

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  navLinks.classList.toggle("open");
});

function updateActiveNavLink() {
  const sections = ["hero","trending","top-rated","discover","recommend"];
  let current = "";
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 100) current = id;
  });
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.section === current);
  });
}

document.querySelectorAll(".nav-link").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    navLinks.classList.remove("open");
    hamburger.classList.remove("open");
    const target = document.querySelector(a.getAttribute("href"));
    if (target) gsap.to(window, { scrollTo: { y: target, offsetY: 70 }, duration: 1, ease: "power3.inOut" });
  });
});

document.getElementById("hero-explore-btn").addEventListener("click", () => {
  gsap.to(window, { scrollTo: { y: "#trending", offsetY: 70 }, duration: 1, ease: "power3.inOut" });
});
document.getElementById("hero-ai-btn").addEventListener("click", () => {
  gsap.to(window, { scrollTo: { y: "#recommend", offsetY: 70 }, duration: 1, ease: "power3.inOut" });
});

/* ─────────────────────────────────────────
   SEARCH OVERLAY
───────────────────────────────────────── */
const searchOverlay = document.getElementById("search-overlay");
const searchInput   = document.getElementById("search-input");
let searchTimer;

document.getElementById("open-search").addEventListener("click", openSearch);
document.getElementById("close-search").addEventListener("click", closeSearch);
searchOverlay.addEventListener("click", e => { if (e.target === searchOverlay) closeSearch(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSearch();
  if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && !searchOverlay.classList.contains("open")) {
    e.preventDefault(); openSearch();
  }
});

function openSearch() {
  searchOverlay.classList.add("open");
  setTimeout(() => searchInput.focus(), 100);
}
function closeSearch() {
  searchOverlay.classList.remove("open");
  searchInput.value = "";
  document.getElementById("search-results").innerHTML = "";
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { document.getElementById("search-results").innerHTML = ""; return; }
  searchTimer = setTimeout(() => performSearch(q), 280);
});

async function performSearch(q) {
  const grid = document.getElementById("search-results");
  grid.innerHTML = `<div class="loader-wrap"><div class="loader"></div></div>`;
  try {
    const data = await apiFetch(`/api/movies/search?q=${encodeURIComponent(q)}&limit=24`);
    grid.innerHTML = "";
    if (!data.movies?.length) {
      grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎬</span>No movies found for "${q}"</div>`;
      return;
    }
    data.movies.forEach((m, i) => {
      const card = createMovieCard(m, false);
      card.style.animationDelay = `${i * 0.04}s`;
      card.classList.add("card-in");
      card.addEventListener("click", () => { closeSearch(); openModal(m); });
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span>Search failed. Is the API running?</div>`;
  }
}

/* ─────────────────────────────────────────
   API HELPERS
───────────────────────────────────────── */
async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────
   STATS
───────────────────────────────────────── */
async function loadStats() {
  try {
    const s = await apiFetch("/api/stats");
    animateCounter("stat-total",  s.total_movies,  0);
    animateCounter("stat-rating", s.avg_rating,     1);
    document.getElementById("stat-top").textContent =
      s.top_rated ? s.top_rated.split(" ").slice(0, 2).join(" ") : "—";
  } catch { /* silent */ }
}

function animateCounter(id, target, decimals) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  const duration = 1400;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    const val = eased * target;
    el.textContent = val.toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(decimals);
  }
  requestAnimationFrame(step);
}

/* ─────────────────────────────────────────
   MOVIE CARD
───────────────────────────────────────── */
function createMovieCard(movie, showSim = false) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const hasImg = !!movie.poster_url;
  const genreTags = (movie.genres || []).slice(0, 2)
    .map(g => {
      const color = movie.genre_colors?.[g] || "#6c757d";
      return `<span class="card-genre-tag" style="background:${color}22;color:${color};border:1px solid ${color}44">${g}</span>`;
    }).join("");

  card.innerHTML = `
    ${showSim && movie.similarity_score !== undefined
      ? `<div class="sim-badge">${(movie.similarity_score * 100).toFixed(0)}% match</div>`
      : ""}
    ${hasImg
      ? `<img class="card-poster" src="${movie.poster_url}" alt="${escHtml(movie.title)}" loading="lazy" onerror="this.parentElement.querySelector('.card-poster-placeholder').style.display='flex';this.remove()" />`
      : ""}
    <div class="card-poster-placeholder" style="${hasImg ? "display:none" : ""}">
      <span class="placeholder-icon">🎬</span>
      <span class="placeholder-title">${escHtml(movie.title)}</span>
    </div>
    <div class="card-overlay">
      <div class="card-title">${escHtml(movie.title)}</div>
      <div class="card-meta">
        <span class="card-rating">★ ${movie.vote_average || "N/A"}</span>
        ${movie.release_year ? `<span class="card-year">${movie.release_year}</span>` : ""}
      </div>
      <div class="card-genres">${genreTags}</div>
    </div>
  `;

  card.addEventListener("click", () => openModal(movie));

  // 3D tilt
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `translateY(-8px) scale(1.02) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });

  return card;
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ─────────────────────────────────────────
   RENDER GRID WITH GSAP ENTRANCE
───────────────────────────────────────── */
function renderMovies(containerId, movies, showSim = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!movies?.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">🎬</span>No movies found</div>`;
    return;
  }

  const cards = movies.map(m => createMovieCard(m, showSim));
  cards.forEach(c => container.appendChild(c));

  gsap.from(cards, {
    opacity: 0,
    y: 30,
    scale: 0.95,
    stagger: 0.06,
    duration: 0.5,
    ease: "power3.out",
  });
}

function showLoader(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loader-wrap"><div class="loader"></div></div>`;
}

/* ─────────────────────────────────────────
   TRENDING
───────────────────────────────────────── */
async function loadTrending(n = state.trendingCount) {
  showLoader("trending-grid");
  try {
    const data = await apiFetch(`/api/movies/trending?n=${n}`);
    renderMovies("trending-grid", data.movies);
    toast("Trending loaded", "success");
  } catch (e) {
    showError("trending-grid", "Failed to load trending movies.");
    toast("Failed to load trending", "error");
  }
}

/* ─────────────────────────────────────────
   TOP RATED
───────────────────────────────────────── */
async function loadTopRated(n = state.topRatedCount) {
  showLoader("top-rated-grid");
  try {
    const data = await apiFetch(`/api/movies/top?n=${n}&sort_by=vote_average&min_rating=7.0`);
    renderMovies("top-rated-grid", data.movies);
  } catch {
    showError("top-rated-grid", "Failed to load top rated.");
  }
}

/* ─────────────────────────────────────────
   DISCOVER (genre)
───────────────────────────────────────── */
async function loadGenres() {
  try {
    const data = await apiFetch("/api/movies/genres");
    const featured = ["Action","Drama","Comedy","Thriller","Horror","Animation","Romance","Science Fiction","Adventure","Fantasy","Crime"];
    const pills = document.getElementById("genre-pills");
    pills.innerHTML = "";

    const common = data.genres.filter(g => featured.includes(g));
    state.genres = common.length > 0 ? common : data.genres.slice(0, 14);

    state.genres.forEach((g, i) => {
      const color = data.colors?.[g] || "#6c757d";
      const btn = document.createElement("button");
      btn.className = "genre-pill" + (i === 0 ? " active" : "");
      btn.textContent = g;
      btn.style.color = color;
      btn.style.borderColor = color + "44";
      btn.dataset.genre = g;
      btn.dataset.color = color;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".genre-pill").forEach(p => {
          p.classList.remove("active");
          p.style.background = "";
          p.style.boxShadow = "";
        });
        btn.classList.add("active");
        btn.style.background = color;
        btn.style.boxShadow = `0 4px 20px ${color}44`;
        state.activeGenre = g;
        loadDiscover(state.discoverCount, g);
      });
      pills.appendChild(btn);
    });

    if (state.genres.length > 0) {
      const firstColor = data.colors?.[state.genres[0]] || "#6c757d";
      const firstPill = pills.querySelector(".genre-pill");
      if (firstPill) {
        firstPill.style.background = firstColor;
        firstPill.style.boxShadow = `0 4px 20px ${firstColor}44`;
      }
      state.activeGenre = state.genres[0];
      loadDiscover(state.discoverCount, state.genres[0]);
    }
  } catch {
    toast("Couldn't load genres", "info");
  }
}

async function loadDiscover(n = state.discoverCount, genre = state.activeGenre) {
  showLoader("discover-grid");
  try {
    const g = genre ? `&genre=${encodeURIComponent(genre)}` : "";
    const data = await apiFetch(`/api/movies/top?n=${n}&sort_by=popularity${g}`);
    renderMovies("discover-grid", data.movies);
  } catch {
    showError("discover-grid", "Failed to load movies.");
  }
}

/* ─────────────────────────────────────────
   RECOMMEND
───────────────────────────────────────── */
const recInput = document.getElementById("rec-input");
const recBtn   = document.getElementById("rec-btn");
const aiSugg   = document.getElementById("ai-suggestions");
let recSearchTimer;

recInput.addEventListener("input", () => {
  clearTimeout(recSearchTimer);
  const q = recInput.value.trim();
  if (q.length < 2) { aiSugg.classList.remove("open"); return; }
  recSearchTimer = setTimeout(() => loadSuggestions(q), 300);
});

recInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { aiSugg.classList.remove("open"); doRecommend(); }
  if (e.key === "Escape") aiSugg.classList.remove("open");
});

document.addEventListener("click", e => {
  if (!recInput.contains(e.target) && !aiSugg.contains(e.target)) {
    aiSugg.classList.remove("open");
  }
});

async function loadSuggestions(q) {
  try {
    const data = await apiFetch(`/api/movies/search?q=${encodeURIComponent(q)}&limit=8`);
    aiSugg.innerHTML = "";
    if (!data.movies?.length) { aiSugg.classList.remove("open"); return; }
    data.movies.forEach(m => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = m.title;
      item.addEventListener("click", () => {
        recInput.value = m.title;
        aiSugg.classList.remove("open");
        doRecommend();
      });
      aiSugg.appendChild(item);
    });
    aiSugg.classList.add("open");
  } catch { aiSugg.classList.remove("open"); }
}

recBtn.addEventListener("click", doRecommend);

async function doRecommend() {
  const title = recInput.value.trim();
  if (!title) { toast("Please enter a movie title", "info"); return; }

  aiSugg.classList.remove("open");
  showLoader("recommend-grid");
  document.getElementById("rec-source").classList.add("hidden");

  const n = state.recommendCount;
  try {
    const data = await apiFetch(`/api/movies/recommend/${encodeURIComponent(title)}?n=${n}`);

    // Show source
    const src = document.getElementById("rec-source");
    src.classList.remove("hidden");
    src.innerHTML = `
      <div>
        <div class="rec-source-label">Because you searched for</div>
        <div class="rec-source-title">${escHtml(data.source_movie?.title || title)}</div>
      </div>
      <span style="color:var(--text-mute);font-size:13px;font-family:var(--font-mono)">${data.count} matches found</span>
    `;

    renderMovies("recommend-grid", data.recommendations, true);
    gsap.to(window, { scrollTo: { y: "#recommend-grid", offsetY: 80 }, duration: 0.8, ease: "power2.inOut" });
    toast(`${data.count} movies recommended!`, "success");
  } catch (e) {
    showError("recommend-grid", `Movie "${title}" not found. Try a different title.`);
    toast(`"${title}" not found in database`, "error");
  }
}

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
function openModal(movie) {
  const backdrop = document.getElementById("modal-backdrop");
  const content  = document.getElementById("modal-content");

  const genreBadges = (movie.genres || [])
    .map(g => {
      const color = movie.genre_colors?.[g] || "#6c757d";
      return `<span class="modal-genre-badge" style="background:${color}">${g}</span>`;
    }).join("");

  const imdbLink = movie.imdb_id
    ? `<a href="https://www.imdb.com/title/${movie.imdb_id}" target="_blank" rel="noopener" class="btn-ghost" style="font-size:13px;padding:10px 20px">
        ⭐ IMDb
       </a>`
    : "";

  const runtime = movie.runtime > 0
    ? `<span class="meta-chip">🕐 <strong>${movie.runtime} min</strong></span>` : "";
  const revenue = movie.revenue > 0
    ? `<span class="meta-chip">💰 <strong>$${(movie.revenue/1e6).toFixed(0)}M</strong></span>` : "";

  content.innerHTML = `
    <div class="modal-inner">
      ${movie.poster_url
        ? `<img class="modal-banner" src="${movie.poster_url}" alt="${escHtml(movie.title)}" loading="lazy" onerror="this.nextElementSibling.style.display='flex';this.remove()" />
           <div class="modal-banner-placeholder" style="display:none">🎬</div>`
        : `<div class="modal-banner-placeholder">🎬</div>`}
      <div class="modal-body">
        <h2 class="modal-title">${escHtml(movie.title)}</h2>
        ${movie.tagline ? `<p class="modal-tagline">"${escHtml(movie.tagline)}"</p>` : ""}
        <div class="modal-meta-row">
          <span class="meta-chip">★ <strong>${movie.vote_average}</strong></span>
          ${movie.vote_count ? `<span class="meta-chip">👥 <strong>${(movie.vote_count).toLocaleString()}</strong></span>` : ""}
          ${movie.release_year ? `<span class="meta-chip">📅 <strong>${movie.release_year}</strong></span>` : ""}
          ${runtime}
          ${revenue}
          ${movie.similarity_score !== undefined
            ? `<span class="meta-chip" style="color:var(--red)">🎯 <strong>${(movie.similarity_score*100).toFixed(0)}% match</strong></span>`
            : ""}
        </div>
        <div class="modal-genres">${genreBadges}</div>
        ${movie.overview ? `<p class="modal-overview">${escHtml(movie.overview)}</p>` : ""}
        <div class="modal-actions">
          <button class="btn-primary" onclick="doRecommendFrom('${escHtml(movie.title).replace(/'/g,"\\'")}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Find Similar
          </button>
          ${imdbLink}
        </div>
      </div>
    </div>
  `;

  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function doRecommendFrom(title) {
  closeModal();
  recInput.value = title;
  gsap.to(window, { scrollTo: { y: "#recommend", offsetY: 70 }, duration: 0.8, ease: "power2.inOut",
    onComplete: () => doRecommend()
  });
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", e => {
  if (e.target.id === "modal-backdrop") closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

/* ─────────────────────────────────────────
   COUNT TOGGLES
───────────────────────────────────────── */
document.querySelectorAll(".count-toggle").forEach(group => {
  group.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const n = parseInt(btn.dataset.count);
      const target = btn.dataset.target;

      gsap.from(btn, { scale: 0.8, duration: 0.3, ease: "back.out(2)" });

      if (target === "trending") { state.trendingCount = n; loadTrending(n); }
      else if (target === "top-rated") { state.topRatedCount = n; loadTopRated(n); }
      else if (target === "discover") { state.discoverCount = n; loadDiscover(n, state.activeGenre); }
      else if (target === "recommend") {
        state.recommendCount = n;
        if (recInput.value.trim()) doRecommend();
      }
    });
  });
});

/* ─────────────────────────────────────────
   TOAST — professional, no emojis
───────────────────────────────────────── */
const TOAST_ICONS = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

function toast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-msg">${message}</span>
  `;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add("hide");
    t.addEventListener("animationend", () => t.remove(), { once: true });
  }, 3000);
}

/* ─────────────────────────────────────────
   ERROR STATE
───────────────────────────────────────── */
function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span>${msg}</div>`;
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
async function init() {
  toast("Loading CineMatrix", "info");
  await Promise.all([
    loadStats(),
    loadTrending(5),
    loadTopRated(5),
    loadGenres(),
  ]);
}

init();
