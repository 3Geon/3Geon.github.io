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

    // 음악 토글 버튼 이벤트 (심플한 기호 적용)
    if (musicToggle && bgm) {
        musicToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (bgm.paused) {
                bgm.play();
                musicToggle.textContent = '♪';
            } else {
                bgm.pause();
                musicToggle.textContent = '✕';
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
                musicToggle.textContent = '♪';
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

            setTimeout(() => {
                introOverlay.style.opacity = '0';
                introOverlay.style.pointerEvents = 'none';
                
                if (mainContent) {
                    mainContent.classList.add('pre-reveal');
                    
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

// ====== 4. PHOTO UPLOAD & ALBUM (안전한 수동 입력 방식) ======
    function loadGalleryPhotos() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        // 👇 여기에 album 폴더에 올리신 사진 파일 이름들을 정확하게 직접 적어주세요 👇
        // 예시: '사진1.jpg', '웨딩사진.png' (확장자 대소문자 주의)
        const photos = [
            '1-01.png',
            '1-02.png',
            '1-03.png',
            '1-04.png',
            '1-05.png',
            '1-06.png',
            '1-07.png',
            '2-01.png',
            '2-02.png',
            '2-03.png',
            '2-04.png',
            '2-05.png',
            '2-06.png',
            '2-07.png',
            '2-08.png',
            '2-09.png',
            '2-10.png',
            '3-01.png',
            '3-02.png',
            '3-03.png',
            '3-04.png',
            '3-05.png',
            '3-06.png',
            '4-01.png',
            '4-02.png',
            '4-03.png',
            '4-04.png',
            '5-01.png',
            '5-02.png',
            '5-03.png'
            // 필요한 만큼 쉼표(,)로 구분해서 계속 추가하세요
        ];

        if (photos.length === 0) { 
            galleryGrid.innerHTML = '<div class="loading-photos">표시할 사진이 없습니다.</div>'; 
            return; 
        }

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

        // 사진이 HTML에 추가된 후 스크롤 애니메이션 재설정
        if (typeof checkRevealElements === 'function') {
            revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');
            checkRevealElements();
        }
    }
    loadGalleryPhotos();

// ====== 5. 사진 확대 및 좌우 슬라이드 (드래그 스와이프) 기능 ======
    const photoModal = document.getElementById('photoModal');
    const expandedPhoto = document.getElementById('expandedPhoto');
    const photoModalClose = document.getElementById('photoModalClose');
    const btnPrev = document.getElementById('photoPrev');
    const btnNext = document.getElementById('photoNext');
    const galleryGrid = document.getElementById('galleryGrid');

    let currentPhotoIndex = 0;
    let galleryImages = [];
    let navTimeout;

    if (galleryGrid && photoModal) {
        function showNavTemporarily() {
            btnPrev.classList.add('show-nav');
            btnNext.classList.add('show-nav');
            
            clearTimeout(navTimeout);
            navTimeout = setTimeout(() => {
                btnPrev.classList.remove('show-nav');
                btnNext.classList.remove('show-nav');
            }, 2000);
        }

        // 1. 모달 열기
        galleryGrid.addEventListener('click', function(e) {
            if (e.target.tagName === 'IMG') {
                galleryImages = Array.from(galleryGrid.querySelectorAll('.gallery-item img'));
                currentPhotoIndex = galleryImages.indexOf(e.target);
                updateModalPhoto();
                
                // 🌟 모달이 열릴 때 사진 위치와 투명도를 원래대로 초기화
                expandedPhoto.style.transition = 'none';
                expandedPhoto.style.transform = 'translateX(0)';
                expandedPhoto.style.opacity = '1';
                
                photoModal.classList.add('active');
                document.body.style.overflow = 'hidden';
                showNavTemporarily();
            }
        });

        // 2. 모달 속 사진 변경
        function updateModalPhoto() {
            if (galleryImages.length > 0) {
                expandedPhoto.src = galleryImages[currentPhotoIndex].src;
            }
        }

        // 3. 화살표 버튼(클릭) 제어
        btnPrev.addEventListener('click', function(e) {
            e.stopPropagation();
            currentPhotoIndex--;
            if (currentPhotoIndex < 0) currentPhotoIndex = galleryImages.length - 1;
            updateModalPhoto();
            showNavTemporarily();
        });

        btnNext.addEventListener('click', function(e) {
            e.stopPropagation(); 
            currentPhotoIndex++;
            if (currentPhotoIndex >= galleryImages.length) currentPhotoIndex = 0;
            updateModalPhoto();
            showNavTemporarily();
        });

        // 4. 🌟 손가락을 따라다니는 부드러운 드래그 & 스와이프 기능
        let touchStartX = 0;
        let currentTranslate = 0;
        let isDragging = false;

        expandedPhoto.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            isDragging = true;
            // 드래그 중에는 부드러운 애니메이션 끄기 (손가락을 즉각적으로 따라감)
            expandedPhoto.style.transition = 'none';
            showNavTemporarily();
        });

        expandedPhoto.addEventListener('touchmove', e => {
            if (!isDragging) return;
            e.preventDefault(); // 사진을 넘길 때 화면이 위아래로 스크롤되는 것 방지
            
            const currentX = e.touches[0].clientX;
            currentTranslate = currentX - touchStartX;
            
            // 사진이 좌우로 이동할수록 가장자리가 자연스럽게 투명해지는 효과
            const opacity = 1 - Math.abs(currentTranslate) / (window.innerWidth * 1.5);
            expandedPhoto.style.transform = `translateX(${currentTranslate}px)`;
            expandedPhoto.style.opacity = opacity.toString();
        }, { passive: false });

        expandedPhoto.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            
            // 손가락을 떼면 부드럽게 미끄러지는 애니메이션 다시 켜기
            expandedPhoto.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

            if (currentTranslate < -70) {
                // 👈 왼쪽으로 70px 이상 밀었을 때 (다음 사진)
                expandedPhoto.style.transform = `translateX(-100vw)`;
                expandedPhoto.style.opacity = '0'; // 화면 밖으로 날려보냄
                
                setTimeout(() => {
                    btnNext.click(); // 사진 데이터 교체
                    resetPhotoPosition(50); // 새 사진이 오른쪽(50px)에서 다가오도록 설정
                }, 300);
            } else if (currentTranslate > 70) {
                // 👉 오른쪽으로 70px 이상 밀었을 때 (이전 사진)
                expandedPhoto.style.transform = `translateX(100vw)`;
                expandedPhoto.style.opacity = '0';
                
                setTimeout(() => {
                    btnPrev.click(); 
                    resetPhotoPosition(-50); // 새 사진이 왼쪽(-50px)에서 다가오도록 설정
                }, 300);
            } else {
                // 살짝 밀다 말았을 때: 튕기듯 제자리로 복귀
                expandedPhoto.style.transform = `translateX(0)`;
                expandedPhoto.style.opacity = '1';
            }
        });

        // 사진 교체 후 새 사진이 자연스럽게 나타나도록 위치를 잡아주는 함수
        function resetPhotoPosition(startX) {
            expandedPhoto.style.transition = 'none';
            expandedPhoto.style.transform = `translateX(${startX}px)`; // 출발 위치로 몰래 이동
            
            // 0.05초 뒤에 제자리(0px)로 애니메이션과 함께 등장
            setTimeout(() => {
                expandedPhoto.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                expandedPhoto.style.transform = `translateX(0)`;
                expandedPhoto.style.opacity = '1';
            }, 50);
            currentTranslate = 0;
        }

        // 마우스(터치) 클릭 시 화살표 나타나게 하기
        expandedPhoto.addEventListener('click', function(e) {
            e.stopPropagation();
            showNavTemporarily();
        });

        // 5. 모달 닫기
        function closePhotoModal() {
            photoModal.classList.remove('active');
            document.body.style.overflow = '';
        }

        photoModalClose.addEventListener('click', closePhotoModal);
        photoModal.addEventListener('click', function(e) {
            if (e.target === photoModal || e.target.classList.contains('photo-modal-content')) {
                closePhotoModal();
            }
        });
    }

    console.log('🎉 Wedding invitation loaded successfully!');
});