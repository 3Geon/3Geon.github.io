// ============================================
// Wedding Invitation - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {

    // ====== CONFIGURATION ======
    const CONFIG = {
        API_BASE_URL: window.location.origin,
        SCROLL_THROTTLE: 16,
        PARALLAX_INTENSITY: 0.4
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

    // ====== 1. PARALLAX SCROLLING ======
    const parallaxElements = document.querySelectorAll('.parallax');
    
    function updateParallax() {
        const scrollY = window.scrollY;
        
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 0.5;
            const yPos = -(scrollY * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    }

    window.addEventListener('scroll', throttle(updateParallax, CONFIG.SCROLL_THROTTLE));
    updateParallax();

    // ====== 2. SCROLL REVEAL ANIMATIONS ======
    const revealElements = document.querySelectorAll('.section-container, .time-card, .location-card, .album-item, .account-card');

    function checkRevealElements() {
        revealElements.forEach((el, index) => {
            if (isElementInViewport(el, 50)) {
                setTimeout(() => {
                    el.classList.add('visible');
                }, index * 50);
            }
        });
    }

    window.addEventListener('scroll', throttle(checkRevealElements, 100));
    checkRevealElements();

    // ====== 3. GUESTBOOK FUNCTIONALITY ======
    const guestbookForm = document.getElementById('guestbookForm');
    const guestName = document.getElementById('guestName');
    const guestMessage = document.getElementById('guestMessage');
    const guestPhoto = document.getElementById('guestPhoto');
    const fileNameDisplay = document.getElementById('fileName');
    const uploadPreview = document.getElementById('uploadPreview');
    const guestbookStatus = document.getElementById('guestbookStatus');
    const guestbookEntries = document.getElementById('guestbookEntries');
    const submitBtn = guestbookForm ? guestbookForm.querySelector('.upload-btn') : null;

    // Photo preview
    if (guestPhoto) {
        guestPhoto.addEventListener('change', function() {
            const file = this.files[0];
            
            if (!file) {
                fileNameDisplay.textContent = '선택된 파일 없음';
                uploadPreview.classList.remove('has-images');
                uploadPreview.innerHTML = '';
                return;
            }

            fileNameDisplay.textContent = file.name;
            uploadPreview.innerHTML = '';
            uploadPreview.classList.add('has-images');

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Preview';
                uploadPreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    // Submit guestbook
    if (guestbookForm) {
        guestbookForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = guestName.value.trim();
            const message = guestMessage.value.trim();
            const photo = guestPhoto.files[0];

            if (!name || !message) {
                showGuestbookStatus('이름과 메시지를 입력해 주세요.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = '등록 중...';
            showGuestbookStatus('방명록을 등록 중입니다...', '');

            try {
                const formData = new FormData();
                formData.append('name', name);
                formData.append('message', message);
                if (photo) {
                    formData.append('photo', photo);
                }

                const response = await fetch(CONFIG.API_BASE_URL + '/api/guestbook', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('등록에 실패했습니다.');
                }

                const result = await response.json();
                showGuestbookStatus('방명록이 등록되었습니다!', 'success');
                guestbookForm.reset();
                fileNameDisplay.textContent = '선택된 파일 없음';
                uploadPreview.classList.remove('has-images');
                uploadPreview.innerHTML = '';

                // Reload guestbook entries
                loadGuestbook();

            } catch (error) {
                console.error('Guestbook error:', error);
                showGuestbookStatus('등록에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '방명록 남기기';
            }
        });
    }

    function showGuestbookStatus(message, type) {
        if (guestbookStatus) {
            guestbookStatus.textContent = message;
            guestbookStatus.className = 'upload-status';
            if (type) {
                guestbookStatus.classList.add(type);
            }
        }
    }

    // Load guestbook entries
    async function loadGuestbook() {
        if (!guestbookEntries) return;

        try {
            const response = await fetch(CONFIG.API_BASE_URL + '/api/guestbook');
            
            if (!response.ok) {
                throw new Error('Failed to load guestbook');
            }

            const entries = await response.json();
            renderGuestbook(entries);
        } catch (error) {
            console.log('Could not load guestbook from server.');
            guestbookEntries.innerHTML = '<div class="loading-photos">아직 방명록이 없습니다. 첫 번째 방명록을 남겨주세요!</div>';
        }
    }

    function renderGuestbook(entries) {
        if (!guestbookEntries) return;

        if (!entries || entries.length === 0) {
            guestbookEntries.innerHTML = '<div class="loading-photos">아직 방명록이 없습니다. 첫 번째 방명록을 남겨주세요!</div>';
            return;
        }

        guestbookEntries.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'guestbook-entry';
            entryDiv.style.animationDelay = `${index * 0.1}s`;
            
            const date = new Date(entry.createdAt).toLocaleString('ko-KR');
            
            entryDiv.innerHTML = `
                <div class="guestbook-entry-header">
                    <span class="guestbook-entry-name">${entry.name}</span>
                    <span class="guestbook-entry-date">${date}</span>
                </div>
                <div class="guestbook-entry-message">${entry.message}</div>
                ${entry.photo ? `<div class="guestbook-entry-photo"><img src="${CONFIG.API_BASE_URL}/uploads/${entry.photo}" alt="Guest photo" loading="lazy"></div>` : ''}
            `;
            
            guestbookEntries.appendChild(entryDiv);
        });
    }

    // Load guestbook on page load
    loadGuestbook();

    // ====== 7. LOAD ALBUM PHOTOS ======
    async function loadAlbum() {
        const albumGrid = document.querySelector('.album-grid');
        if (!albumGrid) return;

        try {
            const response = await fetch(CONFIG.API_BASE_URL + '/api/album');
            
            if (!response.ok) {
                throw new Error('Failed to load album');
            }

            const photos = await response.json();
            renderAlbum(photos);
        } catch (error) {
            console.log('Could not load album from server.');
            albumGrid.innerHTML = '<div class="loading-photos">앨범 사진을 불러오는데 실패했습니다.</div>';
        }
    }

    function renderAlbum(photos) {
        const albumGrid = document.querySelector('.album-grid');
        if (!albumGrid) return;

        if (!photos || photos.length === 0) {
            albumGrid.innerHTML = '<div class="loading-photos">앨범 사진이 없습니다. photos 폴더에 사진을 추가해주세요!</div>';
            return;
        }

        albumGrid.innerHTML = '';
        
        photos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'album-item';
            item.style.animationDelay = `${index * 0.05}s`;
            
            const img = document.createElement('img');
            img.src = photo.path;
            img.alt = `사진 ${index + 1}`;
            img.loading = 'lazy';
            
            item.appendChild(img);
            albumGrid.appendChild(item);
        });
    }

    // Load album on page load
    loadAlbum();

    // ====== 4. ACCOUNT ACCORDION & COPY ======
    const accountCards = document.querySelectorAll('.account-card');
    const copyBtns = document.querySelectorAll('.copy-btn');

    // Accordion toggle
    accountCards.forEach(card => {
        const header = card.querySelector('.account-header');
        if (header) {
            header.addEventListener('click', function(e) {
                // Don't toggle if clicking copy button
                if (e.target.closest('.copy-btn')) return;
                
                const isOpen = card.classList.contains('open');
                
                // Close all other cards
                accountCards.forEach(c => c.classList.remove('open'));
                
                // Toggle current card
                if (!isOpen) {
                    card.classList.add('open');
                }
            });
        }
    });

    // Copy to clipboard
    copyBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const accountNumber = this.getAttribute('data-clipboard');
            
            try {
                await navigator.clipboard.writeText(accountNumber);
                
                // Show feedback
                const originalHTML = this.innerHTML;
                this.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                this.style.color = '#4a7c59';
                
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.style.color = '';
                }, 1500);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });

    // ====== 5. SMOOTH SCROLL ======
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

    // ====== 6. RESPONSIVE RE-CHECK ======
    window.addEventListener('resize', debounce(function() {
        checkRevealElements();
    }, 200));

    console.log('🎉 Wedding invitation loaded successfully!');
    console.log('💌 Congratulations!');
});