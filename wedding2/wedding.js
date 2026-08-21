// ============================================
// Wedding Invitation - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {

    const CONFIG = {
        API_BASE_URL: window.location.origin,
        SCROLL_THROTTLE: 16,
        PARALLAX_INTENSITY: 0.4,
        ZOOM_INTENSITY: 0.0008
    };

    function throttle(callback, limit) {
        let waiting = false;
        return function() {
            if (!waiting) {
                callback.apply(this, arguments);
                waiting = true;
                setTimeout(() => { waiting = false; }, limit);
            }
        };
    }

    function debounce(callback, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => callback.apply(context, args), delay);
        };
    }

    function isElementInViewport(el, offset = 100) {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        return rect.top <= windowHeight - offset && rect.bottom >= 0;
    }

    // ====== 1. HERO PARALLAX (기울기 감지를 위한 초기 세팅) ======
    const tiltLayers = document.querySelectorAll('.hero-layer[data-depth]');
    const layerStates = {};
    let targetX = 0;
    let targetY = 0;

    if (tiltLayers.length > 0) {
        tiltLayers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')) || 0.5;
            layerStates[layer.className] = { depth: depth, currentX: 0, currentY: 0, targetX: 0, targetY: 0 };
        });
    }

    // 💖 기기 기울기 감지 함수 💖
    function handleDeviceOrientation(e) {
        const beta = e.beta || 0;
        const gamma = e.gamma || 0;
        targetX = Math.max(-15, Math.min(15, gamma * 0.5));
        targetY = Math.max(-15, Math.min(15, beta * 0.5 - 5));

        tiltLayers.forEach(layer => {
            const state = layerStates[layer.className];
            if (state) {
                state.targetX = targetX * state.depth;
                state.targetY = targetY * state.depth;
            }
        });
    }

    // PC 환경 마우스 감지 함수
    function handleMouseMove(e) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        targetX = Math.max(-15, Math.min(15, (mouseX / centerX) * 15));
        targetY = Math.max(-15, Math.min(15, (mouseY / centerY) * 15));

        tiltLayers.forEach(layer => {
            const state = layerStates[layer.className];
            if (state) {
                state.targetX = targetX * state.depth;
                state.targetY = targetY * state.depth;
            }
        });
    }

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

    // ====== 0. ENVELOPE INTRO & 권한 요청 ======
    const envelopeOverlay = document.getElementById('envelopeOverlay');
    const envelope = document.getElementById('envelope');
    const envelopeWrapper = document.getElementById('envelopeWrapper');
    const envelopeHint = document.getElementById('envelopeHint');
    const mainContent = document.getElementById('mainContent');

    let isEnvelopeOpen = false;
    let isTransitioning = false;

    if (envelope) {
        envelope.addEventListener('click', function(e) {
            e.stopPropagation();
            if (isTransitioning) return;
            if (isEnvelopeOpen) return;

            // 🌟 아이폰(iOS 13+) 자이로 센서 권한 요청을 봉투 클릭 시점에 실행! 🌟
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation);
                        }
                    })
                    .catch(console.error);
            } else {
                // 안드로이드 및 일반 기기
                window.addEventListener('deviceorientation', handleDeviceOrientation);
            }

            envelopeWrapper.classList.add('clicked');
            if (envelopeHint) {
                envelopeHint.style.opacity = '0';
                envelopeHint.style.transition = 'opacity 0.3s ease';
            }

            setTimeout(() => {
                envelopeWrapper.classList.remove('clicked');
                isEnvelopeOpen = true;
                envelope.classList.add('open');

                setTimeout(() => {
                    isTransitioning = true;
                    envelopeOverlay.classList.add('open-transition');
                    
                    setTimeout(() => {
                        if (mainContent) {
                            mainContent.classList.remove('hidden');
                            void mainContent.offsetWidth;
                            mainContent.classList.add('visible');
                        }
                        envelopeOverlay.classList.add('fade-out');
                        setTimeout(() => { envelopeOverlay.style.display = 'none'; }, 800);
                    }, 800);
                }, 1500);
            }, 500);
        });
    }

    // ====== 실시간 애니메이션 루프 ======
    function updateTilt() {
        tiltLayers.forEach(layer => {
            const state = layerStates[layer.className];
            if (state) {
                state.currentX += (state.targetX - state.currentX) * 0.1;
                state.currentY += (state.targetY - state.currentY) * 0.1;

                if (!layer.querySelector('.letter-circle')) {
                    const moveX = state.currentX * 2;
                    const moveY = state.currentY * 2;
                    layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
                }
            }
        });

        const letterCircles = document.querySelectorAll('.letter-circle');
        letterCircles.forEach((circle) => {
            const parentLayer = circle.closest('.hero-layer');
            if (parentLayer) {
                const state = layerStates[parentLayer.className];
                if (state) {
                    const siblings = Array.from(parentLayer.querySelectorAll('.letter-circle'));
                    const localIndex = siblings.indexOf(circle);
                    const localTotal = siblings.length;

                    if (typeof circle.isReady === 'undefined') {
                        circle.isReady = false; 
                        circle.currentX = 0;
                        circle.currentY = 0;
                        circle.speed = 0.15 - ((localTotal - 1 - localIndex) * 0.015);
                        setTimeout(() => { circle.isReady = true; }, 1000); 
                    }

                    if (circle.isReady) {
                        const tX = state.targetX * 3.0;
                        const tY = state.targetY * 3.0;

                        circle.currentX += (tX - circle.currentX) * circle.speed;
                        circle.currentY += (tY - circle.currentY) * speed; // 변수 수정

                        // 🌟 안전장치: circle.speed 변수 사용
                        circle.currentY += (tY - circle.currentY) * circle.speed;

                        const rotate = circle.currentX * 0.3;
                        circle.style.setProperty('transform', `translate3d(${circle.currentX}px, ${circle.currentY}px, 0) rotate(${rotate}deg)`, 'important');
                    }
                }
            }
        });

        requestAnimationFrame(updateTilt);
    }
    
    // 안전한 실행을 위해 초기 스크롤 연동
    const heroImage = document.getElementById('heroImage');
    if (heroImage) {
        function updateHeroParallax() {
            const scrollY = window.scrollY;
            const zoom = 1 + (scrollY * CONFIG.ZOOM_INTENSITY);
            const clampedZoom = Math.min(zoom, 1.3);
            const translateY = scrollY * CONFIG.PARALLAX_INTENSITY;
            heroImage.style.transform = `scale(${clampedZoom}) translateY(${translateY}px)`;
        }
        window.addEventListener('scroll', throttle(updateHeroParallax, CONFIG.SCROLL_THROTTLE));
        updateHeroParallax();
    }

    updateTilt();

    // ====== 2. SCROLL REVEAL & ETC ======
    let revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');
    function checkRevealElements() {
        revealElements.forEach(el => {
            const delay = parseInt(el.getAttribute('data-delay')) || 0;
            if (isElementInViewport(el, 50)) {
                setTimeout(() => { el.classList.add('visible'); }, delay);
            }
        });
    }
    window.addEventListener('scroll', throttle(checkRevealElements, 100));
    checkRevealElements();

    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', throttle(function() {
            if (window.scrollY > 500) scrollTopBtn.classList.add('visible');
            else scrollTopBtn.classList.remove('visible');
        }, 100));
        scrollTopBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    // ====== 4. PHOTO UPLOAD & ALBUM ======
    async function loadGalleryPhotos() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        try {
            const response = await fetch('https://api.github.com/repos/3Geon/3Geon.github.io/contents/wedding2/album');
            if (!response.ok) throw new Error('Failed to fetch photo list');
            const files = await response.json();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const photos = files.filter(f => imageExtensions.includes('.' + f.name.split('.').pop().toLowerCase())).map(f => f.name).sort();
            
            if (photos.length === 0) { galleryGrid.innerHTML = '<div class="loading-photos">표시할 사진이 없습니다.</div>'; return; }
            galleryGrid.innerHTML = '';
            photos.forEach((filename, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item image-fade-in';
                item.setAttribute('data-delay', (index * 100).toString());
                const img = document.createElement('img');
                img.src = 'album/' + filename;
                img.loading = 'lazy';
                item.appendChild(img);
                galleryGrid.appendChild(item);
            });
            revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');
            checkRevealElements();
        } catch (error) { galleryGrid.innerHTML = '<div class="loading-photos">사진을 불러올 수 없습니다.</div>'; }
    }
    loadGalleryPhotos();

    // ====== 5. LIGHTBOX & ACCOUNT COPY ======
    document.addEventListener('click', function(e) {
        const galleryItem = e.target.closest('.gallery-item');
        if (!galleryItem) return;
        const img = galleryItem.querySelector('img');
        if (!img) return;
        
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity 0.3s;padding:20px;cursor:pointer;`;
        
        const lightboxImg = document.createElement('img');
        lightboxImg.src = img.src;
        lightboxImg.style.cssText = `max-width:100%;max-height:90vh;border-radius:8px;transform:scale(0.9);transition:transform 0.3s;`;
        
        lightbox.appendChild(lightboxImg);
        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';
        
        requestAnimationFrame(() => { lightbox.style.opacity = '1'; lightboxImg.style.transform = 'scale(1)'; });
        lightbox.addEventListener('click', () => {
            lightbox.style.opacity = '0';
            lightboxImg.style.transform = 'scale(0.9)';
            document.body.style.overflow = '';
            setTimeout(() => { if (lightbox.parentNode) lightbox.parentNode.removeChild(lightbox); }, 300);
        });
    });

    console.log('🎉 Wedding invitation loaded successfully!');
});