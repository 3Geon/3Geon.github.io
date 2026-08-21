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

    function isElementInViewport(el, offset = 100) {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        return rect.top <= windowHeight - offset && rect.bottom >= 0;
    }

    // ====== 1. HERO PARALLAX (기울기/마우스 감지) ======
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

    // ====== 0. HEART INTRO (클리핑 마스크, 음악, 센서 권한 통합) ======
    const introOverlay = document.getElementById('introOverlay');
    const introHeartBtn = document.getElementById('introHeartBtn');
    const introHint = document.getElementById('introHint');
    const mainContent = document.getElementById('mainContent');
    const bgm = document.getElementById('bgm');
    const musicToggle = document.getElementById('musicToggle');
    let isTransitioning = false;

    if (musicToggle && bgm) {
        musicToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (bgm.paused) {
                bgm.play();
                musicToggle.textContent = '🎵';
            } else {
                bgm.pause();
                musicToggle.textContent = '🔇';
            }
        });
    }

    if (introHeartBtn) {
        introHeartBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (isTransitioning) return;
            isTransitioning = true;

            if (bgm && bgm.paused) {
                bgm.play().catch(err => console.log('자동재생 차단:', err));
            }

            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation);
                        }
                    })
                    .catch(console.error);
            } else {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
            }

            if (introHint) introHint.style.opacity = '0';
            introHeartBtn.querySelector('svg').style.animation = 'none';

            // 클리핑 마스크 애니메이션 시작
            setTimeout(() => {
                introOverlay.style.opacity = '0';
                introOverlay.style.pointerEvents = 'none';
                
                if (mainContent) {
                    mainContent.classList.add('pre-reveal');
                    
                    // 🌟 렌더링 강제 업데이트 (애니메이션 스킵 방지)
                    void mainContent.offsetWidth; 
                    
                    mainContent.classList.add('revealing');

                    setTimeout(() => {
                        mainContent.classList.remove('pre-reveal', 'revealing');
                        mainContent.classList.add('visible');
                        introOverlay.style.display = 'none';
                    }, 1200);
                }
            }, 100);
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
                        // 🌟 오타 수정된 부분
                        circle.currentY += (tY - circle.currentY) * circle.speed;

                        const rotate = circle.currentX * 0.3;
                        circle.style.setProperty('transform', `translate3d(${circle.currentX}px, ${circle.currentY}px, 0) rotate(${rotate}deg)`, 'important');
                    }
                }
            }
        });

        requestAnimationFrame(updateTilt);
    }
    
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

    // ====== 3. 모달 제어 및 계좌 복사 ======
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    const modalButtons = {
        'shuttleBtn': 'shuttleModal',
        'groomAccountBtn': 'groomModal',
        'brideAccountBtn': 'brideModal'
    };
    for (const [btnId, modalId] of Object.entries(modalButtons)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => openModal(modalId));
        }
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.getAttribute('data-target'));
        });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const accountNumber = this.getAttribute('data-account');
            navigator.clipboard.writeText(accountNumber).then(() => {
                alert('계좌번호가 복사되었습니다.');
            }).catch(err => {
                console.error('복사 실패:', err);
                alert('복사 기능을 지원하지 않는 브라우저입니다. 직접 선택하여 복사해주세요.');
            });
        });
    });

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

    // ====== 5. LIGHTBOX ======
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