/**
 * NOTARI 2.0 — Student Notice Board Engine
 * Premium Editorial + Modern SaaS + Campus Experience
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentEvents = [];
  let activeFaculty = 'All';
  let activeTimeframe = '';
  let searchQuery = '';
  let searchDebounceTimeout = null;
  let activeAbortController = null;
  let includePast = false;

  // DOM Elements - Navigation & Discovery
  const heroSearchForm = document.getElementById('hero-search-form');
  const searchInput = document.getElementById('event-search');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const btnSubmitSearch = document.getElementById('btn-submit-search');
  const btnHeaderSearch = document.getElementById('btn-header-search');
  const selectFaculty = document.getElementById('select-faculty-filter');
  const selectTimeframe = document.getElementById('select-timeframe-filter');
  const btnClearFilters = document.getElementById('btn-clear-filters');
  const navPastEvents = document.getElementById('nav-past-events');

  // DOM Elements - Theme Toggles
  const themeToggleBtn = document.getElementById('theme-toggle');
  const footerThemeToggle = document.getElementById('footer-theme-toggle');
  const sunIcons = document.querySelectorAll('#theme-toggle .sun-icon, #footer-theme-toggle .sun-icon');
  const moonIcons = document.querySelectorAll('#theme-toggle .moon-icon, #footer-theme-toggle .moon-icon');

  // DOM Elements - Event Displays
  const featuredCardContainer = document.getElementById('featured-card-container');
  const noticeBoardGrid = document.getElementById('notice-board-grid');
  const eventsCountBadge = document.getElementById('events-count-badge');
  const toastContainer = document.getElementById('toast-container');

  // DOM Elements - Booking Modal
  const bookingModal = document.getElementById('booking-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalEventFlyer = document.getElementById('modal-event-flyer');
  const quickBookingForm = document.getElementById('quick-booking-form');
  const bookingEventId = document.getElementById('booking-event-id');
  const modalEventTitle = document.getElementById('modal-event-title');
  const modalEventFaculty = document.getElementById('modal-event-faculty');
  const modalEventMeta = document.getElementById('modal-event-meta');
  const modalEventDesc = document.getElementById('modal-event-desc');
  const bookingNameInput = document.getElementById('booking-name');
  const bookingEmailInput = document.getElementById('booking-email');
  const bookingNameError = document.getElementById('booking-name-error');
  const bookingEmailError = document.getElementById('booking-email-error');
  const bookingStatusBox = document.getElementById('booking-status-box');
  const btnSubmitBooking = document.getElementById('btn-submit-booking');

  // ----------------------------------------------------
  // Authentic Event Photography Mapping (From Reference)
  // ----------------------------------------------------
  const DEFAULT_FLYERS = [
    'images/flyer-symposium.png',
    'images/flyer-tech.png',
    'images/flyer-lecture.png',
    'images/flyer-concert.png',
    'images/flyer-festival.png'
  ];

  const FACULTY_FLYER_MAP = {
    'Engineering': 'images/flyer-tech.png',
    'Sciences': 'images/flyer-lecture.png',
    'Arts & Humanities': 'images/flyer-symposium.png',
    'Business & Law': 'images/flyer-concert.png',
    'Health Sciences': 'images/flyer-lecture.png',
    'General': 'images/flyer-festival.png'
  };

  function resolveFlyerUrl(event, index = 0) {
    if (event.flyerUrl && event.flyerUrl !== '/Notari.png' && event.flyerUrl.trim() !== '') {
      return event.flyerUrl;
    }
    return FACULTY_FLYER_MAP[event.faculty] || DEFAULT_FLYERS[index % DEFAULT_FLYERS.length];
  }

  function getFallbackFlyerSvg(faculty) {
    const initials = (faculty || 'NO')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="%231B4D3E"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="bold" fill="%23FFFFFF">${initials}</text><text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%23EAE4DA">${encodeURIComponent(faculty || 'Campus Event')}</text></svg>`;
  }

  // ----------------------------------------------------
  // 1. Theme Management (Synchronous + Storage)
  // ----------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('notari_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('notari_theme', theme);

    if (theme === 'dark') {
      sunIcons.forEach(icon => { icon.style.display = 'none'; });
      moonIcons.forEach(icon => { icon.style.display = 'block'; });
    } else {
      sunIcons.forEach(icon => { icon.style.display = 'block'; });
      moonIcons.forEach(icon => { icon.style.display = 'none'; });
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }

  themeToggleBtn?.addEventListener('click', toggleTheme);
  footerThemeToggle?.addEventListener('click', toggleTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('notari_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // ----------------------------------------------------
  // 2. Fetch & Render Notice Board Events
  // ----------------------------------------------------
  async function loadEvents() {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    const { signal } = activeAbortController;

    renderLoadingSkeleton();

    try {
      const params = new URLSearchParams();
      if (activeFaculty && activeFaculty !== 'All') {
        params.append('faculty', activeFaculty);
      }
      if (activeTimeframe) {
        params.append('timeframe', activeTimeframe);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (includePast) {
        params.append('includePast', 'true');
      }

      const res = await fetch(`/api/events?${params.toString()}`, { signal });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      currentEvents = data.events || [];
      renderAll(currentEvents);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error('[NOTARI Fetch Error]', err);
      renderErrorState();
    }
  }

  function renderLoadingSkeleton() {
    if (eventsCountBadge) {
      eventsCountBadge.textContent = 'Loading...';
    }
    if (featuredCardContainer) {
      featuredCardContainer.innerHTML = `
        <div class="card-skeleton" style="height: 200px; grid-column: 1 / -1;">
          <div class="skeleton-flyer" style="height: 100%;"></div>
        </div>
      `;
    }
    if (noticeBoardGrid) {
      noticeBoardGrid.innerHTML = Array(4).fill(0).map(() => `
        <div class="card-skeleton">
          <div class="skeleton-flyer"></div>
          <div class="skeleton-body">
            <div class="skeleton-line" style="width: 40%; height: 14px;"></div>
            <div class="skeleton-line" style="width: 85%; height: 20px;"></div>
            <div class="skeleton-line" style="width: 60%; height: 14px;"></div>
            <div class="skeleton-line" style="width: 50%; height: 14px;"></div>
            <div class="skeleton-line" style="width: 100%; height: 30px; margin-top: auto;"></div>
          </div>
        </div>
      `).join('');
    }
  }

  function renderErrorState() {
    if (eventsCountBadge) {
      eventsCountBadge.textContent = 'Offline';
    }
    if (featuredCardContainer) {
      featuredCardContainer.innerHTML = '';
    }
    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 class="state-title">Unable to load campus events</h3>
        <p class="state-text">Could not connect to the campus event server. Check your connection and try again.</p>
        <button id="btn-retry-fetch" class="btn-primary-orange">Retry</button>
      </div>
    `;
    document.getElementById('btn-retry-fetch')?.addEventListener('click', loadEvents);
  }

  function renderEmptyState() {
    if (eventsCountBadge) {
      eventsCountBadge.textContent = '0 Events';
    }
    if (featuredCardContainer) {
      featuredCardContainer.innerHTML = '';
    }

    const isFiltered = activeFaculty !== 'All' || !!searchQuery.trim() || !!activeTimeframe;

    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <h3 class="state-title">${isFiltered ? 'No matching events found' : 'Nothing pinned yet'}</h3>
        <p class="state-text">
          ${isFiltered 
            ? 'No campus events matched your current search or faculty filters. Try resetting filters to explore all postings.' 
            : 'Check back soon for new society gatherings, guest lectures, and campus workshops.'}
        </p>
        ${isFiltered ? '<button id="btn-reset-filters-empty" class="btn-primary-orange">Reset Filters</button>' : ''}
      </div>
    `;

    if (isFiltered) {
      document.getElementById('btn-reset-filters-empty')?.addEventListener('click', resetFilters);
    }
  }

  // ----------------------------------------------------
  // 3. Render Both Featured Section & 4-Column Card Grid
  // ----------------------------------------------------
  function renderAll(events) {
    if (!events || events.length === 0) {
      renderEmptyState();
      return;
    }

    if (eventsCountBadge) {
      eventsCountBadge.textContent = `${events.length} Event${events.length === 1 ? '' : 's'}`;
    }

    // 1. Featured Event Card (Top upcoming or first event)
    const featuredEvent = events.find(e => new Date(e.date) >= new Date()) || events[0];
    renderFeaturedCard(featuredEvent);

    // 2. Upcoming Cards (Render all events matching filters)
    renderCardGrid(events);
  }

  // Render Featured Card (matching reference layout)
  function renderFeaturedCard(event) {
    if (!featuredCardContainer) return;
    if (!event) {
      featuredCardContainer.innerHTML = '';
      return;
    }

    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();
    const attendeesCount = event.attendees ? event.attendees.length : 0;
    const capacity = event.capacity || 0;
    const isUnlimited = capacity === 0;
    const seatsLeft = isUnlimited ? null : Math.max(0, capacity - attendeesCount);
    const isFull = !isUnlimited && seatsLeft === 0;

    const formattedDate = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const flyerUrl = resolveFlyerUrl(event, 0);

    featuredCardContainer.innerHTML = `
      <article class="featured-card" data-id="${event._id}">
        <!-- Flyer Column with "Featured" pill badge -->
        <div class="featured-flyer-col">
          <img 
            src="${escapeHtml(flyerUrl)}" 
            alt="${escapeHtml(event.eventName)} Flyer" 
            class="featured-flyer-img"
            loading="lazy"
            onerror="this.onerror=null; this.src='${getFallbackFlyerSvg(event.faculty)}';"
          >
          <span class="featured-badge">Featured</span>
        </div>

        <!-- Content Column -->
        <div class="featured-content-col">
          <div>
            <span class="featured-category-tag">${escapeHtml(event.faculty || 'Campus General')}</span>
            <h3 class="featured-event-title" data-open-modal="${event._id}">
              ${escapeHtml(event.eventName)}
            </h3>

            <div class="featured-meta-row">
              <div class="featured-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${escapeHtml(event.organizer)}</span>
              </div>
              <div class="featured-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${formattedDate} • ${formattedTime}</span>
              </div>
              <div class="featured-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${escapeHtml(event.venue)}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Action Row -->
          <div class="featured-bottom-row">
            <span class="seat-pill ${isPast ? 'past' : (isFull ? 'full' : '')}">
              <span class="seat-dot"></span>
              ${isPast ? 'Event ended' : (isUnlimited ? 'Open seating' : (isFull ? 'Event Full' : `${seatsLeft} seats left`))}
            </span>

            <button type="button" class="btn-primary-orange btn-open-booking" data-id="${event._id}" data-full="${isFull}">
              ${isPast ? 'View Details' : (isFull ? 'Join Waitlist' : 'View Details')}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Render 4-Column Card Grid (matching reference)
  function renderCardGrid(events) {
    if (!noticeBoardGrid) return;

    noticeBoardGrid.innerHTML = events.map((event, idx) => {
      const eventDate = new Date(event.date);
      const isPast = eventDate < new Date();
      const attendeesCount = event.attendees ? event.attendees.length : 0;
      const capacity = event.capacity || 0;
      const isUnlimited = capacity === 0;
      const seatsLeft = isUnlimited ? null : Math.max(0, capacity - attendeesCount);
      const isFull = !isUnlimited && seatsLeft === 0;

      const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const flyerUrl = resolveFlyerUrl(event, idx);

      return `
        <article class="event-card-modern ${isPast ? 'is-past-event' : ''}" data-id="${event._id}">
          <!-- Flyer Image Box with Category Tag -->
          <div class="card-flyer-box">
            <img 
              src="${escapeHtml(flyerUrl)}" 
              alt="${escapeHtml(event.eventName)} Flyer" 
              class="card-flyer-img"
              loading="lazy"
              onerror="this.onerror=null; this.src='${getFallbackFlyerSvg(event.faculty)}';"
            >
            <span class="card-category-overlay">${escapeHtml(event.faculty || 'General')}</span>
          </div>

          <!-- Card Body -->
          <div class="card-body-modern">
            <h3 class="card-title-modern" data-open-modal="${event._id}">
              ${escapeHtml(event.eventName)}
            </h3>

            <div class="card-meta-list-modern">
              <div class="meta-line">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>${escapeHtml(event.organizer)}</span>
              </div>
              <div class="meta-line">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${formattedDate} • ${formattedTime}</span>
              </div>
              <div class="meta-line">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>${escapeHtml(event.venue)}</span>
              </div>
            </div>

            <!-- Footer: Seats Pill + Circular Action Button -->
            <div class="card-footer-modern">
              <span class="seat-pill ${isPast ? 'past' : (isFull ? 'full' : '')}">
                <span class="seat-dot"></span>
                ${isPast ? 'Ended' : (isUnlimited ? 'Open' : (isFull ? 'Full' : `${seatsLeft} seats left`))}
              </span>

              <button type="button" class="btn-circle-arrow btn-open-booking" data-id="${event._id}" data-full="${isFull}" aria-label="${isPast ? 'View details for' : 'View details and reserve seat for'} ${escapeHtml(event.eventName)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    attachCardInteractions();
  }

  function attachCardInteractions() {
    // Action buttons
    document.querySelectorAll('.btn-open-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = btn.getAttribute('data-id');
        const isFull = btn.getAttribute('data-full') === 'true';
        openBookingModal(eventId, isFull);
      });
    });

    // Clickable titles
    document.querySelectorAll('[data-open-modal]').forEach(titleEl => {
      titleEl.addEventListener('click', () => {
        const eventId = titleEl.getAttribute('data-open-modal');
        const event = currentEvents.find(e => e._id === eventId);
        const isFull = event && event.capacity > 0 && event.attendees && event.attendees.length >= event.capacity;
        openBookingModal(eventId, isFull);
      });
    });
  }

  // ----------------------------------------------------
  // 4. Quick Booking Modal & Registration Flow
  // ----------------------------------------------------
  function openBookingModal(eventId, isFull = false) {
    const event = currentEvents.find(e => e._id === eventId);
    if (!event) {
      window.location.href = `register.html?id=${eventId}`;
      return;
    }

    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();

    bookingEventId.value = event._id;
    modalEventFaculty.textContent = event.faculty || 'CAMPUS EVENT';
    modalEventTitle.textContent = isPast 
      ? `Past: ${event.eventName}` 
      : (isFull ? `Waitlist: ${event.eventName}` : `Reserve: ${event.eventName}`);

    // Modal Flyer Banner
    if (modalEventFlyer) {
      const flyerUrl = resolveFlyerUrl(event);
      modalEventFlyer.innerHTML = `<img src="${escapeHtml(flyerUrl)}" alt="${escapeHtml(event.eventName)}" class="modal-flyer-img" onerror="this.parentElement.style.display='none'">`;
      modalEventFlyer.style.display = 'block';
    }

    const eventDateStr = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const seatsLeft = event.capacity > 0 ? Math.max(0, event.capacity - (event.attendees ? event.attendees.length : 0)) : null;

    modalEventMeta.innerHTML = `
      <div><strong>Organizer:</strong> ${escapeHtml(event.organizer)}</div>
      <div><strong>When:</strong> ${eventDateStr}</div>
      <div><strong>Where:</strong> ${escapeHtml(event.venue)}</div>
      <div><strong>Availability:</strong> ${isPast ? 'Event has ended' : (event.capacity === 0 ? 'Open Seating' : (isFull ? 'Event is currently full' : `${seatsLeft} seats remaining`))}</div>
    `;

    // Event Description Box
    if (modalEventDesc) {
      if (event.description && event.description.trim()) {
        modalEventDesc.innerHTML = `
          <div class="modal-section-subtitle">About this event</div>
          <p class="modal-description-text">${escapeHtml(event.description)}</p>
        `;
        modalEventDesc.style.display = 'block';
      } else {
        modalEventDesc.style.display = 'none';
        modalEventDesc.innerHTML = '';
      }
    }

    if (isPast) {
      btnSubmitBooking.textContent = 'Registration Closed';
      btnSubmitBooking.disabled = true;
      btnSubmitBooking.style.opacity = '0.6';
    } else {
      btnSubmitBooking.textContent = isFull ? 'Join Event Waitlist' : 'Claim Seat & Receive Pass';
      btnSubmitBooking.disabled = false;
      btnSubmitBooking.style.opacity = '1';
    }

    // Reset form validation
    bookingNameInput.value = '';
    bookingEmailInput.value = '';
    bookingNameInput.classList.remove('is-invalid');
    bookingEmailInput.classList.remove('is-invalid');
    bookingNameError.classList.remove('visible');
    bookingEmailError.classList.remove('visible');
    bookingStatusBox.style.display = 'none';

    document.body.style.overflow = 'hidden';
    bookingModal.classList.add('active');
    bookingNameInput.focus();
  }

  function closeBookingModal() {
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  modalCloseBtn?.addEventListener('click', closeBookingModal);
  bookingModal?.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal?.classList.contains('active')) {
      closeBookingModal();
    }
  });

  // Handle Form Submission
  quickBookingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = bookingNameInput.value.trim();
    const email = bookingEmailInput.value.trim();
    const eventId = bookingEventId.value;

    let hasError = false;

    if (!name) {
      bookingNameInput.classList.add('is-invalid');
      bookingNameError.classList.add('visible');
      hasError = true;
    } else {
      bookingNameInput.classList.remove('is-invalid');
      bookingNameError.classList.remove('visible');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      bookingEmailInput.classList.add('is-invalid');
      bookingEmailError.classList.add('visible');
      hasError = true;
    } else {
      bookingEmailInput.classList.remove('is-invalid');
      bookingEmailError.classList.remove('visible');
    }

    if (hasError) return;

    btnSubmitBooking.disabled = true;
    btnSubmitBooking.textContent = 'Securing pass...';

    try {
      const event = currentEvents.find(e => e._id === eventId);
      const isFull = event && event.capacity > 0 && event.attendees.length >= event.capacity;

      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          joinWaitlist: isFull
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showBookingStatus(data.error || 'Registration failed. Please retry.', 'error');
        btnSubmitBooking.disabled = false;
        btnSubmitBooking.textContent = isFull ? 'Join Event Waitlist' : 'Claim Seat & Receive Pass';
        return;
      }

      if (data.status === 'confirmed') {
        showToast("You're in — check your email for your ticket.");
        setTimeout(() => {
          window.location.href = `register.html?id=${eventId}&status=confirmed&ticketCode=${data.ticket.ticketCode}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
        }, 600);
      } else if (data.status === 'waitlisted') {
        showToast("You're on the waitlist — we'll notify you if a seat opens.");
        closeBookingModal();
        loadEvents();
      }
    } catch (err) {
      console.error('[Booking submit error]', err);
      showBookingStatus('Network error while processing registration. Please retry.', 'error');
      btnSubmitBooking.disabled = false;
      btnSubmitBooking.textContent = 'Claim Seat & Receive Pass';
    }
  });

  function showBookingStatus(msg, type = 'error') {
    bookingStatusBox.style.display = 'block';
    bookingStatusBox.className = type === 'error' ? 'form-error visible' : 'seat-pill';
    bookingStatusBox.textContent = msg;
  }

  // ----------------------------------------------------
  // 5. Search & Filters Interaction
  // ----------------------------------------------------
  if (heroSearchForm) {
    heroSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(searchDebounceTimeout);
      if (searchInput) {
        searchQuery = searchInput.value;
      }
      loadEvents();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimeout);
      searchQuery = e.target.value;

      if (btnClearSearch) {
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      }

      searchDebounceTimeout = setTimeout(() => {
        loadEvents();
      }, 250);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      loadEvents();
    });
  }

  if (btnHeaderSearch) {
    btnHeaderSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  if (selectFaculty) {
    selectFaculty.addEventListener('change', (e) => {
      activeFaculty = e.target.value;
      loadEvents();
    });
  }

  if (selectTimeframe) {
    selectTimeframe.addEventListener('change', (e) => {
      activeTimeframe = e.target.value;
      loadEvents();
    });
  }

  function resetFilters() {
    activeFaculty = 'All';
    activeTimeframe = '';
    searchQuery = '';
    includePast = false;

    if (searchInput) searchInput.value = '';
    if (btnClearSearch) btnClearSearch.style.display = 'none';
    if (selectFaculty) selectFaculty.value = 'All';
    if (selectTimeframe) selectTimeframe.value = '';
    if (navPastEvents) navPastEvents.classList.remove('active');

    loadEvents();
  }

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', resetFilters);
  }

  if (navPastEvents) {
    navPastEvents.addEventListener('click', () => {
      includePast = !includePast;
      navPastEvents.classList.toggle('active', includePast);
      loadEvents();
    });
  }

  // Keyboard shortcut '/' to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isFocusInInput()) {
      e.preventDefault();
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  function isFocusInInput() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  // ----------------------------------------------------
  // 6. Toast Notifications
  // ----------------------------------------------------
  function showToast(message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer?.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // ----------------------------------------------------
  // Helper Utilities
  // ----------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize
  initTheme();
  loadEvents();
});
