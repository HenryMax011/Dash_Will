const webhookUrl = "COLOQUE_Sua_URL_AQUI";
const whatsappNumber = "NUMERO_AQUI";

function whatsappDigits() {
  return String(whatsappNumber).replace(/\D/g, "");
}

const form = document.getElementById("leadForm");
const submitBtn = document.getElementById("submitBtn");
const formStatus = document.getElementById("formStatus");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sanitize(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function setStatus(message, type) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status${type ? ` ${type}` : ""}`;
}

function initLeadForm() {
  if (!form || !submitBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = sanitize(document.getElementById("nome")?.value);
    const telefone = sanitize(document.getElementById("telefone")?.value);
    const email = sanitize(document.getElementById("email")?.value);
    const empresa = sanitize(document.getElementById("empresa")?.value);
    const faturamento = sanitize(document.getElementById("faturamento")?.value);

    if (!nome || !telefone || !email) {
      setStatus("Preencha nome, e-mail e telefone para continuarmos.", "error");
      return;
    }

    const payload = {
      nome,
      telefone,
      email,
      empresa: empresa || undefined,
      faturamento: faturamento || undefined,
      origem: "landing-page-consultoria",
    };

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    setStatus("Enviando seus dados de forma segura...", "");

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.status}`);
      }

      setStatus("Tudo certo! Redirecionando para o WhatsApp...", "success");

      const extra = [empresa && `Empresa: ${empresa}`, faturamento && `Faturamento: ${faturamento}`]
        .filter(Boolean)
        .join("\n");

      const waText = encodeURIComponent(
        `Olá, equipe! Sou ${nome} e quero entender o melhor caminho para regularizar meu negócio.\n\nE-mail: ${email}\nTelefone: ${telefone}${extra ? `\n${extra}` : ""}`
      );
      const n = whatsappDigits();
      const waUrl = n.length >= 10 ? `https://wa.me/${n}?text=${waText}` : "#contato";

      setTimeout(() => {
        window.location.href = waUrl;
      }, 800);
    } catch (error) {
      setStatus("Não foi possível enviar agora. Tente novamente ou fale direto no WhatsApp.", "error");
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      console.error(error);
    }
  });
}

function initFloatingFields() {
  const floatingFields = Array.from(document.querySelectorAll(".field--floating"));
  if (!floatingFields.length) return;

  function updateFieldState(field) {
    const input = field.querySelector("input, select");
    if (!input) return;
    const filled = sanitize(input.value).length > 0;
    field.classList.toggle("is-filled", filled);
  }

  floatingFields.forEach((field) => {
    const input = field.querySelector("input, select");
    if (!input) return;

    updateFieldState(field);
    input.addEventListener("input", () => updateFieldState(field));
    input.addEventListener("change", () => updateFieldState(field));
    input.addEventListener("blur", () => updateFieldState(field));
  });
}

const navToggle = document.getElementById("navToggle");
const navPanel = document.getElementById("siteMenu");

function closeNav() {
  if (!navPanel || !navToggle) return;
  navPanel.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

function initNav() {
  if (!navToggle || !navPanel) return;

  navToggle.addEventListener("click", () => {
    const open = !navPanel.classList.contains("is-open");
    navPanel.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navPanel.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
}

function initReveal() {
  if (reduceMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    return;
  }

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const d = el.getAttribute("data-reveal-delay");
    if (d) el.style.setProperty("--reveal-delay", `${Number(d) * 0.12}s`);
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
}

function formatCounterValue(el, value) {
  const format = el.dataset.format;
  const decimals = Number(el.dataset.decimals ?? 0);
  const prefix = el.dataset.prefix ?? "";
  const suffix = el.dataset.suffix ?? "";

  if (format === "currency-full") {
    const brl = value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${brl}${suffix}`;
  }

  const hasDecimals = String(el.dataset.target).includes(".") || decimals > 0;
  const num = hasDecimals
    ? value.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : Math.round(value).toLocaleString("pt-BR");

  return `${prefix}${num}${suffix}`;
}

function animateCounter(el, delay = 0) {
  if (el.dataset.animated === "1") return;
  el.dataset.animated = "1";

  const target = Number(el.dataset.target);
  if (Number.isNaN(target)) return;

  const duration = 1900;

  const kickoff = () => {
    el.classList.add("is-counting");
    const metricRoot = el.closest(".metric");
    if (metricRoot) metricRoot.classList.add("is-counting");

    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = target * eased;
      el.textContent = formatCounterValue(el, current);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatCounterValue(el, target);
        el.classList.remove("is-counting");
        el.classList.add("is-counted");
        if (metricRoot) {
          metricRoot.classList.remove("is-counting");
          metricRoot.classList.add("is-counted");
        }
      }
    };

    requestAnimationFrame(tick);
  };

  if (delay > 0) window.setTimeout(kickoff, delay);
  else kickoff();
}

function initCounters() {
  const els = Array.from(document.querySelectorAll("[data-counter]"));
  if (!els.length) return;

  if (reduceMotion) {
    els.forEach((el) => {
      const target = Number(el.dataset.target);
      if (!Number.isNaN(target)) el.textContent = formatCounterValue(el, target);
      el.classList.add("is-counted");
      el.closest(".metric")?.classList.add("is-counted");
    });
    return;
  }

  els.forEach((el) => el.closest(".metric")?.classList.add("metric--pending"));

  const groups = new Map();
  els.forEach((el) => {
    const group = el.closest(".metrics__inner") || el.closest(".metrics") || document.body;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(el);
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const group = entry.target;
        const list = groups.get(group) || [];
        list.forEach((el, idx) => animateCounter(el, idx * 180));
        io.unobserve(group);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );

  groups.forEach((_list, group) => io.observe(group));
}

function initSlider() {
  const cards = Array.from(document.querySelectorAll(".testimonial-slide"));
  const prev = document.querySelector("[data-slider-prev]");
  const next = document.querySelector("[data-slider-next]");
  const dotsRoot = document.getElementById("sliderDots");
  const root = document.getElementById("iphoneSlider");
  if (!cards.length || !prev || !next || !dotsRoot || !root) return;

  let index = 0;

  const dots = cards.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slider-dot";
    b.setAttribute("aria-label", `Depoimento ${i + 1}`);
    b.addEventListener("click", () => go(i));
    dotsRoot.appendChild(b);
    return b;
  });

  function render() {
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === index);
    });

    dots.forEach((d, i) => d.setAttribute("aria-current", i === index ? "true" : "false"));
  }

  function go(i) {
    index = (i + cards.length) % cards.length;
    render();
  }

  prev.addEventListener("click", () => go(index - 1));
  next.addEventListener("click", () => go(index + 1));

  let timer = window.setInterval(() => go(index + 1), 6200);
  root.addEventListener("mouseenter", () => window.clearInterval(timer));
  root.addEventListener("mouseleave", () => {
    timer = window.setInterval(() => go(index + 1), 6200);
  });

  render();
}

function initAccordion() {
  const roots = Array.from(document.querySelectorAll(".accordion"));
  if (!roots.length) return;

  roots.forEach((root) => {
    const items = Array.from(root.querySelectorAll(".accordion__item"));
    if (!items.length) return;

    const exclusive = root.dataset.accordion !== "multi";

    function applyState(item, open) {
      const btn = item.querySelector(".accordion__trigger");
      const panel = item.querySelector(".accordion__panel");
      item.classList.toggle("is-open", open);
      btn?.setAttribute("aria-expanded", String(open));
      if (panel) {
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      }
    }

    function openOnly(target) {
      items.forEach((item) => applyState(item, item === target));
    }

    items.forEach((item) => {
      const startOpen = item.classList.contains("is-open");
      applyState(item, startOpen);

      const btn = item.querySelector(".accordion__trigger");
      btn?.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        if (exclusive) {
          if (isOpen) applyState(item, false);
          else openOnly(item);
        } else {
          applyState(item, !isOpen);
        }
      });
    });
  });
}

function initTilt() {
  if (reduceMotion) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = (-py * 9).toFixed(2);
      const ry = (px * 11).toFixed(2);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function initSvgDividers() {
  const dividers = Array.from(document.querySelectorAll(".divider-line"));
  if (!dividers.length) return;

  if (reduceMotion) {
    dividers.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  dividers.forEach((el) => io.observe(el));
}

function initConstellation() {
  const canvas = document.getElementById("constellation");
  if (!canvas) return;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let animationId = 0;
  let active = true;
  let particles = [];

  const mouse = { x: -9999, y: -9999, active: false };

  const LINK_DISTANCE = 150;
  const REPEL_RADIUS = 170;
  const MIN_SPEED = 0.18;

  function randomVelocity() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.35 + Math.random() * 0.35;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  }

  function createParticles() {
    const target = Math.max(70, Math.min(170, Math.round((width * height) / 14000)));
    particles = Array.from({ length: target }, () => {
      const v = randomVelocity();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: v.vx,
        vy: v.vy,
        r: Math.random() * 1.6 + 0.8,
      };
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(window.innerWidth));
    height = Math.max(1, Math.floor(window.innerHeight));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!particles.length) {
      createParticles();
    } else {
      particles.forEach((p) => {
        if (p.x > width) p.x = Math.random() * width;
        if (p.y > height) p.y = Math.random() * height;
      });
      const desired = Math.max(70, Math.min(170, Math.round((width * height) / 14000)));
      if (Math.abs(desired - particles.length) > 20) createParticles();
    }
  }

  function draw() {
    if (!active) {
      animationId = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];

      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS && dist > 0.1) {
          const force = (REPEL_RADIUS - dist) / 7000;
          p.vx -= (dx / dist) * force;
          p.vy -= (dy / dist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      p.vx *= 0.996;
      p.vy *= 0.996;

      const speed = Math.hypot(p.vx, p.vy);
      if (speed < MIN_SPEED) {
        const angle = Math.atan2(p.vy || Math.random() - 0.5, p.vx || Math.random() - 0.5);
        p.vx = Math.cos(angle) * MIN_SPEED;
        p.vy = Math.sin(angle) * MIN_SPEED;
      }

      if (p.x <= 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      else if (p.x >= width) { p.x = width; p.vx = -Math.abs(p.vx); }
      if (p.y <= 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      else if (p.y >= height) { p.y = height; p.vy = -Math.abs(p.vy); }

      ctx.beginPath();
      ctx.fillStyle = "rgba(150, 236, 245, 0.9)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > LINK_DISTANCE * LINK_DISTANCE) continue;
        const dist = Math.sqrt(distSq);
        const alpha = (1 - dist / LINK_DISTANCE) * 0.48;
        ctx.strokeStyle = `rgba(44, 185, 197, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    animationId = requestAnimationFrame(draw);
  }

  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });
  window.addEventListener("blur", () => {
    mouse.active = false;
  });

  document.addEventListener("visibilitychange", () => {
    active = !document.hidden;
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  draw();

  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationId));
}

function initScrollScene() {
  const sections = Array.from(document.querySelectorAll("[data-scroll-scene]"));
  const progressBar = document.getElementById("scrollProgressBar");
  const globe = document.getElementById("scrollGlobe");
  const links = Array.from(document.querySelectorAll("[data-scroll-nav]"));
  if (!sections.length || !progressBar) return;

  const globePositions = [
    { x: 80, y: 48, s: 1.06, o: 0.2 },
    { x: 72, y: 54, s: 0.98, o: 0.16 },
    { x: 58, y: 32, s: 0.88, o: 0.2 },
    { x: 82, y: 26, s: 1.18, o: 0.22 },
    { x: 50, y: 52, s: 1.24, o: 0.16 },
  ];

  let ticking = false;

  function update() {
    const doc = document.documentElement.scrollHeight - window.innerHeight;
    const p = doc > 0 ? Math.min(Math.max(window.scrollY / doc, 0), 1) : 0;
    progressBar.style.setProperty("--scroll-p", String(p));

    const mid = window.innerHeight * 0.5;
    let activeSection = null;
    let bestDist = Infinity;

    sections.forEach((sec) => {
      const r = sec.getBoundingClientRect();
      const c = r.top + r.height * 0.5;
      const d = Math.abs(c - mid);
      if (d < bestDist) {
        bestDist = d;
        activeSection = sec;
      }
    });

    const activeId = activeSection?.id ? `#${activeSection.id}` : null;

    links.forEach((a) => {
      const isActive = activeId ? a.getAttribute("href") === activeId : false;
      a.classList.toggle("is-active", isActive);
      if (isActive) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });

    if (globe) {
      const index = Math.max(0, sections.indexOf(activeSection));
      const pos = globePositions[index] ?? globePositions[0];
      if (reduceMotion) {
        globe.style.opacity = "0.1";
        globe.style.transform = "translate3d(78vw, 46vh, 0) scale3d(1, 1, 1)";
      } else {
        globe.style.opacity = String(pos.o);
        globe.style.transform = `translate3d(${pos.x}vw, ${pos.y}vh, 0) scale3d(${pos.s}, ${pos.s}, 1)`;
      }
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

initLeadForm();
initFloatingFields();
initNav();
initReveal();
initCounters();
initSlider();
initAccordion();
initTilt();
initSvgDividers();
initConstellation();
initScrollScene();
