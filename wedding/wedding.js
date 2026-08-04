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

    // ====== 3. LOAD ALBUM PHOTOS ======
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
            albumGrid.innerHTML = '<div class="loading-photos">앨범 사진이 없습니다. album 폴더에 사진을 추가해주세요!</div>';
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