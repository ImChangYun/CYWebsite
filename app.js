const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

async function loadProjects() {
  const res = await fetch('projects.json');
  if (!res.ok) throw new Error('Failed to load projects.json');
  return res.json();
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  });
  children.forEach(c =>
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  );
  return n;
}

function qs(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// Render project cards on index
async function renderIndex() {
  const grid = document.getElementById('project-grid');
  if (!grid) return;
  const data = await loadProjects();

  data.forEach(p => {
    const linkUrl = `project.html?p=${encodeURIComponent(p.slug)}`;

    const cardLink = el('a', {
      class: 'card card-link',
      href: linkUrl,
      'aria-label': `${p.title} — view project`
    });

    const media = el('div', { class: 'card-media' }, [
      el('img', { src: p.hero || '', alt: '' })
    ]);

    const pad = el('div', { class: 'pad' });
    const title = el('h3', {}, [p.title]);
    const sum = el('p', {}, [p.summary]);
    const tags = el(
      'div',
      { class: 'tags' },
      (p.tags || []).slice(0, 3).map(t => el('span', { class: 'tag' }, [t]))
    );

    pad.append(title, sum, tags);
    cardLink.append(media, pad);
    grid.append(cardLink);
  });
}

// Render a project on project.html
async function renderProject() {
  const slug = qs('p');
  const titleEl = document.getElementById('title');
  
  if (!titleEl) return;

  const data = await loadProjects();
  const proj = data.find(p => p.slug === slug) || data[0];

  // Hero/meta
  const heroImg = document.getElementById('hero-img');
  if (heroImg && proj.hero) heroImg.src = proj.hero;

  titleEl.textContent = proj.title;

  // 👉 Dynamically update the <head><title> for this project
  if (proj.title) {
    document.title = proj.title;
  }

  const setText = (id, txt) => {
    const n = document.getElementById(id);
    if (n) n.textContent = txt || '—';
  };
  setText('summary', proj.summary);
  setText('timeframe', proj.timeframe);
  setText('role', proj.role);
  setText('purpose', proj.purpose);
  setText('outcomes', proj.outcomes);

  const meta = document.querySelector('.project .meta');
  if (meta) {
    const map = {
      timeframe: 'timeframe',
      role: 'role',
      purpose: 'purpose',
      outcomes: 'outcomes'
    };
    Object.entries(map).forEach(([key, id]) => {
      const val = proj[key];
      if (!val || String(val).trim() === '') {
        const span = document.getElementById(id);
        if (span && span.parentElement) span.parentElement.style.display = 'none';
      }
    });
    const anyVisible = Array.from(meta.children).some(
      ch => ch.style.display !== 'none'
    );
    if (!anyVisible) meta.remove();
  }

  const tags = document.getElementById('tags');
  tags.innerHTML = '';
  (proj.tags || []).forEach(t =>
    tags.appendChild(el('span', { class: 'chip' }, [t]))
  );

  const links = document.getElementById('links');
  links.innerHTML = '';
  (proj.links || []).forEach(l =>
    links.appendChild(
      el('a', { href: l.href, target: '_blank', rel: 'noopener' }, [l.label])
    )
  );


// ----- Instagram embed loader (runs once) -----
let igReady = null;

function loadInstagramSDK() {
  if (igReady) return igReady;
  igReady = new Promise((resolve) => {
    // If already available, resolve immediately
    if (window.instgrm && window.instgrm.Embeds) {
      resolve();
      return;
    }
    // Inject the SDK script once
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return igReady;
}

// Re-process embeds inside the given scope (panel)
async function hydrateInstagramEmbeds(scopeEl) {
  await loadInstagramSDK();
  try {
    // Newer versions support an element scope; if not, call without args
    if (window.instgrm && window.instgrm.Embeds) {
      if (typeof window.instgrm.Embeds.process === 'function') {
        window.instgrm.Embeds.process(scopeEl || undefined);
      }
    }
  } catch (e) {
    console.error('Instagram embed processing failed:', e);
  }
}


// Helper to render a tab panel or remove the tab/panel when empty
const writeList = (id, arr = []) => {
  const btn = document.querySelector(`.tab[data-tab="${id}"]`);
  const panel = document.getElementById(id);

  if (!btn || !panel) return false;

  // If no content, remove tab + panel
  if (!arr || arr.length === 0) {
    btn.remove();
    panel.remove();
    return false;
  }

  panel.innerHTML = '';
  const wrap = el('div', { class: 'list' });

  // Temporary storage for list fragments
  let buffer = [];

  arr.forEach(item => {
    const html = String(item).trim();

    // CASE 1: Handle <ol>/<ul>/<li> fragments
    if (/^<(ol|ul|li|\/ol|\/ul)/i.test(html)) {
      buffer.push(html);
      return;
    }

    // Flush list buffer if we hit non-list content
    if (buffer.length) {
      wrap.insertAdjacentHTML('beforeend', buffer.join(''));
      buffer = [];
    }

    // CASE 2: Block-level we should insert as-is (not inside <p>)
    if (/^<(h[1-6]|hr|img|figure|blockquote|iframe|video|pre|code|table|a)\b/i.test(html)) {
      wrap.insertAdjacentHTML('beforeend', html);
      return;
    }

    // CASE 3: Default — wrap text in a paragraph
    const p = document.createElement('p');
    p.innerHTML = html;
    wrap.appendChild(p);
  });

  // Flush leftover list buffer
  if (buffer.length) {
    wrap.insertAdjacentHTML('beforeend', buffer.join(''));
  }

  panel.appendChild(wrap);

  // Re-run Instagram’s parser on the new content
  hydrateInstagramEmbeds(panel);
  return true;
};



  writeList('overview', proj.overview);
  writeList('process', proj.process);
  writeList('results', proj.results);

  // Tab controls
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function adjustHeroPhoto() {
  const copy = document.querySelector('.hero-copy');
  const img = document.querySelector('.hero-photo');
  if (!copy || !img) return;

  const h = copy.offsetHeight;
  const max = 520;
  const size = Math.min(h, max);

  if (size > 0) {
    img.style.height = size + 'px';
    img.style.width = size + 'px';
  }
}

let _t;
window.addEventListener('resize', () => {
  clearTimeout(_t);
  _t = setTimeout(adjustHeroPhoto, 120);
});

window.addEventListener('load', adjustHeroPhoto);
document.addEventListener('DOMContentLoaded', adjustHeroPhoto);

renderIndex().catch(console.error);
renderProject().catch(console.error);

/* -------------------------
   Lightbox Image Viewer
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector("img");
  const caption = lightbox.querySelector(".caption");
  const closeBtn = lightbox.querySelector(".close-btn");

  let scale = 1;
  let currentX = 0, currentY = 0;

  function clampPosition(x, y) {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const imgW = lightboxImg.clientWidth * scale;
    const imgH = lightboxImg.clientHeight * scale;

    // How much the image can move before leaving viewport
    const maxX = Math.max(0, (imgW - viewportW) / 2);
    const maxY = Math.max(0, (imgH - viewportH) / 2);

    return [
      Math.min(Math.max(x, -maxX), maxX),
      Math.min(Math.max(y, -maxY), maxY)
    ];
  }

  function updateTransform() {
    [currentX, currentY] = clampPosition(currentX, currentY);
    lightboxImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
  }

  // Open image
  document.body.addEventListener("click", e => {
    if (e.target.classList.contains("clickable-img")) {
      lightbox.style.display = "flex";
      lightboxImg.src = e.target.src;
      caption.textContent = e.target.alt || "";
      scale = 1;
      currentX = 0; currentY = 0;
      updateTransform();
    }
  });

  // Close
  closeBtn.addEventListener("click", () => {
    lightbox.style.display = "none";
  });
  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) {
      lightbox.style.display = "none";
    }
  });

// Click-to-zoom toggle
lightboxImg.addEventListener("click", e => {
  e.stopPropagation();

  if (scale === 1) {
    const viewportW = window.innerWidth * 0.9;
    scale = viewportW / lightboxImg.clientWidth;
    if (scale < 1) scale = 1;
    currentX = 0; currentY = 0;
    lightboxImg.classList.add("zoomed"); // 👈 add class when zoomed
  } else {
    scale = 1;
    currentX = 0; currentY = 0;
    lightboxImg.classList.remove("zoomed"); // 👈 remove class when reset
  }

  updateTransform();
});

  // Scroll-to-pan
  lightbox.addEventListener("wheel", e => {
    e.preventDefault();
    if (scale === 1) return;

    currentX -= e.deltaX * 0.5;
    currentY -= e.deltaY * 0.5;

    updateTransform();
  });
});

