/**
 * NOTARI — Student Notice Board Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentEvents = [];
  let activeFaculty = 'All';
  let activeTimeframe = null;
  let searchQuery = '';
  let searchDebounceTimeout = null;
  let includePast = false;

  // DOM Elements
  const noticeBoardGrid = document.getElementById('notice-board-grid');
  const searchInput = document.getElementById('event-search');
  const filterChips = document.querySelectorAll('.filter-chip');
  const btnTogglePast = document.getElementById('btn-toggle-past');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');
  const toastContainer = document.getElementById('toast-container');

  // Modal Elements
  const bookingModal = document.getElementById('booking-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const quickBookingForm = document.getElementById('quick-booking-form');
  const bookingEventId = document.getElementById('booking-event-id');
  const modalEventTitle = document.getElementById('modal-event-title');
  const modalEventFaculty = document.getElementById('modal-event-faculty');
  const modalEventMeta = document.getElementById('modal-event-meta');
  const bookingNameInput = document.getElementById('booking-name');
  const bookingEmailInput = document.getElementById('booking-email');
  const bookingNameError = document.getElementById('booking-name-error');
  const bookingEmailError = document.getElementById('booking-email-error');
  const bookingStatusBox = document.getElementById('booking-status-box');
  const btnSubmitBooking = document.getElementById('btn-submit-booking');

  // ----------------------------------------------------
  // 1. Theme Management (localStorage + prefers-color-scheme)
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
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });

  // Listen for OS theme changes if user has no saved preference
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

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      currentEvents = data.events || [];
      renderEvents(currentEvents);
    } catch (err) {
      console.error('[NOTARI Fetch Error]', err);
      renderErrorState();
    }
  }

  function renderLoadingSkeleton() {
    noticeBoardGrid.innerHTML = `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 20px; width: 40%;"></div>
        <div class="skeleton-bone" style="height: 32px; width: 85%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 60%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 50%;"></div>
        <div class="skeleton-bone" style="height: 60px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 44px; width: 100%;"></div>
      </div>
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 20px; width: 45%;"></div>
        <div class="skeleton-bone" style="height: 32px; width: 75%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 55%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 45%;"></div>
        <div class="skeleton-bone" style="height: 60px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 44px; width: 100%;"></div>
      </div>
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 20px; width: 50%;"></div>
        <div class="skeleton-bone" style="height: 32px; width: 90%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 65%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 50%;"></div>
        <div class="skeleton-bone" style="height: 60px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 44px; width: 100%;"></div>
      </div>
    `;
  }

  function renderErrorState() {
    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 class="state-title">Unable to load notice board</h3>
        <p class="state-text">Could not connect to the campus event server. Check your network connection and try again.</p>
        <button id="btn-retry-fetch" class="btn btn-primary">Retry</button>
      </div>
    `;

    document.getElementById('btn-retry-fetch')?.addEventListener('click', loadEvents);
  }

  function renderEmptyState() {
    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <h3 class="state-title">Nothing pinned yet</h3>
        <p class="state-text">Check back soon or adjust your search and faculty filters to browse all campus events.</p>
        <button id="btn-reset-filters" class="btn btn-outline">Show All Postings</button>
      </div>
    `;

    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
      activeFaculty = 'All';
      activeTimeframe = null;
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      updateActiveChipUI();
      loadEvents();
    });
  }

  function renderEvents(events) {
    if (!events || events.length === 0) {
      renderEmptyState();
      return;
    }

    // Disable rotation if there are more than 15 cards to maintain visual clarity
    if (events.length > 15) {
      noticeBoardGrid.classList.add('disable-rotation');
    } else {
      noticeBoardGrid.classList.remove('disable-rotation');
    }

    noticeBoardGrid.innerHTML = events.map(event => {
      const eventDate = new Date(event.date);
      const isPast = eventDate < new Date();
      const isUpcoming = !isPast;
      const isToday = isEventToday(eventDate);
      const isThisWeek = isEventThisWeek(eventDate);

      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const attendeesCount = event.attendees ? event.attendees.length : 0;
      const capacity = event.capacity || 0;
      const isUnlimited = capacity === 0;
      const seatsLeft = isUnlimited ? null : Math.max(0, capacity - attendeesCount);
      const isFull = !isUnlimited && seatsLeft === 0;
      const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((attendeesCount / capacity) * 100));

      return `
        <article class="event-card${isPast ? ' is-past' : ''}" data-id="${event._id}">
          <!-- Eyebrow row -->
          <div class="card-eyebrow-row">
            <span class="card-tag" title="${escapeHtml(event.faculty || 'General')}">${escapeHtml(event.faculty || 'General')}</span>
            ${isPast ? '<span class="card-past-pill">Past</span>' : (isToday ? '<span class="card-urgent-pill">Today</span>' : (isThisWeek ? '<span class="card-urgent-pill">This Week</span>' : ''))}
          </div>

          <!-- Title -->
          <h3 class="card-title">${escapeHtml(event.eventName)}</h3>

          <!-- Meta (Organizer, Date, Venue) -->
          <div class="card-meta-list">
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>By <strong>${escapeHtml(event.organizer)}</strong></span>
            </div>

            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${formattedDate} • ${formattedTime}</span>
            </div>

            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(event.venue)}</span>
            </div>
          </div>

          <!-- Description -->
          <p class="card-description">${escapeHtml(event.description || 'No description provided.')}</p>

          <!-- Signature Torn-Ticket Seat Availability Stub -->
          <div class="ticket-stub">
            <div class="ticket-header">
              <span class="ticket-label">SEAT AVAILABILITY</span>
              <span class="ticket-count ${isFull ? 'seats-critical' : ''}">
                ${isUnlimited 
                  ? 'UNLIMITED CAPACITY' 
                  : (isFull ? 'FULL • 0 SEATS LEFT' : `${seatsLeft} / ${capacity} SEATS LEFT`)}
              </span>
            </div>

            ${!isUnlimited ? `
              <div class="ticket-perforation" aria-hidden="true">
                <div class="ticket-fill" style="width: ${usagePercent}%;"></div>
                <div class="ticket-dashed-line"></div>
              </div>
              <div class="ticket-footer">
                <span>${attendeesCount} CLAIMED</span>
                <span>${usagePercent}% CAPACITY</span>
              </div>
            ` : `
              <div class="ticket-footer" style="margin-top: 0.25rem;">
                <span>OPEN REGISTRATION</span>
                <span>FREE ACCESS</span>
              </div>
            `}
          </div>

          <!-- Actions -->
          <div class="card-actions">
            ${isPast ? `
              <button class="btn btn-outline" disabled style="opacity: 0.6; cursor: not-allowed;">
                Event has ended
              </button>
            ` : isFull ? `
              <button class="btn btn-outline btn-open-booking" data-id="${event._id}" data-full="true">
                Event full — join the waitlist
              </button>
            ` : `
              <button class="btn btn-accent btn-open-booking" data-id="${event._id}" data-full="false">
                Reserve Seat & Pass
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');

    // Attach click events to "Reserve Seat" buttons
    document.querySelectorAll('.btn-open-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = btn.getAttribute('data-id');
        const isFull = btn.getAttribute('data-full') === 'true';
        openBookingModal(eventId, isFull);
      });
    });
  }

  // ----------------------------------------------------
  // 3. Quick Booking Modal & Registration Flow
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
    modalEventFaculty.textContent = event.faculty || 'GENERAL';
    modalEventTitle.textContent = isPast ? `Past: ${event.eventName}` : (isFull ? `Waitlist: ${event.eventName}` : `Reserve: ${event.eventName}`);

    const eventDateStr = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const seatsLeft = event.capacity > 0 ? Math.max(0, event.capacity - (event.attendees ? event.attendees.length : 0)) : null;

    modalEventMeta.innerHTML = `
      <div class="card-meta-item">
        <strong>Organizer:</strong> ${escapeHtml(event.organizer)}
      </div>
      <div class="card-meta-item">
        <strong>When:</strong> ${eventDateStr}
      </div>
      <div class="card-meta-item">
        <strong>Where:</strong> ${escapeHtml(event.venue)}
      </div>
      <div class="card-meta-item">
        <strong>Capacity:</strong> ${event.capacity === 0 ? 'Unlimited Open Seating' : (isFull ? 'Event is currently full' : `${seatsLeft} seats remaining`)}
      </div>
    `;

    if (isPast) {
      btnSubmitBooking.textContent = 'Registration closed';
      btnSubmitBooking.className = 'btn btn-outline';
      btnSubmitBooking.style.width = '100%';
      btnSubmitBooking.disabled = true;
    } else {
      btnSubmitBooking.textContent = isFull ? 'Join Event Waitlist' : 'Claim Seat & Receive Pass';
      btnSubmitBooking.className = isFull ? 'btn btn-outline' : 'btn btn-accent';
      btnSubmitBooking.style.width = '100%';
      btnSubmitBooking.disabled = false;
    }

    // Reset form states
    bookingNameInput.value = '';
    bookingEmailInput.value = '';
    bookingNameInput.classList.remove('is-invalid');
    bookingEmailInput.classList.remove('is-invalid');
    bookingNameError.classList.remove('visible');
    bookingEmailError.classList.remove('visible');
    bookingStatusBox.style.display = 'none';

    bookingModal.classList.add('active');
    bookingNameInput.focus();
  }

  function closeBookingModal() {
    bookingModal.classList.remove('active');
  }

  modalCloseBtn.addEventListener('click', closeBookingModal);
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeBookingModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookingModal.classList.contains('active')) {
      closeBookingModal();
    }
  });

  // Handle Form Submission
  quickBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = bookingNameInput.value.trim();
    const email = bookingEmailInput.value.trim();
    const eventId = bookingEventId.value;

    let hasError = false;

    // Validate Name
    if (!name) {
      bookingNameInput.classList.add('is-invalid');
      bookingNameError.classList.add('visible');
      hasError = true;
    } else {
      bookingNameInput.classList.remove('is-invalid');
      bookingNameError.classList.remove('visible');
    }

    // Validate Email
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

      // Success
      if (data.status === 'confirmed') {
        showToast("You're in — check your email for your ticket.");
        // Redirect to full ticket confirmation view
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
    bookingStatusBox.className = type === 'error' ? 'form-error visible' : 'ticket-detail-val';
    bookingStatusBox.textContent = msg;
  }

  // ----------------------------------------------------
  // 4. Filters & Search Handlers
  // ----------------------------------------------------
  if (btnTogglePast) {
    btnTogglePast.addEventListener('click', () => {
      includePast = !includePast;
      btnTogglePast.textContent = includePast ? 'Hide past events' : 'Show past events';
      btnTogglePast.classList.toggle('active', includePast);
      loadEvents();
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filterType = chip.getAttribute('data-filter');
      const filterValue = chip.getAttribute('data-value');

      if (filterType === 'faculty') {
        activeFaculty = filterValue;
      } else if (filterType === 'timeframe') {
        if (activeTimeframe === filterValue) {
          activeTimeframe = null; // toggle off
        } else {
          activeTimeframe = filterValue;
        }
      }

      updateActiveChipUI();
      loadEvents();
    });
  });

  function updateActiveChipUI() {
    filterChips.forEach(chip => {
      const filterType = chip.getAttribute('data-filter');
      const filterValue = chip.getAttribute('data-value');

      if (filterType === 'faculty') {
        if (activeFaculty === filterValue) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      } else if (filterType === 'timeframe') {
        if (activeTimeframe === filterValue) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimeout);
      searchQuery = e.target.value;
      searchDebounceTimeout = setTimeout(() => {
        loadEvents();
      }, 250);
    });
  }

  // ----------------------------------------------------
  // 5. Toast Notifications
  // ----------------------------------------------------
  function showToast(message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

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
  function isEventToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  function isEventThisWeek(date) {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return date >= today && date <= nextWeek;
  }

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
