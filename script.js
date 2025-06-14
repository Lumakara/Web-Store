/******************************************************************************
 * WEBSITE TOKO WEB FUTURISTIK v11.0 (Desain Suara Imersif & Kode Terpisah)
 *
 * DESKRIPSI:
 * File ini berisi semua logika JavaScript untuk website Lumakara.
 * Kode ini telah dipisahkan dari HTML untuk modularitas dan pemeliharaan yang lebih baik.
 * Ini mengelola semua fungsionalitas dinamis, termasuk:
 * - Manajemen Produk dan Data
 * - Fungsionalitas Keranjang Belanja
 * - Notifikasi Pengguna
 * - Efek Partikel dan Animasi
 * - Manajemen Audio dengan Tone.js
 * - Render Adegan 3D dengan Three.js
 * - Interaksi DOM dan Event Handling
 *
 * STRUKTUR KODE:
 * - ProductData: Array yang menyimpan data produk.
 * - formatCurrency: Fungsi utilitas untuk memformat harga.
 * - NotificationManager: Class untuk menampilkan notifikasi toast.
 * - CartManager: Class untuk mengelola logika keranjang belanja.
 * - ParticleFXManager: Class untuk membuat efek partikel saat item ditambahkan ke keranjang.
 * - AudioManager: Class untuk mengelola semua efek suara menggunakan Tone.js.
 * - ThreeManager: Class untuk mengelola adegan 3D di latar belakang dan bagian hero.
 * - AnimationManager: Class untuk mengelola animasi scroll.
 * - DOMManager: Class utama yang mengikat semua event listener dan memanipulasi DOM.
 * - AppManager: Class yang menginisialisasi seluruh aplikasi saat DOM dimuat.
 ******************************************************************************/

// Data Produk (Bisa diganti dengan API call di masa mendatang)
const ProductData = [
    { id: 1, name: "Jaket Chrome-X Quantum", category: "cyber-wear", price: 4599000, img: "https://placehold.co/600x600/00ffff/0d0d0d?text=Jaket+Cyber", desc: "Jaket adaptif dengan serat optik terintegrasi dan lapisan termal yang dapat diatur.", stock: 8 },
    { id: 2, name: "Neuro-Link Headset v3", category: "tech-gadget", price: 7899000, img: "https://placehold.co/600x600/ff00ff/0d0d0d?text=Headset+Neuro", desc: "Headset antarmuka otak-komputer untuk pengalaman audio imersif dan augmented reality.", stock: 3 },
    { id: 3, name: "Lukisan Digital 'Metropolis'", category: "digital-art", price: 1250000, img: "https://placehold.co/600x600/FFD700/0d0d0d?text=Seni+Digital", desc: "Karya seni digital edisi terbatas yang dibuat oleh AI generatif, dicetak pada kanvas akrilik.", stock: 0 },
    { id: 4, name: "Sepatu Anti-Gravitasi 'Strider'", category: "cyber-wear", price: 5250000, img: "https://placehold.co/600x600/9400D3/FFFFFF?text=Sepatu+Cyber", desc: "Sepatu ringan dengan sol elektromagnetik untuk mengurangi dampak saat melangkah.", stock: 12 },
    { id: 5, name: "Chrono-Watch Model T", category: "tech-gadget", price: 9999000, img: "https://placehold.co/600x600/32CD32/FFFFFF?text=Jam+Canggih", desc: "Jam tangan pintar dengan tampilan holografik dan pemantauan biometrik tingkat lanjut.", stock: 2 },
    { id: 6, name: "Patung 'Singularity'", category: "digital-art", price: 2100000, img: "https://placehold.co/600x600/FF4500/FFFFFF?text=Patung+3D", desc: "Patung yang dicetak 3D dari bahan polimer cerdas yang berubah bentuk sesuai suhu ruangan.", stock: 7 },
];

// Fungsi Utilitas untuk Format Mata Uang
const formatCurrency = (price) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

/**
 * Mengelola tampilan notifikasi toast.
 */
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
    }

    /**
     * Menampilkan notifikasi baru.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {string} iconClass - Kelas ikon Font Awesome.
     */
    show(message, iconClass = 'fa-check-circle') {
        const toast = document.createElement('div');
        toast.classList.add('toast-notification');
        const iconColor = iconClass === 'fa-exclamation-circle' ? 'var(--accent-orange)' : 'var(--accent-cyan)';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;

        this.container.appendChild(toast);
        toast.animate([{ transform: 'translateX(120%)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
        const fadeOutAnimation = toast.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 3500, easing: 'ease-out' });
        toast.querySelector('.toast-progress')?.animate([{ width: '100%' }, { width: '0%' }], { duration: 3500, easing: 'linear' });
        fadeOutAnimation.onfinish = () => toast.remove();
    }
}

/**
 * Mengelola semua logika terkait keranjang belanja.
 */
class CartManager {
    constructor(notificationManager) {
        this.notificationManager = notificationManager;
        this.storageKey = 'lumakaraCartV1';
        this.items = [];
        this.sidebar = document.getElementById('cart-sidebar');
        this.cartItemsContainer = document.getElementById('cart-items');
        this.totalPriceEl = document.getElementById('cart-total-price');
        this.cartBadges = document.querySelectorAll('.cart-badge');
        this.lastAction = { type: null, id: null };
    }

    /**
     * Menyimpan item keranjang ke Local Storage.
     */
    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    }

    /**
     * Memuat item keranjang dari Local Storage.
     * @returns {boolean} - True jika keranjang berhasil dimuat.
     */
    loadFromStorage() {
        const storedCart = localStorage.getItem(this.storageKey);
        if (storedCart) {
            this.items = JSON.parse(storedCart);
            // Validasi stok saat memuat
            this.items.forEach(item => {
                const product = ProductData.find(p => p.id === item.id);
                if (!product || product.stock < item.quantity) {
                    item.quantity = product ? product.stock : 0;
                }
            });
            this.items = this.items.filter(item => item.quantity > 0);
            this.saveToStorage();
            return this.items.length > 0;
        }
        return false;
    }

    /**
     * Menambahkan produk ke keranjang.
     * @param {number} productId - ID produk yang akan ditambahkan.
     * @returns {object|null} - Objek produk jika berhasil ditambahkan, jika tidak null.
     */
    addItem(productId) {
        const product = ProductData.find(p => p.id === productId);
        if (!product || product.stock === 0) {
            this.notificationManager.show('Produk ini telah habis.', 'fa-exclamation-circle');
            return null;
        }

        const existingItem = this.items.find(item => item.id === productId);
        const quantityInCart = existingItem ? existingItem.quantity : 0;
        
        if (quantityInCart >= product.stock) {
            this.notificationManager.show('Stok tidak mencukupi.', 'fa-exclamation-circle');
            return null;
        }

        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.items.push({ id: product.id, name: product.name, price: product.price, img: product.img, quantity: 1 });
        }
        this.lastAction = { type: 'add', id: productId };
        this.saveToStorage();
        this.update();
        return product;
    }

    /**
     * Menghapus produk dari keranjang.
     * @param {number} productId - ID produk yang akan dihapus.
     */
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.lastAction = { type: 'remove', id: productId };
        this.saveToStorage();
        this.update();
    }
    
    /**
     * Menambah jumlah item di keranjang.
     * @param {number} productId - ID produk.
     */
    increaseQuantity(productId) {
        const item = this.items.find(i => i.id === productId);
        const product = ProductData.find(p => p.id === productId);
        if (item && product) {
            if (item.quantity < product.stock) {
                item.quantity++;
                this.lastAction = { type: 'update', id: productId };
                this.saveToStorage();
                this.update();
            } else {
                 this.notificationManager.show('Anda telah mencapai batas stok.', 'fa-exclamation-circle');
            }
        }
    }

    /**
     * Mengurangi jumlah item di keranjang.
     * @param {number} productId - ID produk.
     */
    decreaseQuantity(productId) {
        const item = this.items.find(i => i.id === productId);
        if (item) {
            item.quantity--;
            if (item.quantity > 0) {
                this.lastAction = { type: 'update', id: productId };
                this.saveToStorage();
                this.update();
            }
            // Logika penghapusan saat kuantitas 0 ditangani di event listener
        }
    }
    
    /**
     * Memperbarui tampilan UI keranjang.
     */
    update() {
        if (!this.cartItemsContainer) return;
        this.cartItemsContainer.innerHTML = '';
        if (this.items.length === 0) {
            this.cartItemsContainer.innerHTML = `<div class="cart-empty-message"><i class="fas fa-ghost"></i><p>Keranjang Anda kosong.</p></div>`;
        } else {
            this.items.forEach(item => {
                const product = ProductData.find(p => p.id === item.id);
                let animationClass = '';
                if (this.lastAction.id === item.id) {
                    if (this.lastAction.type === 'add') animationClass = 'item-entering';
                    else if (this.lastAction.type === 'update') animationClass = 'updating';
                }
                const itemEl = document.createElement('div');
                itemEl.classList.add('cart-item');
                itemEl.dataset.productId = item.id;

                itemEl.innerHTML = `
                    <img src="${item.img}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${formatCurrency(item.price)}</p>
                        <div class="cart-item-controls">
                            <button class="quantity-btn decrease-qty-btn" data-product-id="${item.id}" aria-label="Kurangi jumlah">-</button>
                            <span class="item-quantity ${animationClass}">${item.quantity}</span>
                            <button class="quantity-btn increase-qty-btn" data-product-id="${item.id}" aria-label="Tambah jumlah" ${!product || item.quantity >= product.stock ? 'disabled' : ''}>+</button>
                        </div>
                    </div>
                    <button class="remove-item-btn" data-product-id="${item.id}" aria-label="Hapus item"><i class="fas fa-trash-alt"></i></button>
                `;
                
                if (animationClass === 'item-entering') itemEl.classList.add('item-entering');
                
                this.cartItemsContainer.appendChild(itemEl);

                if(animationClass) {
                   const animatedEl = itemEl.querySelector('.updating') || itemEl;
                   animatedEl.addEventListener('animationend', () => animatedEl.classList.remove('item-entering', 'updating'), { once: true });
                }
            });
        }

        const totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        if (this.totalPriceEl) this.totalPriceEl.textContent = formatCurrency(totalPrice);
        
        const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
        this.cartBadges.forEach(badge => {
            badge.textContent = totalItems;
            badge.classList.toggle('visible', totalItems > 0);
        });
        
        this.lastAction = { type: null, id: null };
    }
    
    open() { this.sidebar?.classList.add('active'); }
    close() { this.sidebar?.classList.remove('active'); }
}

/**
 * Mengelola efek partikel untuk interaksi UI.
 */
class ParticleFXManager {
    constructor() {
        this.container = document.getElementById('particle-fx-container');
        this.particles = [];
        this.particlePoolSize = 30;
        if (this.container) this.createParticlePool();
    }

    createParticlePool() {
        for (let i = 0; i < this.particlePoolSize; i++) {
            const p = document.createElement('div');
            p.classList.add('add-to-cart-particle');
            this.container.appendChild(p);
            this.particles.push(p);
        }
    }

    /**
     * Memainkan animasi partikel dari titik awal ke ikon keranjang.
     * @param {number} startX - Posisi X awal.
     * @param {number} startY - Posisi Y awal.
     */
    play(startX, startY) {
        if (!this.container) return;
        const cartIcon = Array.from(document.querySelectorAll('.cart-icon')).find(icon => icon.offsetParent !== null);
        if (!cartIcon) return;
        const endRect = cartIcon.getBoundingClientRect();
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        let activeParticles = 0;
        for (let p of this.particles) {
            if(activeParticles >= 15 || p.isAnimating) continue; 
            activeParticles++;
            p.isAnimating = true;
            const randomX = (Math.random() - 0.5) * 60;
            const randomY = (Math.random() - 0.5) * 60;
            const duration = 800 + Math.random() * 500;
            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1, left: `${startX}px`, top: `${startY}px` },
                { transform: `translate(${endX - startX + randomX}px, ${endY - startY + randomY}px) scale(0)`, opacity: 0 }
            ], { duration: duration, easing: 'cubic-bezier(0.5, 0, 0.75, 1)', }).onfinish = () => { p.isAnimating = false; };
        }
    }
}

/**
 * Mengelola efek suara menggunakan Tone.js.
 */
class AudioManager {
     constructor() {
        this.isReady = false;
        if (typeof Tone === 'undefined') return;
        this.synths = {
            click: new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.1 } }).toDestination(),
            success: new Tone.PolySynth(Tone.Synth, { volume: -10, envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.4 } }).toDestination(),
            remove: new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.2 } }).toDestination(),
            menuOpen: new Tone.FMSynth({ volume: -12, harmonicity: 1.5, modulationIndex: 3, envelope: { attack: 0.01, decay: 0.3, release: 0.4 } }).toDestination(),
            menuClose: new Tone.FMSynth({ volume: -12, harmonicity: 1.5, modulationIndex: 3, envelope: { attack: 0.01, decay: 0.3, release: 0.4 } }).toDestination(),
            menuHover: new Tone.Synth({ volume: -18, oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination()
        };
        document.body.addEventListener('click', () => this.init(), { once: true });
    }
    async init() { if (this.isReady || typeof Tone === 'undefined') return; await Tone.start(); this.isReady = true; }
    play(sound, note = 'C4', duration = '8n') {
        if (!this.isReady || !this.synths[sound]) return;
        try {
            if (sound === 'success') this.synths.success.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', Tone.now());
            else this.synths[sound].triggerAttackRelease(note, duration);
        } catch (e) { console.error("Error playing sound:", e); }
    }
    playMenuOpen() {
        if(!this.isReady) return;
        this.synths.menuOpen.triggerAttackRelease('C3', '0.4');
        this.synths.menuOpen.frequency.rampTo('E4', 0.3);
    }
    playMenuClose() {
        if(!this.isReady) return;
        this.synths.menuClose.triggerAttackRelease('E4', '0.4');
        this.synths.menuClose.frequency.rampTo('C3', 0.3);
    }
    playMenuHover(note) {
        if(!this.isReady) return;
        this.synths.menuHover.triggerAttackRelease(note, '16n');
    }
}

/**
 * Mengelola adegan 3D menggunakan Three.js.
 */
class ThreeManager {
    constructor() {
        this.isAvailable = typeof THREE !== 'undefined';
        if (!this.isAvailable) return;
        this.initParticleScene();
        this.initHeroScene();
        window.addEventListener('resize', this.onResize.bind(this));
        this.animate();
    }
    initParticleScene() {
        this.particleScene = new THREE.Scene();
        this.particleCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.particleCamera.position.z = 5;
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        this.particleRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.particleRenderer.setSize(window.innerWidth, window.innerHeight);
        this.particleRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 5000;
        const posArray = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.005, color: 0xffffff });
        this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this.particleScene.add(this.particlesMesh);
    }
    initHeroScene() {
        const container = document.getElementById('hero-canvas-container');
        if (!container) return;
        this.heroScene = new THREE.Scene();
        this.heroCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.heroCamera.position.z = 5;
        this.heroRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.heroRenderer.setSize(container.clientWidth, container.clientHeight);
        this.heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.heroRenderer.domElement);
        const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 150, 20);
        const material = new THREE.MeshStandardMaterial({ color: 0x9966cc, metalness: 0.8, roughness: 0.2, wireframe: true });
        this.heroMesh = new THREE.Mesh(geometry, material);
        this.heroScene.add(this.heroMesh);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.heroScene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x00ffff, 1);
        pointLight.position.set(5, 5, 5);
        this.heroScene.add(pointLight);
    }
    onResize() {
        this.particleCamera.aspect = window.innerWidth / window.innerHeight;
        this.particleCamera.updateProjectionMatrix();
        this.particleRenderer.setSize(window.innerWidth, window.innerHeight);
        const heroContainer = document.getElementById('hero-canvas-container');
        if (heroContainer) {
            this.heroCamera.aspect = heroContainer.clientWidth / heroContainer.clientHeight;
            this.heroCamera.updateProjectionMatrix();
            this.heroRenderer.setSize(heroContainer.clientWidth, heroContainer.clientHeight);
        }
    }
    animate() {
        if (!this.isAvailable) return;
        requestAnimationFrame(this.animate.bind(this));
        const elapsedTime = Date.now() * 0.0001;
        if(this.particlesMesh) this.particlesMesh.rotation.y = elapsedTime * 0.2;
        if(this.particleRenderer) this.particleRenderer.render(this.particleScene, this.particleCamera);
        if (this.heroMesh) {
            this.heroMesh.rotation.x = elapsedTime * 0.5;
            this.heroMesh.rotation.y = elapsedTime * 0.3;
            if(this.heroRenderer) this.heroRenderer.render(this.heroScene, this.heroCamera);
        }
    }
}

/**
 * Mengelola animasi fade-in saat elemen masuk ke viewport.
 */
class AnimationManager {
    constructor() {
        this.observer = new IntersectionObserver(this.handleIntersect.bind(this), { root: null, rootMargin: '0px', threshold: 0.1 });
        this.initAnimations();
    }
    initAnimations() { document.querySelectorAll('.fade-in-up').forEach(el => this.observer.observe(el)); }
    handleIntersect(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }
}

/**
 * Mengelola semua interaksi DOM dan mengikat event listener.
 */
class DOMManager {
    constructor(audioManager, particleFXManager, cartManager, notificationManager) {
        this.audio = audioManager;
        this.particleFX = particleFXManager;
        this.cart = cartManager;
        this.notifications = notificationManager;
        
        this.initMobileMenu();
        this.initShop();
        this.initModal();
        this.initCartSidebar();
        this.initNewsletterForm();
        this.initSoundEvents();
        this.initGlobalEventListeners();
        const currentYearEl = document.getElementById('current-year');
        if(currentYearEl) currentYearEl.textContent = new Date().getFullYear();
    }
    
    initMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        if (!menuBtn || !menu || !menuOverlay) return;
        const menuLinks = menu.querySelectorAll('a');
        const hoverNotes = ['C5', 'D5', 'E5', 'G5'];

        const closeMenu = () => {
            menuBtn.classList.remove('active');
            menu.classList.remove('active');
            menuOverlay.classList.remove('active');
            menuBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        };
        
        const openMenu = () => {
            menuBtn.classList.add('active');
            menu.classList.add('active');
            menuOverlay.classList.add('active');
            menuBtn.setAttribute('aria-expanded', 'true');
            document.body.classList.add('menu-open');
        };

        menuBtn.addEventListener('click', () => {
            const isOpened = menuBtn.classList.contains('active');
            if (isOpened) {
                closeMenu();
                this.audio.playMenuClose();
            } else {
                openMenu();
                this.audio.playMenuOpen();
            }
        });
        
        menuLinks.forEach((link, index) => {
            link.addEventListener('click', closeMenu);
            link.addEventListener('mouseenter', () => {
               this.audio.playMenuHover(hoverNotes[index % hoverNotes.length]);
            });
        });
        
        menuOverlay.addEventListener('click', () => {
            closeMenu();
            this.audio.playMenuClose();
        });
    }

    initShop() {
        this.populateFeaturedScroller();
        this.initShopControls();
        this.updateProductGrid();
    }

    _generateCardHTML(product) {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock > 0 && product.stock <= 3;
        return `
            <div class="product-card ${isOutOfStock ? 'is-out-of-stock' : ''}" data-product-id="${product.id}" data-category="${product.category}">
                <div class="product-image-container">
                    ${isLowStock ? `<div class="low-stock-indicator"><i class="fas fa-fire-alt mr-2"></i>Stok Terbatas</div>` : ''}
                    <img src="${product.img}" alt="${product.name}" loading="lazy"/>
                    <div class="product-overlay">
                            <button class="overlay-btn quick-view-btn" data-product-id="${product.id}"><i class="fas fa-eye mr-2"></i> Quick View</button>
                            <button 
                            class="overlay-btn add-to-cart-btn ${isOutOfStock ? 'out-of-stock' : ''}" 
                            data-product-id="${product.id}"
                            ${isOutOfStock ? 'disabled' : ''}>
                            <i class="fas ${isOutOfStock ? 'fa-times-circle' : 'fa-shopping-cart'} mr-2"></i> ${isOutOfStock ? 'Stok Habis' : 'Add to Cart'}
                            </button>
                    </div>
                </div>
                <div class="card-content">
                    <p class="product-category">${product.category}</p>
                    <h3>${product.name}</h3>
                    <p class="product-price">${formatCurrency(product.price)}</p>
                </div>
            </div>
        `;
    }

    populateFeaturedScroller() {
        const featuredScroller = document.getElementById('featured-product-scroller');
        if (!featuredScroller) return;
        const featuredProducts = ProductData.slice(0, 6);
        const featuredHTML = featuredProducts.map(p => this._generateCardHTML(p)).join('');
        featuredScroller.innerHTML = featuredHTML + featuredHTML; // Duplikasi untuk efek scroll tak terbatas
        this.init3DTiltEffect(featuredScroller.querySelectorAll('.product-card'));
    }

    initShopControls() {
        const filterButtons = document.querySelectorAll('.filter-button');
        const sortSelect = document.getElementById('sort-by');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.audio.play('click', 'E4');
                this.updateProductGrid();
            });
        });
        if(sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.audio.play('click', 'F#4');
                this.updateProductGrid();
            });
        }
        
        const scrollContainer = document.querySelector('.filters-scroll-container');
        if (!scrollContainer) return;
        const updateGradients = () => {
            const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            scrollContainer.style.setProperty('--before-opacity', scrollContainer.scrollLeft > 10 ? '1' : '0');
            scrollContainer.style.setProperty('--after-opacity', scrollContainer.scrollLeft < maxScrollLeft - 10 ? '1' : '0');
        };
         scrollContainer.addEventListener('scroll', updateGradients);
         setTimeout(updateGradients, 100);
         window.addEventListener('resize', () => setTimeout(updateGradients, 100));
    }

    updateProductGrid() {
        const activeFilter = document.querySelector('.filter-button.active');
        const sortSelect = document.getElementById('sort-by');
        if (!activeFilter || !sortSelect) return;

        const filterValue = activeFilter.dataset.filter;
        const sortValue = sortSelect.value;
        let displayedProducts = (filterValue === 'all') ? ProductData : ProductData.filter(p => p.category === filterValue);
        let sortedProducts = [...displayedProducts];
        switch(sortValue) {
            case 'price-asc': sortedProducts.sort((a, b) => a.price - b.price); break;
            case 'price-desc': sortedProducts.sort((a, b) => b.price - a.price); break;
            case 'name-asc': sortedProducts.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': sortedProducts.sort((a, b) => b.name.localeCompare(a.name)); break;
        }
        this.renderProductGrid(sortedProducts);
    }

    renderProductGrid(products) {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        grid.style.transition = 'opacity 0.3s ease-out';
        grid.style.opacity = 0;
        setTimeout(() => {
            grid.innerHTML = products.map(p => this._generateCardHTML(p)).join('');
            this.init3DTiltEffect(grid.querySelectorAll('.product-card'));
            grid.style.opacity = 1;
        }, 300);
    }

    init3DTiltEffect(cards) {
        if (!cards) return;
        cards.forEach(card => {
            if (card.classList.contains('is-out-of-stock')) {
                card.style.transform = '';
                return;
            }
            card.addEventListener('mousemove', (e) => {
                const { left, top, width, height } = card.getBoundingClientRect();
                const x = e.clientX - left;
                const y = e.clientY - top;
                const centerX = width / 2;
                const centerY = height / 2;
                const deltaX = (x - centerX) / centerX;
                const deltaY = (y - centerY) / centerY;
                const maxRotate = 12;
                const rotateX = deltaY * -maxRotate;
                const rotateY = deltaX * maxRotate;
                requestAnimationFrame(() => card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
            });
            card.addEventListener('mouseenter', () => card.style.transition = 'transform 0.1s linear');
            card.addEventListener('mouseleave', () => {
                 card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                requestAnimationFrame(() => card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
            });
        });
    }

    initModal() {
        const modal = document.getElementById('product-modal');
        if (!modal) return;
        const closeBtn = modal.querySelector('.modal-close');
        const addToCartBtn = modal.querySelector('#modal-add-to-cart-btn');
        document.body.addEventListener('click', (e) => {
            const quickViewBtn = e.target.closest('.quick-view-btn');
            if (quickViewBtn) {
                const productId = parseInt(quickViewBtn.dataset.productId);
                const product = ProductData.find(p => p.id === productId);
                if (product) {
                    modal.querySelector('#modal-title').textContent = product.name;
                    modal.querySelector('#modal-image').src = product.img.replace('600x600', '800x800');
                    modal.querySelector('#modal-category').textContent = product.category;
                    modal.querySelector('#modal-description').textContent = product.desc;
                    modal.querySelector('#modal-price').textContent = formatCurrency(product.price);
                    addToCartBtn.dataset.productId = product.id;
                    if (product.stock === 0) {
                        addToCartBtn.disabled = true;
                        addToCartBtn.innerHTML = `<i class="fas fa-times-circle mr-2"></i> Stok Habis`;
                    } else {
                        addToCartBtn.disabled = false;
                        addToCartBtn.innerHTML = `<i class="fas fa-shopping-cart mr-2"></i> Tambah ke Keranjang`;
                    }
                    modal.classList.add('active');
                }
            }
        });
        closeBtn.addEventListener('click', () => { this.audio.play('click', 'C3', '4n'); modal.classList.remove('active'); });
        modal.addEventListener('click', e => { if (e.target === modal) { this.audio.play('click', 'C3', '4n'); modal.classList.remove('active'); } });
    }

    initCartSidebar() {
        const cartIcons = document.querySelectorAll('.cart-icon');
        const closeBtn = this.cart.sidebar?.querySelector('.cart-close-btn');
        if (!closeBtn || !this.cart.sidebar) return;
        
        cartIcons.forEach(icon => icon.addEventListener('click', (e) => { e.preventDefault(); this.audio.play('click', 'F4'); this.cart.open(); }));
        closeBtn.addEventListener('click', () => { this.audio.play('click', 'E4'); this.cart.close(); });
        this.cart.sidebar.addEventListener('click', e => {
           const target = e.target;
           const cartItemElement = target.closest('.cart-item');
           if (!cartItemElement) return;

           const productId = parseInt(cartItemElement.dataset.productId);
           const item = this.cart.items.find(i => i.id === productId);
           if (!item) return;

           if (target.closest('.remove-item-btn') || (target.closest('.decrease-qty-btn') && item.quantity === 1)) {
               this.audio.play('remove', 'C2', '4n');
               cartItemElement.classList.add('item-leaving');
               cartItemElement.addEventListener('animationend', () => this.cart.removeItem(productId), { once: true });
           } else if(target.closest('.increase-qty-btn')) {
               this.audio.play('click', 'G4', '16n');
               this.cart.increaseQuantity(productId);
           } else if(target.closest('.decrease-qty-btn')) {
               this.audio.play('click', 'D4', '16n');
               this.cart.decreaseQuantity(productId);
           }
        });
    }
    
    initNewsletterForm() {
        const form = document.getElementById('newsletter-form');
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            this.audio.play('success');
            const button = form.querySelector('button');
            this.notifications.show('Terima kasih telah mendaftar!');
            button.textContent = 'Mendaftar...';
            setTimeout(() => {
                button.textContent = 'Terdaftar!';
                form.reset();
                 setTimeout(() => { button.textContent = 'Daftar'; }, 3000);
            }, 1500);
        });
    }
    
    animateCartIcon() {
        const cartIcon = Array.from(document.querySelectorAll('.cart-icon')).find(icon => icon.offsetParent !== null);
        if(cartIcon) {
            cartIcon.classList.add('animate');
            cartIcon.addEventListener('animationend', () => cartIcon.classList.remove('animate'), { once: true });
        }
    }
    
    initGlobalEventListeners() {
        document.body.addEventListener('click', (e) => {
             const addToCartBtn = e.target.closest('.add-to-cart-btn');
             if (addToCartBtn) {
                 const productId = parseInt(addToCartBtn.dataset.productId);
                 if (!productId || addToCartBtn.disabled) return;
                 const addedProduct = this.cart.addItem(productId);
                 if (addedProduct) {
                     this.audio.play('success');
                     this.notifications.show(`'${addedProduct.name}' ditambahkan`);
                     const rect = addToCartBtn.getBoundingClientRect();
                     this.particleFX.play(rect.left + rect.width / 2, rect.top + rect.height / 2);
                     setTimeout(() => this.animateCartIcon(), 800);
                     if (addToCartBtn.id === 'modal-add-to-cart-btn') {
                         document.getElementById('product-modal')?.classList.remove('active');
                     }
                 }
             }
        });
    }

    initSoundEvents() {
        document.querySelectorAll('a, button, .sound-click').forEach(el => {
            el.addEventListener('click', (e) => {
                // Hindari pemutaran suara ganda untuk tombol yang sudah memiliki suara spesifik
                if (!e.target.closest('.add-to-cart-btn, .quick-view-btn, .filter-button, #sort-by, .cart-icon, .remove-item-btn, .quantity-btn, #mobile-menu-btn')) {
                    this.audio.play('click');
                }
            });
        });
    }
}

/**
 * Titik masuk utama aplikasi. Menginisialisasi semua manajer.
 */
class AppManager {
    constructor() {
        // Menunggu DOM sepenuhnya dimuat sebelum menjalankan skrip
        document.addEventListener('DOMContentLoaded', () => {
            this.notifications = new NotificationManager();
            this.cart = new CartManager(this.notifications);
            this.audio = new AudioManager();
            this.particleFX = new ParticleFXManager();
            this.dom = new DOMManager(this.audio, this.particleFX, this.cart, this.notifications);
            this.animations = new AnimationManager();
            this.three = new ThreeManager();
            
            const wasCartLoaded = this.cart.loadFromStorage();
            this.cart.update();

            if (wasCartLoaded) {
                setTimeout(() => {
                    this.notifications.show('Selamat datang kembali! Keranjang Anda telah kami pulihkan.', 'fa-magic');
                }, 1200);
            }

            // Nonaktifkan canvas 3D jika Three.js tidak tersedia
            if (!this.three.isAvailable) {
               document.querySelectorAll('#hero-canvas-container, #particle-canvas').forEach(el => el.style.display = 'none');
            }
        });
    }
}

// Inisialisasi Aplikasi
const app = new AppManager();

