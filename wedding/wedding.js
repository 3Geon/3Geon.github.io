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

    // ====== 2. SCROLL REVEAL ANIMATIONS ======
    const revealElements = document.querySelectorAll('.text-fade-in, .image-fade-in');

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

    // ====== 7. LIGHTBOX FOR GALLERY ======
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            const img = this.querySelector('img');
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
    });

    // ====== 8. RESPONSIVE RE-CHECK ON RESIZE ======
    window.addEventListener('resize', debounce(function() {
        checkRevealElements();
    }, 200));

    console.log('🎉 Wedding invitation loaded successfully!');
    console.log('💌 Congratulations!');
});