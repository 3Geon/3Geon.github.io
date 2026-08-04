// ============================================
// Wedding Invitation - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {

    // ====== CONFIGURATION ======
    const CONFIG = {
        API_BASE_URL: window.location.origin,
        SCROLL_THROTTLE: 16, // ms
        PARALLAX_INTENSITY: 0.4,
        ZOOM_INTENSITY: 0.0008
    };

    // ====== UTILITY FUNCTIONS ======
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

    // ====== 0. ENVELOPE INTRO ANIMATION ======
    const envelopeOverlay = document.getElementById('envelopeOverlay');
    const envelope = document.getElementById('envelope');
    const letter = document.getElementById('letter');
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

            // Step 1: Click → Scale pop animation
            envelopeWrapper.classList.add('clicked');

            // Hide hint
            if (envelopeHint) {
                envelopeHint.style.opacity = '0';
                envelopeHint.style.transition = 'opacity 0.3s ease';
            }

            // Step 2: After scale animation, open the flap
            setTimeout(() => {
                envelopeWrapper.classList.remove('clicked');
                isEnvelopeOpen = true;
                envelope.classList.add('open');

                // Step 3: After flap opens and letter shows, transition to website
                setTimeout(() => {
                    isTransitioning = true;
                    
                    // Fade envelope away
                    envelopeOverlay.classList.add('open-transition');
                    
                    // Step 4: Show main content
                    setTimeout(() => {
                        if (mainContent) {
                            mainContent.classList.remove('hidden');
                            void mainContent.offsetWidth;
                            mainContent.classList.add('visible');
                        }
                        
                        envelopeOverlay.classList.add('fade-out');
                        
                        setTimeout(() => {
                            envelopeOverlay.style.display = 'none';
                            if (typeof updateHeroParallax === 'function') updateHeroParallax();
                            if (typeof checkRevealElements === 'function') checkRevealElements();
                        }, 800);
                    }, 800);
                }, 1500);
            }, 500); // Wait for scale animation to complete
        });
    }

    // ====== 1. HERO PARALLAX - Image Zoom Effect ======
    const heroImage = document.getElementById('heroImage');
    if (heroImage) {
        function updateHeroParallax() {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            
            // Zoom effect: image gets bigger as you scroll down (up to a point)
            const zoom = 1 + (scrollY * CONFIG.ZOOM_INTENSITY);
            // Limit max zoom
            const clampedZoom = Math.min(zoom, 1.3);
            
            // Parallax shift: move image up slower than scroll
            const translateY = scrollY * CONFIG.PARALLAX_INTENSITY;
            
            heroImage.style.transform = `scale(${clampedZoom}) translateY(${translateY}px)`;
        }

        window.addEventListener('scroll', throttle(updateHeroParallax, CONFIG.SCROLL_THROTTLE));
        
        // Initial call
        updateHeroParallax();
    }

    // ====== 1b. 3D TILT EFFECT (Device Orientation) ======
    const heroTextWrapper = document.getElementById('heroTextWrapper');
    
    // 기울기 효과를 받는 레이어들 (BG 제외)
    // 각 레이어의 data-depth 값이 클수록 기울기에 더 크게 반응
    const tiltLayers = document.querySelectorAll('.hero-layer[data-depth]');
    
    if (heroTextWrapper) {
        let tiltX = 0;
        let tiltY = 0;
        let targetX = 0;
        let targetY = 0;

        // 각 레이어의 현재 위치 저장 (기울기 효과를 위한 기본값)
        const layerStates = {};
        tiltLayers.forEach(layer => {
            const depth = parseFloat(layer.getAttribute('data-depth')) || 0.5;
            layerStates[layer.className] = {
                depth: depth,
                currentX: 0,
                currentY: 0,
                targetX: 0,
                targetY: 0
            };
        });

        function handleDeviceOrientation(e) {
            // beta: front-back tilt (-180 to 180)
            // gamma: left-right tilt (-90 to 90)
            const beta = e.beta || 0;
            const gamma = e.gamma || 0;

            // Normalize and limit
            targetX = Math.max(-15, Math.min(15, gamma * 0.3));
            targetY = Math.max(-15, Math.min(15, beta * 0.3 - 5));

            // 각 레이어의 target을 depth에 따라 설정
            tiltLayers.forEach(layer => {
                const state = layerStates[layer.className];
                if (state) {
                    state.targetX = targetX * state.depth;
                    state.targetY = targetY * state.depth;
                }
            });
        }

        function updateTilt() {
            // Smooth interpolation for main wrapper
            tiltX += (targetX - tiltX) * 0.1;
            tiltY += (targetY - tiltY) * 0.1;

            heroTextWrapper.style.transform = `rotateY(${tiltX}deg) rotateX(${-tiltY}deg)`;

            // Smooth interpolation for each layer
            tiltLayers.forEach(layer => {
                const state = layerStates[layer.className];
                if (state) {
                    state.currentX += (state.targetX - state.currentX) * 0.1;
                    state.currentY += (state.targetY - state.currentY) * 0.1;

                    // 각 레이어를 기울기 방향으로 이동 (공간감)
                    layer.style.transform = `translate3d(${state.currentX * 2}px, ${state.currentY * 2}px, 0)`;
                }
            });

            requestAnimationFrame(updateTilt);
        }

        // Request permission for iOS 13+
        function requestOrientationPermission() {
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation);
                            updateTilt();
                        }
                    })
                    .catch(console.error);
            } else {
                // Non-iOS or older iOS
                window.addEventListener('deviceorientation', handleDeviceOrientation);
                updateTilt();
            }
        }

        // Try to add listener directly (works on Android)
        window.addEventListener('deviceorientation', handleDeviceOrientation);
        updateTilt();

        // iOS: request permission on every touch (not just first)
        // iOS 13+ requires user gesture to request permission
        function handleTouchForPermission() {
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                requestOrientationPermission();
            }
        }

        document.body.addEventListener('touchstart', handleTouchForPermission);
        document.body.addEventListener('click', handleTouchForPermission);
        document.addEventListener('scroll', handleTouchForPermission, { passive: true });
    }

    // ====== 2. SCROLL REVEAL ANIMATIONS ======
    let revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');

    function checkRevealElements() {
        revealElements.forEach(el => {
            const delay = parseInt(el.getAttribute('data-delay')) || 0;
            if (isElementInViewport(el, 50)) {
                // Use a timeout to create the staggered effect
                setTimeout(() => {
                    el.classList.add('visible');
                }, delay);
            }
        });
    }

    // Check on scroll
    window.addEventListener('scroll', throttle(checkRevealElements, 100));
    
    // Initial check
    checkRevealElements();

    // ====== 3. SCROLL TO TOP BUTTON ======
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', throttle(function() {
            if (window.scrollY > 500) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }, 100));

        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ====== 4. PHOTO UPLOAD FUNCTIONALITY ======
    const uploadForm = document.getElementById('uploadForm');
    const photoInput = document.getElementById('photoInput');
    const fileNameDisplay = document.getElementById('fileName');
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadStatus = document.getElementById('uploadStatus');
    const guestPhotosGrid = document.getElementById('guestPhotos');
    const uploadBtn = uploadForm ? uploadForm.querySelector('.upload-btn') : null;

    // Preview selected images
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            const files = this.files;
            
            if (files.length === 0) {
                fileNameDisplay.textContent = '선택된 파일 없음';
                uploadPreview.classList.remove('has-images');
                uploadPreview.innerHTML = '';
                return;
            }

            fileNameDisplay.textContent = `${files.length}개의 파일 선택됨`;
            uploadPreview.innerHTML = '';
            uploadPreview.classList.add('has-images');

            Array.from(files).slice(0, 6).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    uploadPreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });

            if (files.length > 6) {
                const more = document.createElement('div');
                more.style.cssText = 'display:flex;align-items:center;justify-content:center;height:80px;color:#999;font-size:13px;';
                more.textContent = `+${files.length - 6}개 더`;
                uploadPreview.appendChild(more);
            }
        });
    }

    // Handle form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const files = photoInput.files;
            if (!files || files.length === 0) {
                showUploadStatus('사진을 선택해 주세요.', 'error');
                return;
            }

            // Disable button during upload
            uploadBtn.disabled = true;
            uploadBtn.textContent = '업로드 중...';
            showUploadStatus('사진을 업로드 중입니다...', '');

            try {
                const formData = new FormData();
                Array.from(files).forEach(file => {
                    formData.append('photos', file);
                });

                const response = await fetch(CONFIG.API_BASE_URL + '/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('업로드에 실패했습니다.');
                }

                const result = await response.json();
                showUploadStatus(`${result.count}개의 사진이 업로드되었습니다!`, 'success');
                uploadForm.reset();
                fileNameDisplay.textContent = '선택된 파일 없음';
                uploadPreview.classList.remove('has-images');
                uploadPreview.innerHTML = '';

                // Reload guest photos
                loadGuestPhotos();

            } catch (error) {
                console.error('Upload error:', error);
                showUploadStatus('업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = '업로드 하기';
            }
        });
    }

    function showUploadStatus(message, type) {
        if (uploadStatus) {
            uploadStatus.textContent = message;
            uploadStatus.className = 'upload-status';
            if (type) {
                uploadStatus.classList.add(type);
            }
        }
    }

    // ====== 5. LOAD GUEST PHOTOS ======
    async function loadGuestPhotos() {
        if (!guestPhotosGrid) return;

        try {
            const response = await fetch(CONFIG.API_BASE_URL + '/api/photos');
            
            if (!response.ok) {
                throw new Error('Failed to load photos');
            }

            const photos = await response.json();
            renderGuestPhotos(photos);
        } catch (error) {
            console.log('Could not load guest photos from server.');
            console.log('Make sure the upload server is running.');
            // Show placeholder/demo photos when server is not available
            showDemoPhotos();
        }
    }

    function renderGuestPhotos(photos) {
        if (!guestPhotosGrid) return;

        if (!photos || photos.length === 0) {
            guestPhotosGrid.innerHTML = '<div class="loading-photos">아직 업로드된 사진이 없습니다.<br>첫 번째 사진을 올려주세요! 📸</div>';
            return;
        }

        guestPhotosGrid.innerHTML = '';
        
        photos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'guest-photo-item';
            item.style.animationDelay = `${index * 0.1}s`;
            
            const img = document.createElement('img');
            img.src = CONFIG.API_BASE_URL + '/uploads/' + photo.filename;
            img.alt = 'Guest photo';
            img.loading = 'lazy';
            
            item.appendChild(img);
            guestPhotosGrid.appendChild(item);
        });
    }

    // Show demo photos when server is not available
    function showDemoPhotos() {
        if (!guestPhotosGrid) return;

        const demoImages = [
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80',
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
            'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&q=80',
            'https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&q=80'
        ];

        guestPhotosGrid.innerHTML = '';

        demoImages.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'guest-photo-item';
            item.style.animationDelay = `${index * 0.15}s`;
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Wedding photo';
            img.loading = 'lazy';
            
            item.appendChild(img);
            guestPhotosGrid.appendChild(item);
        });
    }

    // Load photos on page load
    loadGuestPhotos();

    // ====== 6. SMOOTH SCROLL FOR ANCHOR LINKS ======
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ====== 7. LIGHTBOX FOR GALLERY (Event Delegation) ======
    document.addEventListener('click', function(e) {
        const galleryItem = e.target.closest('.gallery-item');
        if (!galleryItem) return;

        const img = galleryItem.querySelector('img');
        if (!img) return;

        // Create lightbox
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
            cursor: pointer;
            padding: 20px;
        `;

        const lightboxImg = document.createElement('img');
        lightboxImg.src = img.src;
        lightboxImg.style.cssText = `
            max-width: 100%;
            max-height: 90vh;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            color: #fff;
            font-size: 40px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.3s;
            z-index: 10000;
        `;
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeLightbox();
        });

        lightbox.appendChild(closeBtn);
        lightbox.appendChild(lightboxImg);
        document.body.appendChild(lightbox);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Animate in
        requestAnimationFrame(() => {
            lightbox.style.opacity = '1';
            lightboxImg.style.transform = 'scale(1)';
        });

        // Click to close
        lightbox.addEventListener('click', closeLightbox);

        function closeLightbox() {
            lightbox.style.opacity = '0';
            lightboxImg.style.transform = 'scale(0.9)';
            document.body.style.overflow = '';
            setTimeout(() => {
                if (lightbox.parentNode) {
                    lightbox.parentNode.removeChild(lightbox);
                }
            }, 300);
        }

        // Close on escape key
        function handleEscape(e) {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);
    });

    // ====== 9. DYNAMIC GALLERY LOADING ======
    async function loadGalleryPhotos() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        try {
            // Fetch photo list from album folder via GitHub API
            const response = await fetch('https://api.github.com/repos/3Geon/3Geon.github.io/contents/wedding2/album');
            if (!response.ok) throw new Error('Failed to fetch photo list');

            const files = await response.json();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

            const photos = files
                .filter(file => {
                    const ext = '.' + file.name.split('.').pop().toLowerCase();
                    return imageExtensions.includes(ext);
                })
                .map(file => file.name)
                .sort();

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
                img.alt = '사진 ' + (index + 1);
                img.loading = 'lazy';

                item.appendChild(img);
                galleryGrid.appendChild(item);
            });

            // Update reveal elements and check
            revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');
            checkRevealElements();

        } catch (error) {
            console.log('Could not load gallery photos from API:', error);
            galleryGrid.innerHTML = '<div class="loading-photos">사진을 불러올 수 없습니다.<br>잠시 후 다시 시도해 주세요.</div>';
        }
    }

    // Load gallery photos on page load
    loadGalleryPhotos();

    // ====== 10. ACCOUNT ACCORDION & COPY ======
    const accountToggles = document.querySelectorAll('.account-toggle');
    
    accountToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            if (!content) return;

            const isOpen = content.classList.contains('open');

            // Close all
            document.querySelectorAll('.account-content').forEach(c => c.classList.remove('open'));
            document.querySelectorAll('.account-toggle').forEach(t => t.classList.remove('open'));

            // Toggle current
            if (!isOpen) {
                content.classList.add('open');
                this.classList.add('open');
            }
        });
    });

    // Copy account number
    const copyBtns = document.querySelectorAll('.copy-btn');
    
    copyBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = this.getAttribute('data-copy');
            if (!text) return;

            // Copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showCopyFeedback(this);
                }).catch(() => {
                    fallbackCopy(text);
                    showCopyFeedback(this);
                });
            } else {
                fallbackCopy(text);
                showCopyFeedback(this);
            }
        });
    });

    function showCopyFeedback(btn) {
        const originalHTML = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>';
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalHTML;
        }, 2000);
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.log('Copy failed:', err);
        }
        document.body.removeChild(textarea);
    }

    // ====== 8. RESPONSIVE RE-CHECK ON RESIZE ======
    window.addEventListener('resize', debounce(function() {
        checkRevealElements();
    }, 200));

    console.log('🎉 Wedding invitation loaded successfully!');
    console.log('💌 Congratulations!');
});