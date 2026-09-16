// ===== EFFETS VISUELS (apparitions, lightbox, confettis) =====

document.addEventListener('DOMContentLoaded', function () {
    initRevealOnScroll();
    initLightbox();
    initCarousels();
});

// ----- Carrousels galerie (hôtel / traiteur) -----
function initCarousels() {
    document.querySelectorAll('[data-carousel]').forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const prevBtn = carousel.querySelector('.carousel-arrow-prev');
        const nextBtn = carousel.querySelector('.carousel-arrow-next');

        function stepWidth() {
            const slide = track.querySelector('.carousel-slide');
            if (!slide) return track.clientWidth;
            const gap = parseFloat(getComputedStyle(track).gap) || 0;
            return slide.getBoundingClientRect().width + gap;
        }

        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: -stepWidth(), behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: stepWidth(), behavior: 'smooth' });
        });
    });
}

// ----- Apparition au scroll -----
function initRevealOnScroll() {
    const targets = document.querySelectorAll('.form-section, .gallery-section, .highlights-section');
    targets.forEach(el => el.classList.add('reveal'));

    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('in-view'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
}

// ----- Lightbox galerie (avec navigation prev/next et swipe) -----
function initLightbox() {
    const overlay = document.getElementById('lightboxOverlay');
    const overlayImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');

    let currentGroup = [];
    let currentIndex = 0;

    function showIndex(i) {
        if (!currentGroup.length) return;
        currentIndex = (i + currentGroup.length) % currentGroup.length;
        const img = currentGroup[currentIndex];
        overlayImg.src = img.src;
        overlayImg.alt = img.alt;
    }

    document.querySelectorAll('.carousel').forEach(carousel => {
        const imgs = Array.from(carousel.querySelectorAll('.gallery-img'));
        imgs.forEach((img, idx) => {
            img.addEventListener('click', function () {
                currentGroup = imgs;
                showIndex(idx);
                overlay.classList.add('open');
            });
        });
    });

    function closeLightbox() {
        overlay.classList.remove('open');
        overlayImg.src = '';
    }

    prevBtn.addEventListener('click', () => showIndex(currentIndex - 1));
    nextBtn.addEventListener('click', () => showIndex(currentIndex + 1));
    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
        if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
    });

    // Glisser vers la gauche/droite pour passer à l'image suivante/précédente
    let touchStartX = null;
    overlay.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    overlay.addEventListener('touchend', function (e) {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 45) {
            if (dx < 0) showIndex(currentIndex + 1);
            else showIndex(currentIndex - 1);
        }
        touchStartX = null;
    }, { passive: true });
}

// ----- Confettis de célébration (déclenchés après une inscription réussie) -----
const CELEBRATION_EMOJIS = ['❄️', '🎿', '⛷️', '🏔️'];

function launchCelebration() {
    const CONFETTI_COUNT = 22;
    const MAX_FALL_MS = 6600; // durée de chute max + délai max, pour le nettoyage

    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    document.body.appendChild(layer);

    for (let i = 0; i < CONFETTI_COUNT; i++) {
        const piece = document.createElement('span');
        piece.textContent = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
        piece.className = 'confetti-piece';

        const startX = Math.random() * 100;
        const size = 20 + Math.random() * 26;
        const fallDuration = 4 + Math.random() * 2.2;
        const delay = Math.random() * 1.8;
        const rotStart = Math.random() * 30 - 15;
        const rotEnd = rotStart + (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 70);
        const swayAmount = 16 + Math.random() * 30;

        piece.style.left = startX + 'vw';
        piece.style.fontSize = size + 'px';
        piece.style.setProperty('--fall-duration', fallDuration + 's');
        piece.style.setProperty('--fall-delay', delay + 's');
        piece.style.setProperty('--rot-start', rotStart + 'deg');
        piece.style.setProperty('--rot-end', rotEnd + 'deg');
        piece.style.setProperty('--sway', swayAmount + 'px');

        layer.appendChild(piece);
    }

    // Un grand emoji qui "pop" au centre pour marquer le moment
    const popEl = document.createElement('span');
    popEl.textContent = '🎿';
    popEl.className = 'celebration-pop';
    layer.appendChild(popEl);

    setTimeout(() => {
        layer.remove();
    }, MAX_FALL_MS);
}
