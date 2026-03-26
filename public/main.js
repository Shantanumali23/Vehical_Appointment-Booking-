/* ============================================================
   AutoBazaar — main.js
   Frontend logic: listings, auth, appointments, modals, toasts
   All API calls target: http://localhost:5000/api/...
   ============================================================ */

const API = 'http://localhost:8080/api';

// ===== STATE =====
let currentUser = null;
let allVehicles = [];
let displayedCount = 0;
const PAGE_SIZE = 6;

// ===== MOCK VEHICLE DATA (fallback if server not running) =====
const MOCK_VEHICLES = [
    { _id: '1', title: 'Honda City VX', category: 'car', brand: 'Honda', price: 695000, year: 2019, km: 42000, fuel: 'Petrol', transmission: 'Manual', color: 'Pearl White', description: 'Well-maintained Honda City VX with full service history. Single owner, no accidents. All papers clear. New tyres installed 6 months ago.', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&q=80', location: 'Pune', verified: true },
    { _id: '2', title: 'Royal Enfield Classic 350', category: 'bike', brand: 'Royal Enfield', price: 155000, year: 2020, km: 18000, fuel: 'Petrol', transmission: 'Manual', color: 'Stealth Black', description: 'Classic 350 in excellent condition. Low mileage, fully serviced. Original paint, all accessories intact. Perfect for highway rides.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', location: 'Mumbai', verified: true },
    { _id: '3', title: 'Maruti Swift ZXI+', category: 'car', brand: 'Maruti Suzuki', price: 520000, year: 2021, km: 28000, fuel: 'Petrol', transmission: 'Automatic', color: 'Magma Grey', description: 'Top variant Swift with sunroof. Excellent city car, very fuel efficient. Under warranty till 2024.', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&q=80', location: 'Pune', verified: true },
    { _id: '4', title: 'Activa 6G Deluxe', category: 'scooter', brand: 'Honda', price: 68000, year: 2022, km: 8500, fuel: 'Petrol', transmission: 'Automatic', color: 'Pearl Siren Blue', description: 'Almost new Honda Activa 6G. Under 10k km, first owner. PUC valid. Excellent daily commuter.', image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80', location: 'Nagpur', verified: false },
    { _id: '5', title: 'Hyundai Creta SX', category: 'car', brand: 'Hyundai', price: 1350000, year: 2022, km: 22000, fuel: 'Diesel', transmission: 'Automatic', color: 'Typhoon Silver', description: 'Loaded Creta SX(O) with panoramic sunroof, 360° camera, Bose audio. 1 owner, corporate-maintained. Fully insured.', image: 'https://images.unsplash.com/photo-1571987502051-3ab5e7e1c1b4?w=500&q=80', location: 'Pune', verified: true },
    { _id: '6', title: 'KTM Duke 390', category: 'bike', brand: 'KTM', price: 185000, year: 2021, km: 14000, fuel: 'Petrol', transmission: 'Manual', color: 'White', description: 'Sporty KTM Duke 390 with all original parts. Regularly serviced at KTM service center. Track ready!', image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500&q=80', location: 'Mumbai', verified: true },
    { _id: '7', title: 'Tata Nexon EV Max', category: 'car', brand: 'Tata', price: 1620000, year: 2023, km: 12000, fuel: 'Electric', transmission: 'Automatic', color: 'Pristine White', description: 'Brand new condition Nexon EV Max with 437km range. Under full warranty. Charging cable & accessories included.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=500&q=80', location: 'Pune', verified: true },
    { _id: '8', title: 'Yamaha FZ-S V3', category: 'bike', brand: 'Yamaha', price: 98000, year: 2022, km: 9200, fuel: 'Petrol', transmission: 'Manual', color: 'Metallic Black', description: 'Yamaha FZ-S V3 FI in mint condition. Connected instrument cluster, single owner. 2 years insurance remaining.', image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=500&q=80', location: 'Nashik', verified: false },
    { _id: '9', title: 'Tata Ace HT Pickup', category: 'truck', brand: 'Tata', price: 490000, year: 2020, km: 55000, fuel: 'Diesel', transmission: 'Manual', color: 'Arctic White', description: 'Tata Ace in good running condition. Perfect for last-mile delivery. All documents clear, fitness valid for 2 years.', image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=500&q=80', location: 'Pune', verified: true },
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initAuth();
    loadVehicles();
    initAppointmentForm();
    initDateMin();
    checkStoredSession();
});

// ===== NAVBAR =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    document.getElementById('hamburger').addEventListener('click', () => {
        document.getElementById('navLinks').classList.toggle('open');
    });
    document.getElementById('openLoginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('openSignupBtn').addEventListener('click', () => openModal('signupModal'));
}

function setNavUser(user) {
    const actions = document.querySelector('.nav-actions');
    if (user) {
        actions.innerHTML = `
      <div class="nav-user">
        <div class="nav-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <span class="nav-user-name">${user.name.split(' ')[0]}</span>
      </div>
      <button class="btn-ghost" onclick="logout()">Sign Out</button>`;
    } else {
        actions.innerHTML = `
      <button class="btn-ghost" id="openLoginBtn">Sign In</button>
      <button class="btn-primary" id="openSignupBtn">Sign Up</button>`;
        document.getElementById('openLoginBtn').addEventListener('click', () => openModal('loginModal'));
        document.getElementById('openSignupBtn').addEventListener('click', () => openModal('signupModal'));
    }
}

// ===== SCROLL HELPER =====
function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ===== LOAD VEHICLES =====
async function loadVehicles() {
    try {
        const res = await fetch(`${API}/vehicles`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        allVehicles = data.vehicles || data;
    } catch {
        allVehicles = MOCK_VEHICLES;
    }
    displayedCount = 0;
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '';
    renderVehicles(allVehicles);
    populateVehicleSelect(allVehicles);
}

function renderVehicles(vehicles) {
    const grid = document.getElementById('listingsGrid');
    const slice = vehicles.slice(displayedCount, displayedCount + PAGE_SIZE);

    if (displayedCount === 0 && slice.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-car-crash"></i><p>No vehicles found matching your search.</p></div>`;
        document.getElementById('loadMoreBtn').style.display = 'none';
        return;
    }

    slice.forEach(v => {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${v.image}" alt="${v.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=500&q=80'"/>
        <span class="card-badge badge-${v.category}">${v.category}</span>
        <button class="card-fav" onclick="event.stopPropagation()"><i class="far fa-heart"></i></button>
        ${v.verified ? '<span class="hero-card-badge" style="top:auto;bottom:12px;right:12px;font-size:0.7rem;"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${v.title}</div>
        <div class="card-year-km">${v.year} &bull; ${formatKm(v.km)} km &bull; ${v.location}</div>
        <div class="card-specs">
          <span class="spec-pill"><i class="fas fa-gas-pump"></i>${v.fuel}</span>
          <span class="spec-pill"><i class="fas fa-cog"></i>${v.transmission}</span>
          <span class="spec-pill"><i class="fas fa-palette"></i>${v.color}</span>
        </div>
        <div class="card-footer">
          <div class="card-price">₹${formatPrice(v.price)}<span> onwards</span></div>
          <button class="btn-card" onclick="event.stopPropagation(); bookForVehicle('${v._id}')">Book Visit</button>
        </div>
      </div>`;
        card.addEventListener('click', () => openVehicleModal(v));
        grid.appendChild(card);
    });

    displayedCount += slice.length;
    document.getElementById('loadMoreBtn').style.display =
        displayedCount >= vehicles.length ? 'none' : 'inline-block';
}

document.getElementById('loadMoreBtn').addEventListener('click', () => {
    const filtered = getFilteredVehicles();
    renderVehicles(filtered);
});

// ===== FILTER / SEARCH =====
function getFilteredVehicles() {
    const cat = document.getElementById('filterCategory').value;
    const budget = parseInt(document.getElementById('filterBudget').value) || Infinity;
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    return allVehicles.filter(v =>
        (!cat || v.category === cat) &&
        v.price <= budget &&
        (!query || v.title.toLowerCase().includes(query) || v.brand.toLowerCase().includes(query))
    );
}

document.getElementById('applyFilters').addEventListener('click', () => {
    const filtered = getFilteredVehicles();
    displayedCount = 0;
    document.getElementById('listingsGrid').innerHTML = '';
    renderVehicles(filtered);
});

document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('applyFilters').click();
});

// ===== VEHICLE MODAL =====
function openVehicleModal(v) {
    const content = document.getElementById('vehicleModalContent');
    content.innerHTML = `
    <img src="${v.image}" class="vmodal-img" alt="${v.title}" onerror="this.src='https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=500&q=80'"/>
    <div class="vmodal-body">
      <div class="vmodal-header">
        <div class="vmodal-title">${v.title}</div>
        <div class="vmodal-price">₹${formatPrice(v.price)}</div>
      </div>
      <div class="vmodal-specs">
        <span class="spec-pill"><i class="fas fa-calendar"></i>${v.year}</span>
        <span class="spec-pill"><i class="fas fa-road"></i>${formatKm(v.km)} km</span>
        <span class="spec-pill"><i class="fas fa-gas-pump"></i>${v.fuel}</span>
        <span class="spec-pill"><i class="fas fa-cog"></i>${v.transmission}</span>
        <span class="spec-pill"><i class="fas fa-map-marker-alt"></i>${v.location}</span>
        <span class="spec-pill"><i class="fas fa-palette"></i>${v.color}</span>
      </div>
      <p class="vmodal-desc">${v.description}</p>
      <div class="vmodal-actions">
        <button class="btn-vmodal-primary" onclick="bookForVehicle('${v._id}'); closeModal('vehicleModal');">
          <i class="fas fa-calendar-check"></i> Book Inspection
        </button>
        <button class="btn-vmodal-secondary" onclick="closeModal('vehicleModal')">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    </div>`;
    openModal('vehicleModal');
}

function bookForVehicle(id) {
    const vehicle = allVehicles.find(v => v._id === id);
    if (vehicle) {
        document.getElementById('apptVehicle').value = id;
        scrollToSection('appointments');
    }
}

// ===== VEHICLE SELECT IN FORM =====
function populateVehicleSelect(vehicles) {
    const sel = document.getElementById('apptVehicle');
    sel.innerHTML = '<option value="">Select a vehicle…</option>';
    vehicles.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v._id;
        opt.textContent = `${v.title} — ₹${formatPrice(v.price)}`;
        sel.appendChild(opt);
    });
}

// ===== DATE MIN =====
function initDateMin() {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    document.getElementById('apptDate').min = today.toISOString().split('T')[0];
}

// ===== APPOINTMENT FORM =====
function initAppointmentForm() {
    document.getElementById('bookBtn').addEventListener('click', submitAppointment);
}

async function submitAppointment() {
    const name = document.getElementById('apptName').value.trim();
    const phone = document.getElementById('apptPhone').value.trim();
    const email = document.getElementById('apptEmail').value.trim();
    const vehicleId = document.getElementById('apptVehicle').value;
    const date = document.getElementById('apptDate').value;
    const time = document.getElementById('apptTime').value;
    const location = document.getElementById('apptLocation').value.trim();
    const notes = document.getElementById('apptNotes').value.trim();
    const msg = document.getElementById('formMsg');

    if (!name || !phone || !email || !vehicleId || !date || !time) {
        showFormMsg(msg, 'error', 'Please fill in all required fields.');
        return;
    }
    if (!validateEmail(email)) {
        showFormMsg(msg, 'error', 'Please enter a valid email address.');
        return;
    }

    const vehicle = allVehicles.find(v => v._id === vehicleId);
    const payload = {
        name, phone, email,
        vehicleId,
        vehicleName: vehicle?.title || vehicleId,
        date, time, location, notes,
        userId: currentUser?._id || null,
        status: 'pending'
    };

    const btn = document.getElementById('bookBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');

        showFormMsg(msg, 'success', `✅ Appointment confirmed for ${date} at ${time}! We'll send a confirmation to ${email}.`);
        showToast('success', 'Appointment booked! Check your email for confirmation.');
        document.getElementById('appointmentForm').reset();
        if (currentUser) loadMyAppointments();
    } catch (err) {
        // If server is not running, show success with local save
        showFormMsg(msg, 'success', `✅ Appointment noted for ${date} at ${time}! (Server offline — data saved locally)`);
        showToast('info', 'Appointment recorded locally.');
        const saved = JSON.parse(localStorage.getItem('ab_appointments') || '[]');
        saved.push({ ...payload, _id: Date.now().toString(), createdAt: new Date().toISOString() });
        localStorage.setItem('ab_appointments', JSON.stringify(saved));
        document.getElementById('appointmentForm').reset();
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

// ===== AUTH =====
function initAuth() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMsg');
    const btn = document.getElementById('loginBtn');

    if (!email || !password) { showAuthMsg(msg, 'error', 'Please fill in all fields.'); return; }

    btn.classList.add('btn-loading'); btn.disabled = true;

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        setUser(data.user, data.token);
        closeModal('loginModal');
        showToast('success', `Welcome back, ${data.user.name.split(' ')[0]}!`);
        loadMyAppointments();
    } catch (err) {
        // Fallback: local auth for demo
        const users = JSON.parse(localStorage.getItem('ab_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            setUser(user, 'local-token');
            closeModal('loginModal');
            showToast('success', `Welcome back, ${user.name.split(' ')[0]}!`);
            loadMyAppointments();
        } else {
            showAuthMsg(msg, 'error', err.message || 'Invalid email or password.');
        }
    } finally {
        btn.classList.remove('btn-loading'); btn.disabled = false;
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const msg = document.getElementById('signupMsg');
    const btn = document.getElementById('signupBtn');

    if (!name || !email || !password) { showAuthMsg(msg, 'error', 'Please fill in required fields.'); return; }
    if (password.length < 8) { showAuthMsg(msg, 'error', 'Password must be at least 8 characters.'); return; }
    if (!validateEmail(email)) { showAuthMsg(msg, 'error', 'Enter a valid email address.'); return; }

    btn.classList.add('btn-loading'); btn.disabled = true;

    try {
        const res = await fetch(`${API}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Signup failed');

        setUser(data.user, data.token);
        closeModal('signupModal');
        showToast('success', `Account created! Welcome, ${data.user.name.split(' ')[0]}!`);
    } catch (err) {
        // Fallback: local signup
        const users = JSON.parse(localStorage.getItem('ab_users') || '[]');
        if (users.find(u => u.email === email)) {
            showAuthMsg(msg, 'error', 'An account with this email already exists.');
        } else {
            const user = { _id: Date.now().toString(), name, email, phone, password };
            users.push(user);
            localStorage.setItem('ab_users', JSON.stringify(users));
            setUser(user, 'local-token');
            closeModal('signupModal');
            showToast('success', `Account created! Welcome, ${name.split(' ')[0]}!`);
        }
    } finally {
        btn.classList.remove('btn-loading'); btn.disabled = false;
    }
}

function setUser(user, token) {
    currentUser = user;
    localStorage.setItem('ab_token', token);
    localStorage.setItem('ab_user', JSON.stringify(user));
    setNavUser(user);
    updateAppointmentsUI(true);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('ab_token');
    localStorage.removeItem('ab_user');
    setNavUser(null);
    updateAppointmentsUI(false);
    showToast('info', 'You have been signed out.');
}

function checkStoredSession() {
    const token = localStorage.getItem('ab_token');
    const user = localStorage.getItem('ab_user');
    if (token && user) {
        currentUser = JSON.parse(user);
        setNavUser(currentUser);
        updateAppointmentsUI(true);
        loadMyAppointments();
    }
}

function authHeader() {
    const token = localStorage.getItem('ab_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ===== MY APPOINTMENTS =====
function updateAppointmentsUI(loggedIn) {
    const prompt = document.getElementById('apptLoginPrompt');
    const list = document.getElementById('appointmentsList');
    if (loggedIn) {
        prompt.style.display = 'none';
        list.style.display = 'block';
    } else {
        prompt.style.display = 'block';
        list.style.display = 'none';
        list.innerHTML = '';
    }
}

async function loadMyAppointments() {
    if (!currentUser) return;
    const list = document.getElementById('appointmentsList');

    try {
        const res = await fetch(`${API}/appointments/mine`, {
            headers: { ...authHeader() }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        renderAppointments(data.appointments || data, list);
    } catch {
        // Fallback: local
        const all = JSON.parse(localStorage.getItem('ab_appointments') || '[]');
        const mine = all.filter(a => a.email === currentUser.email);
        renderAppointments(mine, list);
    }
}

function renderAppointments(appointments, container) {
    if (!appointments.length) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;">No appointments yet. <a href="#appointments" style="color:var(--accent)">Book one now!</a></p>';
        return;
    }
    container.innerHTML = appointments.map(a => `
    <div class="appointment-item">
      <div class="appt-item-header">
        <span class="appt-vehicle-name">${a.vehicleName || a.vehicleId}</span>
        <span class="appt-status status-${a.status || 'pending'}">${a.status || 'Pending'}</span>
      </div>
      <div class="appt-meta">
        <span><i class="fas fa-calendar"></i>${a.date}</span>
        <span><i class="fas fa-clock"></i>${a.time}</span>
        ${a.location ? `<span><i class="fas fa-map-marker-alt"></i>${a.location}</span>` : ''}
      </div>
    </div>`).join('');
}

// ===== MODALS =====
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

function switchAuth(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 150);
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});

// Close modals on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
});

// ===== TOAST =====
function showToast(type, message) {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== HELPERS =====
function showFormMsg(el, type, text) {
    el.className = `form-msg ${type}`;
    el.textContent = text;
}

function showAuthMsg(el, type, text) {
    el.className = `auth-msg ${type}`;
    el.textContent = text;
}

function togglePw(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatPrice(price) {
    if (price >= 100000) return (price / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (price >= 1000) return (price / 1000).toFixed(0) + 'K';
    return price.toLocaleString('en-IN');
}

function formatKm(km) {
    return km.toLocaleString('en-IN');
}