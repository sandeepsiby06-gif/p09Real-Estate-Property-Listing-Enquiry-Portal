/**
 * Real Estate Portal Frontend Controller
 * Interacts with REST API endpoints at /api/*
 */

const API_BASE = '/api';

// Application State
let state = {
  token: localStorage.getItem('estate_token') || null,
  user: JSON.parse(localStorage.getItem('estate_user') || 'null'),
  currentView: 'browse',
  favourites: new Set(),
  currentPage: 1,
  totalPages: 1
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupModals();
  updateAuthUI();
  await loadCities();
  await loadProperties();

  if (state.token && state.user?.role === 'BUYER') {
    await refreshFavouritesSet();
  }
});

let loginModal, registerModal, createPropertyModal, enquiryModal, rejectModal, rateAgentModal;

function setupModals() {
  loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
  registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
  createPropertyModal = new bootstrap.Modal(document.getElementById('createPropertyModal'));
  enquiryModal = new bootstrap.Modal(document.getElementById('enquiryModal'));
  rejectModal = new bootstrap.Modal(document.getElementById('rejectModal'));
  rateAgentModal = new bootstrap.Modal(document.getElementById('rateAgentModal'));
}

// ==========================================
// API HELPER
// ==========================================
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.message || (data.errors ? data.errors.map(e => e.msg).join(', ') : 'An unexpected error occurred');
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    showToast(err.message, 'danger');
    throw err;
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
  const bgClass = type === 'success' ? 'text-bg-success' : type === 'danger' ? 'text-bg-danger' : 'text-bg-primary';

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon}"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const element = document.getElementById(toastId);
  const toast = new bootstrap.Toast(element, { delay: 4000 });
  toast.show();
  element.addEventListener('hidden.bs.toast', () => element.remove());
}

// Format Currency to INR
function formatINR(val) {
  if (val >= 10000000) {
    return '₹ ' + (val / 10000000).toFixed(2) + ' Cr';
  } else if (val >= 100000) {
    return '₹ ' + (val / 100000).toFixed(2) + ' Lac';
  }
  return '₹ ' + Number(val).toLocaleString('en-IN');
}

// ==========================================
// VIEW SWITCHING
// ==========================================
function showView(viewName) {
  state.currentView = viewName;

  // Hide all view sections
  ['browse', 'details', 'favourites', 'my-enquiries', 'agent', 'admin'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('d-none');
  });

  // Remove active from nav links
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => link.classList.remove('active'));

  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) activeEl.classList.remove('d-none');

  const navLink = document.getElementById(`nav-${viewName}`);
  if (navLink) navLink.classList.add('active');

  // Load view-specific data
  if (viewName === 'browse') {
    loadProperties();
  } else if (viewName === 'favourites') {
    loadFavourites();
  } else if (viewName === 'my-enquiries') {
    loadMyEnquiries();
  } else if (viewName === 'agent') {
    loadAgentProperties();
  } else if (viewName === 'admin') {
    loadAdminPending();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// AUTHENTICATION
// ==========================================
function updateAuthUI() {
  const user = state.user;
  const userBadge = document.getElementById('user-profile-badge');
  const btnLogin = document.getElementById('btn-login-modal');
  const btnRegister = document.getElementById('btn-register-modal');
  const btnLogout = document.getElementById('btn-logout');

  const navFav = document.getElementById('nav-favourites');
  const navMyEnq = document.getElementById('nav-my-enquiries');
  const navAgent = document.getElementById('nav-agent-portal');
  const navAdmin = document.getElementById('nav-admin-portal');

  if (user && state.token) {
    btnLogin.classList.add('d-none');
    btnRegister.classList.add('d-none');
    btnLogout.classList.remove('d-none');
    userBadge.classList.remove('d-none');
    userBadge.classList.add('d-flex');

    document.getElementById('logged-user-name').textContent = user.name;
    const roleBadge = document.getElementById('logged-user-role');
    roleBadge.textContent = user.role;
    roleBadge.className = `badge fs-8 ${user.role === 'ADMIN' ? 'bg-danger' : user.role === 'AGENT' ? 'bg-primary' : 'bg-success'}`;

    navFav.classList.toggle('d-none', user.role !== 'BUYER');
    navMyEnq.classList.toggle('d-none', user.role !== 'BUYER');
    navAgent.classList.toggle('d-none', user.role !== 'AGENT');
    navAdmin.classList.toggle('d-none', user.role !== 'ADMIN');
  } else {
    btnLogin.classList.remove('d-none');
    btnRegister.classList.remove('d-none');
    btnLogout.classList.add('d-none');
    userBadge.classList.add('d-none');
    userBadge.classList.remove('d-flex');

    navFav.classList.add('d-none');
    navMyEnq.classList.add('d-none');
    navAgent.classList.add('d-none');
    navAdmin.classList.add('d-none');
  }
}

function openLoginModal() { loginModal.show(); }
function openRegisterModal() { registerModal.show(); }

function toggleAgencyField() {
  const role = document.getElementById('reg-role').value;
  const container = document.getElementById('agency-name-container');
  if (role === 'AGENT') {
    container.classList.remove('d-none');
  } else {
    container.classList.add('d-none');
  }
}

async function quickLogin(email, password, label) {
  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    state.token = res.data.token;
    state.user = res.data.user;

    localStorage.setItem('estate_token', state.token);
    localStorage.setItem('estate_user', JSON.stringify(state.user));

    showToast(`Switched to demo role: ${label}`, 'success');
    updateAuthUI();

    if (state.user.role === 'BUYER') {
      await refreshFavouritesSet();
      showView('browse');
    } else if (state.user.role === 'AGENT') {
      showView('agent');
    } else if (state.user.role === 'ADMIN') {
      showView('admin');
    }
  } catch (err) {
    // Handled in apiCall
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    state.token = res.data.token;
    state.user = res.data.user;

    localStorage.setItem('estate_token', state.token);
    localStorage.setItem('estate_user', JSON.stringify(state.user));

    loginModal.hide();
    showToast(`Welcome back, ${state.user.name}!`, 'success');
    updateAuthUI();

    if (state.user.role === 'BUYER') {
      await refreshFavouritesSet();
      showView('browse');
    } else if (state.user.role === 'AGENT') {
      showView('agent');
    } else if (state.user.role === 'ADMIN') {
      showView('admin');
    }
  } catch (err) {
    // Handled
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const phone = document.getElementById('reg-phone').value;
  const agencyName = document.getElementById('reg-agency').value;

  try {
    const res = await apiCall('/auth/register', 'POST', {
      name, email, password, role, phone, agencyName
    });

    state.token = res.data.token;
    state.user = res.data.user;

    localStorage.setItem('estate_token', state.token);
    localStorage.setItem('estate_user', JSON.stringify(state.user));

    registerModal.hide();
    showToast(`Account registered successfully as ${role}!`, 'success');
    updateAuthUI();

    if (role === 'AGENT') showView('agent');
    else showView('browse');
  } catch (err) {
    // Handled
  }
}

function logout() {
  state.token = null;
  state.user = null;
  state.favourites.clear();
  localStorage.removeItem('estate_token');
  localStorage.removeItem('estate_user');

  updateAuthUI();
  showToast('Logged out successfully', 'info');
  showView('browse');
}

// ==========================================
// CITIES & BROWSE PROPERTIES
// ==========================================
async function loadCities() {
  try {
    const res = await apiCall('/properties/cities');
    const container = document.getElementById('city-quick-badges');
    if (!container) return;

    container.innerHTML = res.data.cities.map(c => `
      <button class="city-pill-btn" onclick="filterByCity('${c.city}')">
        <i class="bi bi-geo-alt me-1 text-primary"></i> ${c.city} <span class="badge bg-white text-dark ms-1 border fs-9">${c.verifiedListings}</span>
      </button>
    `).join('');
  } catch (err) {
    // Ignore
  }
}

function filterByCity(cityName) {
  document.getElementById('filter-city').value = cityName;
  loadProperties(1);
}

async function loadProperties(page = 1) {
  const city = document.getElementById('filter-city')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const listingType = document.getElementById('filter-listing-type')?.value || '';
  const maxPrice = document.getElementById('filter-max-price')?.value || '';
  const bedrooms = document.getElementById('filter-bedrooms')?.value || '';
  const sortBy = document.getElementById('filter-sort')?.value || 'newest';

  const params = new URLSearchParams({
    page,
    limit: 6,
    sortBy
  });

  if (city) params.append('city', city);
  if (type) params.append('type', type);
  if (listingType) params.append('listingType', listingType);
  if (maxPrice) params.append('maxPrice', maxPrice);
  if (bedrooms) params.append('bedrooms', bedrooms);

  try {
    const res = await apiCall(`/properties/search?${params.toString()}`);
    renderPropertiesGrid(res.data.properties);
    document.getElementById('results-count').textContent = res.data.pagination.totalRecords;
    renderPagination(res.data.pagination);
  } catch (err) {
    // Handled
  }
}

function handleSearchSubmit(e) {
  e.preventDefault();
  loadProperties(1);
}

function resetFilters() {
  document.getElementById('filter-form').reset();
  loadProperties(1);
}

function renderPropertiesGrid(properties) {
  const grid = document.getElementById('properties-grid');
  if (!properties || properties.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-building-exclamation text-muted" style="font-size: 3.5rem;"></i>
        <h5 class="mt-3 text-muted">No verified properties match your criteria</h5>
        <p class="text-secondary fs-8">Try clearing filters or changing city/price range.</p>
        <button class="btn btn-outline-primary btn-sm mt-2" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = properties.map(p => {
    const isFav = state.favourites.has(p._id);
    const imgUrl = p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
    const statusBadgeClass = p.status === 'AVAILABLE' ? 'bg-success' : p.status === 'UNDER_NEGOTIATION' ? 'bg-warning text-dark' : 'bg-secondary';

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card property-card h-100">
          <div class="property-img-wrapper">
            <img src="${imgUrl}" alt="${p.title}" class="property-img" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'">
            <span class="badge ${p.listingType === 'SALE' ? 'bg-primary' : 'bg-info'} badge-listing-type">
              FOR ${p.listingType}
            </span>
            <span class="badge ${statusBadgeClass} badge-status">
              ${p.status.replace('_', ' ')}
            </span>
            ${state.user && state.user.role === 'BUYER' ? `
              <button class="favourite-btn ${isFav ? 'active text-danger' : 'text-muted'}" onclick="toggleFavourite('${p._id}', event)" title="Save to Favourites">
                <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
            ` : ''}
          </div>

          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge bg-light text-dark border fs-8">${p.type}</span>
              <span class="text-muted fs-8"><i class="bi bi-geo-alt me-1"></i>${p.locality}, ${p.city}</span>
            </div>

            <h5 class="card-title fs-6 fw-bold mb-2 text-truncate" title="${p.title}">${p.title}</h5>

            <div class="property-price mb-3">${formatINR(p.price)}${p.listingType === 'RENT' ? '<span class="fs-8 text-muted fw-normal"> /mo</span>' : ''}</div>

            <div class="d-flex justify-content-between border-top border-bottom py-2 mb-3">
              <div class="property-specs-pill">
                <i class="bi bi-door-closed"></i> ${p.bedrooms > 0 ? p.bedrooms + ' Beds' : 'Plot/Office'}
              </div>
              <div class="property-specs-pill">
                <i class="bi bi-droplet"></i> ${p.bathrooms} Baths
              </div>
              <div class="property-specs-pill">
                <i class="bi bi-aspect-ratio"></i> ${p.area} sqft
              </div>
            </div>

            <div class="mt-auto d-flex justify-content-between align-items-center">
              <div class="fs-8 text-muted">
                <i class="bi bi-person me-1"></i>${p.agentId?.name || 'Verified Agent'}
              </div>
              <button class="btn btn-outline-primary btn-sm px-3" onclick="loadPropertyDetails('${p._id}')">
                Details <i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-controls');
  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<ul class="pagination pagination-sm">`;
  html += `
    <li class="page-item ${!pagination.hasPrev ? 'disabled' : ''}">
      <button class="page-link" onclick="loadProperties(${pagination.page - 1})">Previous</button>
    </li>
  `;

  for (let i = 1; i <= pagination.totalPages; i++) {
    html += `
      <li class="page-item ${pagination.page === i ? 'active' : ''}">
        <button class="page-link" onclick="loadProperties(${i})">${i}</button>
      </li>
    `;
  }

  html += `
    <li class="page-item ${!pagination.hasNext ? 'disabled' : ''}">
      <button class="page-link" onclick="loadProperties(${pagination.page + 1})">Next</button>
    </li>
  `;
  html += `</ul>`;
  container.innerHTML = html;
}

// ==========================================
// PROPERTY DETAILS
// ==========================================
async function loadPropertyDetails(id) {
  try {
    const res = await apiCall(`/properties/${id}`);
    const p = res.data.property;
    const isFav = state.favourites.has(p._id);

    const container = document.getElementById('property-details-container');
    const imagesHtml = p.images && p.images.length > 0
      ? p.images.map(img => `<div class="col-md-6 mb-2"><img src="${img}" class="img-fluid rounded" style="height: 250px; width: 100%; object-fit: cover;"></div>`).join('')
      : `<div class="col-12"><img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80" class="img-fluid rounded" style="max-height: 350px; width: 100%; object-fit: cover;"></div>`;

    container.innerHTML = `
      <div class="card shadow-sm border-0 mb-4">
        <div class="card-body p-4">
          <div class="row">
            <div class="col-lg-8">
              <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                <span class="badge ${p.listingType === 'SALE' ? 'bg-primary' : 'bg-info'} text-uppercase">FOR ${p.listingType}</span>
                <span class="badge bg-dark">${p.type}</span>
                <span class="badge ${p.status === 'AVAILABLE' ? 'bg-success' : 'bg-secondary'}">${p.status}</span>
                <span class="badge bg-success-subtle text-success border border-success"><i class="bi bi-patch-check-fill me-1"></i>Verified Listing</span>
              </div>

              <h2 class="h3 fw-bold mb-2">${p.title}</h2>
              <p class="text-muted"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${p.locality}, ${p.city}</p>

              <div class="row g-2 my-3">
                ${imagesHtml}
              </div>

              <div class="row g-3 py-3 border-top border-bottom my-3">
                <div class="col-3 text-center">
                  <div class="fs-8 text-muted">Bedrooms</div>
                  <div class="fs-5 fw-bold"><i class="bi bi-door-closed text-primary me-1"></i>${p.bedrooms} BHK</div>
                </div>
                <div class="col-3 text-center">
                  <div class="fs-8 text-muted">Bathrooms</div>
                  <div class="fs-5 fw-bold"><i class="bi bi-droplet text-primary me-1"></i>${p.bathrooms} Baths</div>
                </div>
                <div class="col-3 text-center">
                  <div class="fs-8 text-muted">Carpet Area</div>
                  <div class="fs-5 fw-bold"><i class="bi bi-aspect-ratio text-primary me-1"></i>${p.area} sqft</div>
                </div>
                <div class="col-3 text-center">
                  <div class="fs-8 text-muted">Verification</div>
                  <div class="fs-5 fw-bold text-success"><i class="bi bi-shield-check me-1"></i>Audited</div>
                </div>
              </div>

              <h5 class="fw-bold mt-4 mb-2">Property Description</h5>
              <p class="text-secondary" style="line-height: 1.7;">${p.description}</p>
            </div>

            <div class="col-lg-4">
              <!-- Sticky Contact & Pricing Card -->
              <div class="card bg-light border p-3 sticky-top" style="top: 80px;">
                <div class="fs-7 text-muted">Offered Price</div>
                <div class="property-price fs-3 mb-3">${formatINR(p.price)}${p.listingType === 'RENT' ? '<span class="fs-7 text-muted fw-normal"> /month</span>' : ''}</div>

                <div class="card bg-white p-3 border mb-3">
                  <div class="fw-bold fs-7 text-uppercase text-muted mb-2">Listing Agent</div>
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="bg-primary-subtle text-primary rounded-circle p-2 text-center" style="width: 40px; height: 40px;">
                      <i class="bi bi-person-fill fs-5"></i>
                    </div>
                    <div>
                      <div class="fw-bold">${p.agentId?.name || 'Real Estate Agent'}</div>
                      <div class="fs-8 text-muted">${p.agentId?.agencyName || 'Independent Broker'}</div>
                    </div>
                  </div>
                  <div class="fs-8 text-muted mb-1"><i class="bi bi-telephone me-1"></i>${p.agentId?.phone || '+91 Direct Line'}</div>
                  <div class="fs-8 text-muted"><i class="bi bi-envelope me-1"></i>${p.agentId?.email || 'agent@domain.com'}</div>
                  <button class="btn btn-sm btn-link p-0 text-decoration-none mt-2 fs-8" onclick="openRateAgentModal('${p.agentId?._id}', '${p.agentId?.name}')">
                    <i class="bi bi-star-fill text-warning me-1"></i>Rate this Agent
                  </button>
                </div>

                ${state.user?.role === 'BUYER' ? `
                  <button class="btn btn-primary w-100 mb-2" onclick="openEnquiryModal('${p._id}', '${p.title.replace(/'/g, "\\'")}')">
                    <i class="bi bi-chat-dots me-1"></i> Send Direct Enquiry
                  </button>
                  <button class="btn btn-outline-danger w-100" onclick="toggleFavourite('${p._id}', event)">
                    <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} me-1"></i> ${isFav ? 'Remove from Saved' : 'Save to Favourites'}
                  </button>
                ` : state.user?.role === 'AGENT' ? `
                  <div class="alert alert-secondary fs-8 mb-0">Logged in as Agent. Buyers can submit direct enquiries.</div>
                ` : state.user?.role === 'ADMIN' ? `
                  <div class="alert alert-info fs-8 mb-0">Logged in as Admin. Viewing property specifications.</div>
                ` : `
                  <button class="btn btn-primary w-100 mb-2" onclick="openLoginModal()">
                    <i class="bi bi-box-arrow-in-right me-1"></i> Sign In to Send Enquiry
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show details view
    ['browse', 'favourites', 'my-enquiries', 'agent', 'admin'].forEach(v => {
      document.getElementById(`view-${v}`)?.classList.add('d-none');
    });
    document.getElementById('view-details').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    // Handled
  }
}

// ==========================================
// FAVOURITES
// ==========================================
async function refreshFavouritesSet() {
  if (!state.token || state.user?.role !== 'BUYER') return;
  try {
    const res = await apiCall('/favourites');
    state.favourites = new Set(res.data.favourites.map(f => f.propertyId?._id || f.propertyId));
    const countEl = document.getElementById('fav-count');
    if (countEl) countEl.textContent = state.favourites.size;
  } catch (err) {
    // Ignore
  }
}

async function toggleFavourite(propertyId, event) {
  if (event) event.stopPropagation();
  if (!state.token) {
    openLoginModal();
    return;
  }

  const isFav = state.favourites.has(propertyId);
  try {
    if (isFav) {
      await apiCall(`/favourites/${propertyId}`, 'DELETE');
      state.favourites.delete(propertyId);
      showToast('Removed from favourites', 'info');
    } else {
      await apiCall(`/favourites/${propertyId}`, 'POST');
      state.favourites.add(propertyId);
      showToast('Added to saved favourites', 'success');
    }

    const countEl = document.getElementById('fav-count');
    if (countEl) countEl.textContent = state.favourites.size;

    if (state.currentView === 'browse') {
      loadProperties(state.currentPage);
    } else if (state.currentView === 'favourites') {
      loadFavourites();
    }
  } catch (err) {
    // Handled
  }
}

async function loadFavourites() {
  try {
    const res = await apiCall('/favourites');
    const container = document.getElementById('favourites-grid');

    if (!res.data.favourites || res.data.favourites.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-heart text-muted" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-muted">No saved properties yet</h5>
          <p class="text-secondary fs-8">Browse the portal and click the heart icon on any listing to bookmark it.</p>
          <button class="btn btn-primary btn-sm" onclick="showView('browse')">Explore Listings</button>
        </div>
      `;
      return;
    }

    const properties = res.data.favourites.map(f => f.propertyId).filter(Boolean);
    renderPropertiesGrid(properties);
    container.innerHTML = document.getElementById('properties-grid').innerHTML;
  } catch (err) {
    // Handled
  }
}

// ==========================================
// ENQUIRIES & LEADS
// ==========================================
function openEnquiryModal(propertyId, title) {
  document.getElementById('enquiry-property-id').value = propertyId;
  document.getElementById('enquiry-prop-title').textContent = title;
  document.getElementById('enquiry-message').value = '';
  enquiryModal.show();
}

async function handleEnquirySubmit(e) {
  e.preventDefault();
  const propertyId = document.getElementById('enquiry-property-id').value;
  const message = document.getElementById('enquiry-message').value;

  try {
    await apiCall('/enquiries', 'POST', { propertyId, message });
    enquiryModal.hide();
    showToast('Enquiry submitted successfully! The agent will follow up.', 'success');
  } catch (err) {
    // Handled
  }
}

async function loadMyEnquiries() {
  try {
    const res = await apiCall('/enquiries/my');
    const container = document.getElementById('my-enquiries-table');

    if (!res.data.enquiries || res.data.enquiries.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-chat-left-dots text-muted" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-muted">No submitted enquiries</h5>
          <p class="text-secondary fs-8">When you enquire about properties, your conversation status will appear here.</p>
        </div>
      `;
      return;
    }

    const rows = res.data.enquiries.map(e => {
      const badgeClass = e.status === 'NEW' ? 'bg-primary' : e.status === 'CONTACTED' ? 'bg-info text-dark' : e.status === 'APPROVED' ? 'bg-success' : e.status === 'REJECTED' ? 'bg-danger' : 'bg-secondary';
      return `
        <tr>
          <td>
            <div class="fw-bold">${e.propertyId?.title || 'Property'}</div>
            <div class="fs-8 text-muted">${e.propertyId?.city || ''} &bull; ${formatINR(e.propertyId?.price || 0)}</div>
          </td>
          <td>
            <div>${e.propertyId?.agentId?.name || 'Agent'}</div>
            <div class="fs-8 text-muted">${e.propertyId?.agentId?.phone || ''}</div>
          </td>
          <td>
            <span class="badge ${badgeClass}">${e.status}</span>
          </td>
          <td class="fs-8 text-secondary" style="max-width: 250px;">
            ${e.remarks ? `<strong class="text-dark">Agent:</strong> ${e.remarks}` : '<span class="text-muted">Awaiting response</span>'}
          </td>
          <td class="fs-8 text-muted">${new Date(e.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light fs-8">
            <tr>
              <th>Property</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Agent Remarks</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    // Handled
  }
}

// ==========================================
// AGENT WORKSPACE
// ==========================================
function openCreatePropertyModal() {
  document.getElementById('create-property-form').reset();
  createPropertyModal.show();
}

async function handleCreatePropertySubmit(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('new-title').value,
    listingType: document.getElementById('new-listing-type').value,
    type: document.getElementById('new-type').value,
    price: Number(document.getElementById('new-price').value),
    area: Number(document.getElementById('new-area').value),
    city: document.getElementById('new-city').value,
    locality: document.getElementById('new-locality').value,
    bedrooms: Number(document.getElementById('new-bedrooms').value),
    bathrooms: Number(document.getElementById('new-bathrooms').value),
    images: document.getElementById('new-image').value ? [document.getElementById('new-image').value] : [],
    description: document.getElementById('new-description').value
  };

  try {
    await apiCall('/properties', 'POST', payload);
    createPropertyModal.hide();
    showToast('Listing submitted! It is now PENDING verification by Admin.', 'success');
    loadAgentProperties();
  } catch (err) {
    // Handled
  }
}

async function loadAgentProperties() {
  try {
    const res = await apiCall('/properties/my');
    const container = document.getElementById('agent-properties-list');
    const countBadge = document.getElementById('agent-prop-count');
    if (countBadge) countBadge.textContent = res.data.totalProperties;

    if (!res.data.properties || res.data.properties.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-houses text-muted" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-muted">You have no listed properties yet</h5>
          <button class="btn btn-primary btn-sm mt-2" onclick="openCreatePropertyModal()">List Your First Property</button>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.properties.map(p => {
      const isVerified = p.isVerified;
      const isRejected = !isVerified && p.rejectionReason;
      const verifyBadge = isVerified
        ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>VERIFIED</span>`
        : isRejected
        ? `<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>REJECTED</span>`
        : `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass me-1"></i>PENDING REVIEW</span>`;

      return `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge bg-light text-dark border fs-8">${p.type} &bull; ${p.listingType}</span>
                ${verifyBadge}
              </div>
              <h5 class="fw-bold fs-6 mb-1 text-truncate">${p.title}</h5>
              <div class="property-price fs-5 mb-2">${formatINR(p.price)}</div>
              <div class="fs-8 text-muted mb-2"><i class="bi bi-geo-alt me-1"></i>${p.locality}, ${p.city}</div>

              ${isRejected ? `
                <div class="alert alert-danger py-1 px-2 fs-8 mb-3">
                  <strong>Rejection Note:</strong> ${p.rejectionReason}
                </div>
              ` : ''}

              <!-- Status Transition Control -->
              <div class="border-top pt-2 mt-2">
                <label class="form-label fs-8 text-muted fw-semibold mb-1">Listing Status:</label>
                <div class="d-flex gap-2">
                  <select class="form-select form-select-sm" id="status-select-${p._id}">
                    <option value="AVAILABLE" ${p.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                    <option value="UNDER_NEGOTIATION" ${p.status === 'UNDER_NEGOTIATION' ? 'selected' : ''}>UNDER NEGOTIATION</option>
                    <option value="SOLD" ${p.status === 'SOLD' ? 'selected' : ''}>SOLD</option>
                    <option value="RENTED" ${p.status === 'RENTED' ? 'selected' : ''}>RENTED</option>
                  </select>
                  <button class="btn btn-outline-secondary btn-sm" onclick="changePropertyStatus('${p._id}')">
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    // Handled
  }
}

async function changePropertyStatus(propertyId) {
  const select = document.getElementById(`status-select-${propertyId}`);
  const status = select.value;
  try {
    await apiCall(`/properties/${propertyId}/status`, 'PUT', { status });
    showToast(`Property status updated to ${status}`, 'success');
    loadAgentProperties();
  } catch (err) {
    loadAgentProperties();
  }
}

async function loadAgentLeads() {
  try {
    const res = await apiCall('/enquiries/agent');
    const container = document.getElementById('agent-leads-list');
    const countBadge = document.getElementById('agent-leads-count');
    if (countBadge) countBadge.textContent = res.data.totalEnquiries;

    if (!res.data.enquiries || res.data.enquiries.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-muted">No enquiries received yet</h5>
          <p class="text-secondary fs-8">Inbound buyer leads for your properties will be shown here.</p>
        </div>
      `;
      return;
    }

    const rows = res.data.enquiries.map(e => `
      <tr>
        <td>
          <div class="fw-bold">${e.buyerId?.name || 'Buyer'}</div>
          <div class="fs-8 text-muted">${e.buyerId?.phone || ''} &bull; ${e.buyerId?.email || ''}</div>
        </td>
        <td>
          <div class="fw-bold fs-8">${e.propertyId?.title || 'Property'}</div>
          <div class="fs-8 text-muted">${formatINR(e.propertyId?.price || 0)}</div>
        </td>
        <td class="fs-8 text-secondary" style="max-width: 250px;">
          "${e.message}"
        </td>
        <td>
          <select class="form-select form-select-sm" id="enq-status-${e._id}">
            <option value="NEW" ${e.status === 'NEW' ? 'selected' : ''}>NEW</option>
            <option value="CONTACTED" ${e.status === 'CONTACTED' ? 'selected' : ''}>CONTACTED</option>
            <option value="APPROVED" ${e.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
            <option value="REJECTED" ${e.status === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
            <option value="CLOSED" ${e.status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm" id="enq-remarks-${e._id}" value="${e.remarks || ''}" placeholder="Remarks...">
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="saveLeadStatus('${e._id}')">Save</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light fs-8">
            <tr>
              <th>Buyer</th>
              <th>Property</th>
              <th>Message</th>
              <th>Status (State Machine)</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    // Handled
  }
}

async function saveLeadStatus(enquiryId) {
  const status = document.getElementById(`enq-status-${enquiryId}`).value;
  const remarks = document.getElementById(`enq-remarks-${enquiryId}`).value;

  try {
    await apiCall(`/enquiries/${enquiryId}/status`, 'PUT', { status, remarks });
    showToast(`Lead updated to ${status}`, 'success');
    loadAgentLeads();
  } catch (err) {
    loadAgentLeads();
  }
}

// ==========================================
// ADMIN MODERATION & REPORTS
// ==========================================
async function loadAdminPending() {
  try {
    const res = await apiCall('/admin/properties/pending');
    const container = document.getElementById('admin-pending-list');
    const countBadge = document.getElementById('admin-pending-count');
    if (countBadge) countBadge.textContent = res.data.properties.length;

    if (!res.data.properties || res.data.properties.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-check-all text-success" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-muted">All submissions reviewed!</h5>
          <p class="text-secondary fs-8">No properties currently waiting for admin verification.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.properties.map(p => `
      <div class="col-md-6">
        <div class="card shadow-sm border p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-primary fs-8">PENDING REVIEW</span>
            <span class="badge bg-light text-dark border fs-8">${p.type} &bull; ${p.listingType}</span>
          </div>
          <h5 class="fw-bold fs-6 mb-1">${p.title}</h5>
          <div class="property-price fs-5 mb-2">${formatINR(p.price)}</div>
          <div class="fs-8 text-muted mb-2"><i class="bi bi-geo-alt me-1"></i>${p.locality}, ${p.city} &bull; ${p.area} sqft</div>
          <p class="fs-8 text-secondary mb-3">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center border-top pt-2">
            <div class="fs-8 text-muted">
              Agent: <strong>${p.agentId?.name || 'Agent'}</strong> (${p.agentId?.email})
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-danger btn-sm" onclick="openRejectModal('${p._id}')">
                <i class="bi bi-x-circle me-1"></i> Reject
              </button>
              <button class="btn btn-success btn-sm" onclick="verifyAdminProperty('${p._id}')">
                <i class="bi bi-check-circle me-1"></i> Approve & Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    // Handled
  }
}

async function verifyAdminProperty(propertyId) {
  try {
    await apiCall(`/properties/${propertyId}/verify`, 'PUT', { status: 'VERIFIED' });
    showToast('Property verified and published to public search!', 'success');
    loadAdminPending();
  } catch (err) {
    // Handled
  }
}

function openRejectModal(propertyId) {
  document.getElementById('reject-property-id').value = propertyId;
  document.getElementById('reject-reason').value = '';
  rejectModal.show();
}

async function handleRejectSubmit(e) {
  e.preventDefault();
  const propertyId = document.getElementById('reject-property-id').value;
  const reason = document.getElementById('reject-reason').value;

  try {
    await apiCall(`/properties/${propertyId}/verify`, 'PUT', {
      status: 'REJECTED',
      rejectionReason: reason
    });
    rejectModal.hide();
    showToast('Property rejected with specified reason', 'info');
    loadAdminPending();
  } catch (err) {
    // Handled
  }
}

async function loadAdminRejected() {
  try {
    const res = await apiCall('/admin/properties/rejected');
    const container = document.getElementById('admin-rejected-list');

    if (!res.data.properties || res.data.properties.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">No rejected properties on record.</div>
      `;
      return;
    }

    container.innerHTML = res.data.properties.map(p => `
      <div class="col-md-6">
        <div class="card shadow-sm border border-danger-subtle p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-danger fs-8">REJECTED</span>
            <span class="fs-8 text-muted">${new Date(p.updatedAt).toLocaleDateString()}</span>
          </div>
          <h5 class="fw-bold fs-6 mb-1">${p.title}</h5>
          <div class="alert alert-danger py-2 px-3 fs-8 mb-2">
            <strong>Rejection Reason:</strong> ${p.rejectionReason}
          </div>
          <div class="fs-8 text-muted">
            Agent: ${p.agentId?.name || 'Agent'} &bull; City: ${p.city}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    // Handled
  }
}

async function loadAdminUsers() {
  try {
    const res = await apiCall('/admin/users');
    const container = document.getElementById('admin-users-table');

    const rows = res.data.users.map(u => `
      <tr>
        <td>
          <div class="fw-bold">${u.name}</div>
          <div class="fs-8 text-muted">${u.phone || 'No phone'}</div>
        </td>
        <td>${u.email}</td>
        <td>
          <span class="badge ${u.role === 'ADMIN' ? 'bg-danger' : u.role === 'AGENT' ? 'bg-primary' : 'bg-success'}">${u.role}</span>
        </td>
        <td>${u.agencyName || '<span class="text-muted">—</span>'}</td>
        <td class="fs-8 text-muted">${new Date(u.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light fs-8">
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Agency (if Agent)</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    // Handled
  }
}

async function loadAdminReports() {
  try {
    // 1. Summary Report
    const summaryRes = await apiCall('/admin/reports/summary');
    const s = summaryRes.data;

    document.getElementById('admin-summary-cards').innerHTML = `
      <div class="col-md-3">
        <div class="stat-card">
          <div>
            <div class="text-muted fs-8 fw-semibold">TOTAL USERS</div>
            <div class="fs-3 fw-bold">${s.users.total}</div>
            <div class="fs-8 text-secondary">${s.users.buyers} Buyers, ${s.users.agents} Agents</div>
          </div>
          <div class="stat-icon bg-primary-subtle text-primary"><i class="bi bi-people"></i></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div>
            <div class="text-muted fs-8 fw-semibold">TOTAL PROPERTIES</div>
            <div class="fs-3 fw-bold">${s.properties.total}</div>
            <div class="fs-8 text-success">${s.properties.verified} Verified</div>
          </div>
          <div class="stat-icon bg-success-subtle text-success"><i class="bi bi-houses"></i></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div>
            <div class="text-muted fs-8 fw-semibold">PENDING AUDIT</div>
            <div class="fs-3 fw-bold text-warning">${s.properties.pendingVerification}</div>
            <div class="fs-8 text-danger">${s.properties.rejected} Rejected</div>
          </div>
          <div class="stat-icon bg-warning-subtle text-warning"><i class="bi bi-hourglass-split"></i></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div>
            <div class="text-muted fs-8 fw-semibold">TOTAL ENQUIRIES</div>
            <div class="fs-3 fw-bold text-info">${s.enquiries.total}</div>
            <div class="fs-8 text-secondary">Lead Pipeline</div>
          </div>
          <div class="stat-icon bg-info-subtle text-info"><i class="bi bi-chat-dots"></i></div>
        </div>
      </div>
    `;

    // 2. Top Properties Aggregation Report
    const topRes = await apiCall('/admin/reports/top-properties?limit=5');
    const topTable = document.getElementById('top-properties-table');
    if (!topRes.data.properties || topRes.data.properties.length === 0) {
      topTable.innerHTML = `<div class="p-3 text-muted text-center">No enquiries logged yet.</div>`;
    } else {
      topTable.innerHTML = `
        <table class="table table-hover align-middle mb-0 fs-8">
          <thead class="table-light">
            <tr>
              <th>Property</th>
              <th>City</th>
              <th>Price</th>
              <th class="text-center">Enquiry Leads</th>
            </tr>
          </thead>
          <tbody>
            ${topRes.data.properties.map(p => `
              <tr>
                <td><strong>${p.title}</strong></td>
                <td>${p.city}</td>
                <td>${formatINR(p.price)}</td>
                <td class="text-center"><span class="badge bg-danger">${p.enquiryCount} Leads</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // 3. Agent Performance Aggregation Report
    const agentRes = await apiCall('/admin/reports/agent-performance');
    const agentTable = document.getElementById('agent-performance-table');
    if (!agentRes.data.agents || agentRes.data.agents.length === 0) {
      agentTable.innerHTML = `<div class="p-3 text-muted text-center">No agent performance data yet.</div>`;
    } else {
      agentTable.innerHTML = `
        <table class="table table-hover align-middle mb-0 fs-8">
          <thead class="table-light">
            <tr>
              <th>Agent</th>
              <th>Listings</th>
              <th>Closed</th>
              <th>Leads</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            ${agentRes.data.agents.map(a => `
              <tr>
                <td>
                  <strong>${a.name}</strong>
                  <div class="text-muted">${a.agencyName || 'Independent'}</div>
                </td>
                <td>${a.verifiedListings} / ${a.totalListings}</td>
                <td><span class="badge bg-success">${a.closedDeals} Deals</span></td>
                <td>${a.enquiryCount}</td>
                <td><span class="text-warning">⭐ ${a.averageRating || '—'}</span> (${a.reviewsCount})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    // Handled
  }
}

// ==========================================
// RATING AGENTS
// ==========================================
function openRateAgentModal(agentId, agentName) {
  if (!state.token) {
    openLoginModal();
    return;
  }
  if (state.user?.role !== 'BUYER') {
    showToast('Only Buyers can rate agents', 'info');
    return;
  }
  document.getElementById('rate-agent-id').value = agentId;
  document.getElementById('rate-score').value = '5';
  document.getElementById('rate-review').value = '';
  rateAgentModal.show();
}

async function handleRateAgentSubmit(e) {
  e.preventDefault();
  const agentId = document.getElementById('rate-agent-id').value;
  const rating = Number(document.getElementById('rate-score').value);
  const review = document.getElementById('rate-review').value;

  try {
    await apiCall(`/agents/${agentId}/ratings`, 'POST', { rating, review });
    rateAgentModal.hide();
    showToast('Rating and review submitted successfully!', 'success');
  } catch (err) {
    // Handled
  }
}
