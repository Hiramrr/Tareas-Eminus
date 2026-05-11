(async () => {
  if (window.__eminusDetailBackInjected) return;
  window.__eminusDetailBackInjected = true;

  if (!location.pathname.startsWith("/aplicativoEminus/actividad-detalle")) {
    return;
  }

  const i18n = {
    es: { 
      back_to_eminus: "Volver a Eminus",
      delivered: "Tarea entregada"
    },
    en: { 
      back_to_eminus: "Back to Eminus",
      delivered: "Task delivered"
    },
    fr: { 
      back_to_eminus: "Retour à Eminus",
      delivered: "Tâche livrée"
    },
    ja: { 
      back_to_eminus: "Eminusに戻る",
      delivered: "提出完了"
    },
    ko: { 
      back_to_eminus: "Eminus로 돌아가기",
      delivered: "과제 제출됨"
    },
    zh: { 
      back_to_eminus: "返回 Eminus",
      delivered: "任务已提交"
    }
  };

  let currentLang = "es";

  async function updateLanguage() {
    const data = await browser.storage.local.get("eminusLanguage");
    currentLang = data.eminusLanguage || "es";
    
    const btn = document.getElementById("ep-back-home-btn");
    if (btn) {
      btn.textContent = t("back_to_eminus");
    }
  }

  const t = (key) => i18n[currentLang]?.[key] || i18n["es"][key];

  // Initial load
  await updateLanguage();

  const btn = document.createElement("button");
  btn.id = "ep-back-home-btn";
  btn.type = "button";
  btn.textContent = t("back_to_eminus");
  btn.addEventListener("click", () => {
    window.location.assign(`${location.origin}/eminus4/page/course/list`);
  });

  document.body.appendChild(btn);

  // Listen for changes in storage (when user changes language in the main panel)
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.eminusLanguage) {
      currentLang = changes.eminusLanguage.newValue || "es";
      const backBtn = document.getElementById("ep-back-home-btn");
      if (backBtn) backBtn.textContent = t("back_to_eminus");
    }
  });

  function showCelebration() {
    if (document.getElementById("ep-celebration-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "ep-celebration-overlay";

    const colors = [
      "#ff2d55", "#ff6b6b", "#ffd93d", "#6bcb77",
      "#4d96ff", "#9b59b6", "#ff8a5c", "#00d2ff",
      "#f8a5c2", "#7bed9f", "#e056fd", "#f0932b"
    ];

    for (let i = 0; i < 200; i++) {
      const piece = document.createElement("div");
      piece.className = "ep-confetti-piece";

      const startX = Math.random() * 100;
      const endX = startX + (Math.random() * 20 - 10);

      piece.style.setProperty('--start-x', startX + 'vw');
      piece.style.setProperty('--end-x', endX + 'vw');
      piece.style.setProperty('--rot-x', (Math.random() * 1440 - 720) + 'deg');
      piece.style.setProperty('--rot-y', (Math.random() * 1440 - 720) + 'deg');
      piece.style.setProperty('--rot-z', (Math.random() * 1440 - 720) + 'deg');
      piece.style.setProperty('--scale', (Math.random() * 0.7 + 0.5).toString());
      piece.style.setProperty('--fall-duration', (Math.random() * 4 + 3) + 's');
      piece.style.setProperty('--fall-delay', (Math.random() * 2) + 's');

      if (Math.random() > 0.8) {
        piece.className += " ep-confetti-emoji";
        const emojis = ["🎉", "✨", "🌟", "🎊", "💫", "⭐", "🔥", "💯", "🎈", "🥳"];
        piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        piece.style.fontSize = (Math.random() * 24 + 14) + "px";
      } else {
        piece.style.width = (Math.random() * 14 + 6) + "px";
        piece.style.height = (Math.random() * 16 + 8) + "px";
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        if (Math.random() > 0.5) {
          piece.style.borderRadius = "3px";
        }
        if (Math.random() > 0.7) {
          piece.style.borderRadius = "50%";
        }
        if (Math.random() > 0.8) {
          piece.style.width = (Math.random() * 4 + 2) + "px";
          piece.style.height = (Math.random() * 20 + 10) + "px";
        }
      }

      overlay.appendChild(piece);
    }

    document.body.appendChild(overlay);

    const dismiss = () => {
      if (!overlay.parentNode) return;
      overlay.classList.add("ep-celebration-fadeout");
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 600);
    };

    overlay.addEventListener("click", dismiss, { once: true });

    setTimeout(dismiss, 5000);
  }

  function showAbductionAnimation() {
    if (document.getElementById("ep-abduction-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "ep-abduction-overlay";

    // Stars
    for (let i = 0; i < 60; i++) {
      const star = document.createElement("div");
      star.className = "ep-abduction-star";
      const size = Math.random() * 3 + 1;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.top = Math.random() * 100 + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 2 + "s";
      overlay.appendChild(star);
    }

    // Ground
    const ground = document.createElement("div");
    ground.className = "ep-abduction-ground";
    overlay.appendChild(ground);

    // UFO wrap
    const ufoWrap = document.createElement("div");
    ufoWrap.className = "ep-abduction-ufo-wrap";

    const ufo = document.createElement("div");
    ufo.className = "ep-abduction-ufo";
    ufo.innerHTML = `
      <svg width="160" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
        <path d="M40 40C40 17.9086 57.9086 0 80 0C102.091 0 120 17.9086 120 40" fill="#A5F3FC" fill-opacity="0.6" stroke="#0891B2" stroke-width="2"/>
        <ellipse cx="80" cy="45" rx="75" ry="25" fill="#94A3B8" stroke="#334155" stroke-width="3"/>
        <ellipse cx="80" cy="45" rx="65" ry="18" fill="#CBD5E1"/>
        <circle cx="20" cy="55" r="4" fill="#FACC15"><animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite"/></circle>
        <circle cx="50" cy="55" r="4" fill="#FACC15"><animate attributeName="opacity" values="1;0.4;1" dur="0.5s" begin="0.1s" repeatCount="indefinite"/></circle>
        <circle cx="80" cy="55" r="4" fill="#FACC15"><animate attributeName="opacity" values="1;0.4;1" dur="0.5s" begin="0.2s" repeatCount="indefinite"/></circle>
        <circle cx="110" cy="55" r="4" fill="#FACC15"><animate attributeName="opacity" values="1;0.4;1" dur="0.5s" begin="0.3s" repeatCount="indefinite"/></circle>
        <circle cx="140" cy="55" r="4" fill="#FACC15"><animate attributeName="opacity" values="1;0.4;1" dur="0.5s" begin="0.4s" repeatCount="indefinite"/></circle>
        <line x1="80" y1="0" x2="80" y2="-10" stroke="#334155" stroke-width="2"/>
        <circle cx="80" cy="-12" r="3" fill="#EF4444"/>
      </svg>
    `;

    // Beam
    const beam = document.createElement("div");
    beam.className = "ep-abduction-beam";
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("div");
      p.className = "ep-abduction-particle";
      p.style.left = (Math.random() * 80 + 10) + "%";
      p.style.animation = `ep-beam-particle-up ${1.5 + Math.random()}s linear infinite`;
      p.style.animationDelay = Math.random() * 1.5 + "s";
      beam.appendChild(p);
    }

    // Cow wrap
    const cowWrap = document.createElement("div");
    cowWrap.className = "ep-abduction-cow-wrap";
    const cow = document.createElement("div");
    cow.className = "ep-abduction-cow";
    cow.innerHTML = `
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <rect x="15" y="15" width="50" height="30" rx="15" fill="white" stroke="#333" stroke-width="2"/>
        <circle cx="25" cy="25" r="5" fill="#333"/>
        <circle cx="50" cy="35" r="7" fill="#333"/>
        <circle cx="60" cy="20" r="4" fill="#333"/>
        <rect x="55" y="10" width="20" height="25" rx="8" fill="white" stroke="#333" stroke-width="2"/>
        <ellipse cx="55" cy="12" rx="4" ry="6" fill="white" stroke="#333" stroke-width="2" transform="rotate(-20 55 12)"/>
        <ellipse cx="75" cy="12" rx="4" ry="6" fill="white" stroke="#333" stroke-width="2" transform="rotate(20 75 12)"/>
        <ellipse cx="65" cy="28" rx="8" ry="5" fill="#FFC0CB" stroke="#333" stroke-width="2"/>
        <circle cx="62" cy="28" r="1.5" fill="#333"/>
        <circle cx="68" cy="28" r="1.5" fill="#333"/>
        <circle cx="60" cy="20" r="2" fill="#333"/>
        <circle cx="70" cy="20" r="2" fill="#333"/>
        <rect x="25" y="45" width="4" height="10" fill="white" stroke="#333" stroke-width="2"/>
        <rect x="45" y="45" width="4" height="10" fill="white" stroke="#333" stroke-width="2"/>
        <path d="M15 30 Q5 30 5 20" stroke="#333" stroke-width="2" fill="none"/>
      </svg>
    `;
    cowWrap.appendChild(cow);

    ufo.appendChild(beam);
    ufoWrap.appendChild(ufo);
    overlay.appendChild(ufoWrap);
    overlay.appendChild(cowWrap);
    document.body.appendChild(overlay);

    // Animation phases
    setTimeout(() => {
      ufo.classList.add("abducting");
      beam.classList.add("active");
      cow.classList.add("abducting");
    }, 2000);

    setTimeout(() => {
      ufo.classList.remove("abducting");
      ufo.classList.add("leaving");
      beam.classList.remove("active");
      beam.classList.add("leaving");
      cowWrap.style.opacity = "0";
    }, 5000);

    const dismiss = () => {
      if (!overlay.parentNode) return;
      overlay.classList.add("ep-abduction-fadeout");
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 400);
    };

    overlay.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 7200);
  }

  function showTeamsCelebration() {
    if (document.getElementById("ep-teams-overlay")) return;

    const overlay = document.createElement('div');
    overlay.id = 'ep-teams-overlay';

    const ambient = document.createElement('div');
    ambient.className = 'ep-teams-ambient';

    const system = document.createElement('div');
    system.className = 'ep-teams-disco-system';

    const string = document.createElement('div');
    string.className = 'ep-teams-string';

    const wrapper = document.createElement('div');
    wrapper.className = 'ep-teams-ball-wrap';

    const beams = document.createElement('div');
    beams.className = 'ep-teams-light-beams';

    const ball = document.createElement('div');
    ball.className = 'ep-teams-disco-ball';

    wrapper.appendChild(beams);
    wrapper.appendChild(ball);
    system.appendChild(string);
    system.appendChild(wrapper);
    
    overlay.appendChild(ambient);
    overlay.appendChild(system);
    document.body.appendChild(overlay);

    const createParticleBurst = (parent) => {
        const colors = ['#FFC83D', '#5B5FC7', '#00B7C3', '#E3008C', '#FFFFFF'];
        const particleCount = 25;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'ep-teams-star-particle';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 150;
            
            const tx = Math.cos(angle) * distance + 'px';
            const ty = Math.sin(angle) * distance + 'px';
            
            particle.style.setProperty('--tx', tx);
            particle.style.setProperty('--ty', ty);
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = color;
            particle.style.boxShadow = `0 0 10px ${color}`;
            
            const size = 10 + Math.random() * 20;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            particle.style.animation = `ep-teams-flyOut ${1 + Math.random() * 0.8}s ease-out forwards`;

            parent.appendChild(particle);
        }
    };

    setTimeout(() => {
        if (wrapper.parentNode) createParticleBurst(wrapper);
    }, 650);

    const dismiss = () => {
      if (!overlay.parentNode) return;
      overlay.classList.add("ep-celebration-fadeout");
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 600);
    };

    overlay.addEventListener("click", dismiss, { once: true });
    setTimeout(dismiss, 3000);
  }

  function showPinataCelebration() {
    if (document.getElementById("ep-pinata-overlay")) return;

    const overlay = document.createElement('div');
    overlay.id = 'ep-pinata-overlay';
    
    overlay.innerHTML = `
        <div class="ep-pinata-ambient"></div>
        <div class="ep-pinata-physics-system">
            <div class="ep-pinata-cord" id="ep-pinata-cuerda"></div>
            <div class="ep-pinata-container" id="ep-pinata-box">
                <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1fa85.svg" alt="Llama Pinata">
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const reventar = () => {
        const pinata = document.getElementById('ep-pinata-box');
        const cuerda = document.getElementById('ep-pinata-cuerda');
        if(!overlay || !pinata) return;

        pinata.style.animation = 'ep-pinata-pop 0.15s forwards';
        if (cuerda) cuerda.style.animation = 'ep-pinata-snapUp 0.15s forwards'; 

        const shockwave = document.createElement('div');
        shockwave.className = 'ep-pinata-shockwave';
        shockwave.style.animation = 'ep-pinata-expandRing 0.5s ease-out forwards';
        overlay.appendChild(shockwave);

        const dulcesSvg = [
            'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f36c.svg', 
            'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f36d.svg', 
            'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f36b.svg', 
            'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2b50.svg'   
        ];

        const originY = window.innerHeight > 600 ? 250 : 150; 
        const originX = window.innerWidth / 2;

        for (let i = 0; i < 50; i++) {
            const candy = document.createElement('div');
            candy.className = 'ep-pinata-candy';
            candy.style.backgroundImage = `url(${dulcesSvg[Math.floor(Math.random() * dulcesSvg.length)]})`;
            
            if(Math.random() > 0.6) {
                candy.style.width = '16px';
                candy.style.height = '16px';
            }

            candy.style.top = originY + 'px';
            candy.style.left = originX + 'px';
            overlay.appendChild(candy);

            const angle = Math.random() * Math.PI * 2;
            const thrust = 100 + Math.random() * 280; 
            
            const tX = Math.cos(angle) * thrust;
            const pY = Math.sin(angle) * thrust;
            const endX = tX + (Math.random() - 0.5) * 80;
            const endY = pY + 700 + Math.random() * 300; 
            
            const rot = (Math.random() > 0.5 ? 1 : -1) * (1000 + Math.random() * 2000);

            candy.animate([
                { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(0)', opacity: 1, easing: 'cubic-bezier(0, .8, .2, 1)' },
                { transform: `translate3d(${tX}px, ${pY * 1.5}px, 0) rotate(${rot * 0.3}deg) scale(1)`, opacity: 1, offset: 0.2, easing: 'cubic-bezier(.6,0,1,.5)' },
                { transform: `translate3d(${endX}px, ${endY}px, 0) rotate(${rot}deg) scale(0.5)`, opacity: 0 }
            ], { duration: 1500 + Math.random() * 700, fill: "forwards" });
        }
    };

    setTimeout(reventar, 650);

    setTimeout(() => {
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { if (overlay.parentNode) overlay.remove() }, 300);
        }
    }, 2700);
  }

  const SUBMIT_KEYWORDS = [
    "entregar", "entregar tarea", "entregar actividad", "entregar trabajo",
    "enviar tarea", "enviar actividad", "enviar trabajo", "enviar",
    "subir tarea", "subir actividad", "subir trabajo", "subir",
    "guardar", "guardar tarea", "guardar actividad",
    "submit", "send", "upload"
  ];

  function looksLikeSubmitButton(el) {
    if (!el || el.disabled) return false;
    if (el.offsetParent === null) return false;

    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "").toLowerCase();

    if ((tag === "button" || tag === "input") && type === "submit") return true;

    const text = (el.textContent || el.value || el.getAttribute("aria-label") || "").toLowerCase().trim();
    if (!text) return false;

    return SUBMIT_KEYWORDS.some(k => text.includes(k));
  }

  let celebrationTimeout = null;
  function scheduleCelebration() {
    if (celebrationTimeout) return;
    celebrationTimeout = setTimeout(() => {
      celebrationTimeout = null;
      let animIdx = parseInt(sessionStorage.getItem("ep_anim_idx") || "0", 10);
      if (animIdx === 0) {
        showCelebration();
      } else if (animIdx === 1) {
        showAbductionAnimation();
      } else if (animIdx === 2) {
        showTeamsCelebration();
      } else {
        showPinataCelebration();
      }
      animIdx = (animIdx + 1) % 4;
      sessionStorage.setItem("ep_anim_idx", animIdx.toString());
    }, 800);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('button, input[type="submit"], input[type="button"], a.btn, a.button, [role="button"], .btn');
    if (!btn) return;
    if (!looksLikeSubmitButton(btn)) return;
    scheduleCelebration();
  });

  document.addEventListener("submit", () => {
    scheduleCelebration();
  });

})();