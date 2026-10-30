/**
 * NOTARI 2.0 — Student Notice Board Engine
 * Hybrid Editorial + Modern SaaS Campus Event Discovery
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentEvents = [];
  let activeFaculty = 'All';
  let activeTimeframe = null;
  let searchQuery = '';
  let searchDebounceTimeout = null;
  let includePast = false;

  // DOM Elements - Discovery & Notice Board
  const noticeBoardGrid = document.getElementById('notice-board-grid');
  const featuredEventContainer = document.getElementById('featured-event-container');
  const eventsCountBadge = document.getElementById('events-count-badge');
  const bulletinEventsCount = document.getElementById('bulletin-events-count');
  const heroBulletinDate = document.getElementById('hero-bulletin-date');
  const btnHeroHeadliner = document.getElementById('btn-hero-headliner');
  const navLinkFeatured = document.getElementById('nav-link-featured');
  const searchInput = document.getElementById('event-search');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const filterStatusRow = document.getElementById('filter-status-row');
  const filterStatusText = document.getElementById('filter-status-text');
  const btnResetFilterStatus = document.getElementById('btn-reset-filter-status');
  const filterChips = document.querySelectorAll('.filter-chip');
  const btnTogglePast = document.getElementById('btn-toggle-past');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');
  const toastContainer = document.getElementById('toast-container');

  // DOM Elements - Quick Booking Modal
  const bookingModal = document.getElementById('booking-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalEventFlyer = document.getElementById('modal-event-flyer');
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
  // 1. Theme Management (Synchronous bootstrap + toggle)
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

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('notari_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Set today's date in bulletin header
  if (heroBulletinDate) {
    const now = new Date();
    heroBulletinDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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
      renderBoard(currentEvents);
      updateFilterStatusDisplay(currentEvents.length);
    } catch (err) {
      console.error('[NOTARI Fetch Error]', err);
      renderErrorState();
    }
  }

  function renderLoadingSkeleton() {
    if (featuredEventContainer) {
      featuredEventContainer.style.display = 'none';
      featuredEventContainer.innerHTML = '';
    }
    if (eventsCountBadge) {
      eventsCountBadge.textContent = 'Loading...';
    }

    noticeBoardGrid.innerHTML = `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 140px; width: 100%; border-radius: var(--radius-md);"></div>
        <div class="skeleton-bone" style="height: 20px; width: 40%;"></div>
        <div class="skeleton-bone" style="height: 28px; width: 85%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 60%;"></div>
        <div class="skeleton-bone" style="height: 50px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 40px; width: 100%;"></div>
      </div>
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 140px; width: 100%; border-radius: var(--radius-md);"></div>
        <div class="skeleton-bone" style="height: 20px; width: 45%;"></div>
        <div class="skeleton-bone" style="height: 28px; width: 75%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 55%;"></div>
        <div class="skeleton-bone" style="height: 50px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 40px; width: 100%;"></div>
      </div>
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-bone" style="height: 140px; width: 100%; border-radius: var(--radius-md);"></div>
        <div class="skeleton-bone" style="height: 20px; width: 50%;"></div>
        <div class="skeleton-bone" style="height: 28px; width: 90%;"></div>
        <div class="skeleton-bone" style="height: 16px; width: 65%;"></div>
        <div class="skeleton-bone" style="height: 50px; width: 100%; margin-top: auto;"></div>
        <div class="skeleton-bone" style="height: 40px; width: 100%;"></div>
      </div>
    `;
  }

  function renderErrorState() {
    if (featuredEventContainer) {
      featuredEventContainer.style.display = 'none';
      featuredEventContainer.innerHTML = '';
    }
    if (eventsCountBadge) {
      eventsCountBadge.textContent = 'Offline';
    }

    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 class="state-title">Unable to load notice board</h3>
        <p class="state-text">Could not connect to the campus event server. Check your connection and try again.</p>
        <button id="btn-retry-fetch" class="btn btn-primary">Retry</button>
      </div>
    `;

    document.getElementById('btn-retry-fetch')?.addEventListener('click', loadEvents);
  }

  function renderEmptyState() {
    if (featuredEventContainer) {
      featuredEventContainer.style.display = 'none';
      featuredEventContainer.innerHTML = '';
    }
    if (eventsCountBadge) {
      eventsCountBadge.textContent = '0 Postings';
    }
    if (bulletinEventsCount) {
      bulletinEventsCount.textContent = '0 Events';
    }

    const isFiltered = activeFaculty !== 'All' || !!searchQuery.trim() || !!activeTimeframe;

    noticeBoardGrid.innerHTML = `
      <div class="state-box">
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <h3 class="state-title">${isFiltered ? 'No matching events found' : 'Nothing pinned yet'}</h3>
        <p class="state-text">
          ${isFiltered 
            ? 'No campus events matched your current search or faculty filter. Try clearing filters to see all postings.' 
            : 'Check back soon for new society gatherings, guest lectures, and campus workshops.'}
        </p>
        ${isFiltered ? '<button id="btn-reset-filters" class="btn btn-outline">Clear All Filters</button>' : ''}
      </div>
    `;

    if (isFiltered) {
      document.getElementById('btn-reset-filters')?.addEventListener('click', resetAllFilters);
    }
  }

  // ----------------------------------------------------
  // 3. Editorial Layout Orchestration: Featured + Grid
  // ----------------------------------------------------
  function renderBoard(events) {
    if (!events || events.length === 0) {
      renderEmptyState();
      return;
    }

    // Update bulletin count
    if (bulletinEventsCount) {
      bulletinEventsCount.textContent = `${events.length} Event${events.length === 1 ? '' : 's'}`;
    }
    if (eventsCountBadge) {
      eventsCountBadge.textContent = `${events.length} Posting${events.length === 1 ? '' : 's'}`;
    }

    // Determine if we should present a Headliner Notice:
    // Only in default overview mode (faculty === 'All', no search query, no timeframe filter)
    const isDefaultBrowseMode = (activeFaculty === 'All') && !searchQuery.trim() && !activeTimeframe;

    let headlinerEvent = null;
    let gridEvents = events;

    if (isDefaultBrowseMode && events.length > 0) {
      // Find the first upcoming event, or fallback to the first event
      const upcoming = events.find(e => new Date(e.date) >= new Date());
      headlinerEvent = upcoming || events[0];
      gridEvents = events.filter(e => e._id !== headlinerEvent._id);
    }

    // Render Headliner Event
    if (headlinerEvent && featuredEventContainer) {
      renderFeaturedEvent(headlinerEvent);
      featuredEventContainer.style.display = 'block';
      if (btnHeroHeadliner) btnHeroHeadliner.style.display = 'inline-flex';
      if (navLinkFeatured) navLinkFeatured.style.display = 'inline-block';
    } else {
      if (featuredEventContainer) {
        featuredEventContainer.style.display = 'none';
        featuredEventContainer.innerHTML = '';
      }
      if (btnHeroHeadliner) btnHeroHeadliner.style.display = 'none';
      if (navLinkFeatured) navLinkFeatured.style.display = 'none';
    }

    // Render Grid Cards
    renderGridCards(gridEvents);
  }

  // Render Headliner Event Card
  function renderFeaturedEvent(event) {
    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();
    const isToday = isEventToday(eventDate);
    const isThisWeek = isEventThisWeek(eventDate);

    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
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

    const flyerContent = event.flyerUrl 
      ? `<img src="${escapeHtml(event.flyerUrl)}" alt="${escapeHtml(event.eventName)} Flyer" class="featured-flyer-img" onerror="this.onerror=null; this.parentElement.innerHTML = getFallbackFlyerHtml('${escapeHtml(event.faculty || 'General')}');">`
      : getFallbackFlyerHtml(event.faculty || 'General');

    featuredEventContainer.innerHTML = `
      <article class="featured-event-card${isPast ? ' is-past' : ''}" data-id="${event._id}">
        <div class="featured-flyer-col">
          ${flyerContent}
        </div>
        <div class="featured-content-col">
          <div class="featured-eyebrow">
            <span class="featured-kicker">★ Headliner Notice</span>
            <span class="card-tag">${escapeHtml(event.faculty || 'General')}</span>
            ${isPast ? '<span class="card-past-pill">Past</span>' : (isToday ? '<span class="card-urgent-pill">Today</span>' : (isThisWeek ? '<span class="card-urgent-pill">This Week</span>' : ''))}
          </div>

          <h3 class="featured-title" data-open-modal="${event._id}">${escapeHtml(event.eventName)}</h3>

          <div class="featured-meta-list">
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Organized by <strong>${escapeHtml(event.organizer)}</strong></span>
            </div>
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${formattedDate} at ${formattedTime}</span>
            </div>
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(event.venue)}</span>
            </div>
          </div>

          <p class="featured-description">${escapeHtml(event.description || 'Join fellow students for this campus highlight.')}</p>

          <!-- Ticket Stub Seat Indicator -->
          <div class="ticket-stub" style="margin-bottom: var(--space-4);">
            <div class="ticket-header">
              <span class="ticket-label">Seat Availability</span>
              <span class="ticket-count ${isFull ? 'seats-critical' : ''}">
                ${isUnlimited 
                  ? 'UNLIMITED SEATS' 
                  : (isFull ? 'EVENT FULL • 0 SEATS LEFT' : `${seatsLeft} / ${capacity} SEATS LEFT`)}
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
                <span>FREE STUDENT ADMISSION</span>
              </div>
            `}
          </div>

          <div class="featured-actions">
            ${isPast ? `
              <button class="btn btn-outline" disabled style="opacity: 0.6; cursor: not-allowed;">
                Event Has Ended
              </button>
            ` : isFull ? `
              <button class="btn btn-outline btn-open-booking" data-id="${event._id}" data-full="true">
                Join Event Waitlist
              </button>
            ` : `
              <button class="btn btn-accent btn-open-booking" data-id="${event._id}" data-full="false">
                Reserve Seat & Pass
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }

  // Render Grid Cards
  function renderGridCards(events) {
    if (events.length === 0) {
      noticeBoardGrid.innerHTML = `
        <div class="state-box" style="grid-column: 1 / -1;">
          <p class="state-text">Check the Headliner Notice above for current campus highlight.</p>
        </div>
      `;
      return;
    }

    // Disable subtle card tilt if grid has more than 15 cards
    if (events.length > 15) {
      noticeBoardGrid.classList.add('disable-rotation');
    } else {
      noticeBoardGrid.classList.remove('disable-rotation');
    }

    noticeBoardGrid.innerHTML = events.map(event => {
      const eventDate = new Date(event.date);
      const isPast = eventDate < new Date();
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

      const hasFlyer = !!event.flyerUrl;

      const urgencyPillHtml = isPast 
        ? '<span class="card-past-pill">Past</span>' 
        : (isToday ? '<span class="card-urgent-pill">Today</span>' : (isThisWeek ? '<span class="card-urgent-pill">This Week</span>' : ''));

      return `
        <article class="event-card${isPast ? ' is-past' : ''}${hasFlyer ? ' has-flyer' : ''}" data-id="${event._id}">
          <!-- Flyer Presentation -->
          <div class="card-flyer-wrapper">
            ${hasFlyer ? `
              <img 
                src="${escapeHtml(event.flyerUrl)}" 
                alt="${escapeHtml(event.eventName)} Flyer" 
                class="card-flyer-img" 
                loading="lazy" 
                onerror="this.onerror=null; this.parentElement.innerHTML = getFallbackFlyerHtml('${escapeHtml(event.faculty || 'General')}');"
              >
            ` : getFallbackFlyerHtml(event.faculty || 'General')}
            <div class="card-flyer-overlay">
              <span class="card-tag" title="${escapeHtml(event.faculty || 'General')}">${escapeHtml(event.faculty || 'General')}</span>
              ${urgencyPillHtml}
            </div>
          </div>

          <!-- Card Content Body -->
          <div class="card-body">
            <!-- Title (Clickable) -->
            <h3 class="card-title" data-open-modal="${event._id}">${escapeHtml(event.eventName)}</h3>

            <!-- Meta (Organizer, Date, Venue) -->
            <div class="card-meta-list">
              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>By <strong>${escapeHtml(event.organizer)}</strong></span>
              </div>

              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${formattedDate} • ${formattedTime}</span>
              </div>

              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
                  Event full — join waitlist
                </button>
              ` : `
                <button class="btn btn-accent btn-open-booking" data-id="${event._id}" data-full="false">
                  Reserve Seat & Pass
                </button>
              `}
            </div>
          </div>
        </article>
      `;
    }).join('');

    attachCardInteractions();
  }

  // Attach click interactions to buttons and titles
  function attachCardInteractions() {
    // "Reserve Seat" and "Join Waitlist" buttons
    document.querySelectorAll('.btn-open-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = btn.getAttribute('data-id');
        const isFull = btn.getAttribute('data-full') === 'true';
        openBookingModal(eventId, isFull);
      });
    });

    // Clickable event titles
    document.querySelectorAll('[data-open-modal]').forEach(titleEl => {
      titleEl.addEventListener('click', () => {
        const eventId = titleEl.getAttribute('data-open-modal');
        const event = currentEvents.find(e => e._id === eventId);
        const isFull = event && event.capacity > 0 && event.attendees && event.attendees.length >= event.capacity;
        openBookingModal(eventId, isFull);
      });
    });
  }

  // Fallback Graphic for missing flyer images
  function getFallbackFlyerHtml(faculty) {
    const safeFaculty = escapeHtml(faculty || 'General');
    const words = safeFaculty.split(/[\s&/]+/);
    const initials = words.length > 1 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : safeFaculty.slice(0, 2).toUpperCase();

    return `
      <div class="card-flyer-fallback" aria-hidden="true">
        <span class="fallback-monogram">${initials}</span>
        <span class="fallback-faculty">${safeFaculty}</span>
      </div>
    `;
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
    modalEventFaculty.textContent = event.faculty || 'GENERAL';
    modalEventTitle.textContent = isPast 
      ? `Past: ${event.eventName}` 
      : (isFull ? `Waitlist: ${event.eventName}` : `Reserve: ${event.eventName}`);

    // Modal Flyer Banner
    if (modalEventFlyer) {
      if (event.flyerUrl) {
        modalEventFlyer.innerHTML = `<img src="${escapeHtml(event.flyerUrl)}" alt="${escapeHtml(event.eventName)}" class="modal-flyer-img" onerror="this.parentElement.style.display='none'">`;
        modalEventFlyer.style.display = 'block';
      } else {
        modalEventFlyer.style.display = 'none';
        modalEventFlyer.innerHTML = '';
      }
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
      btnSubmitBooking.textContent = 'Registration Closed';
      btnSubmitBooking.className = 'btn btn-outline';
      btnSubmitBooking.style.width = '100%';
      btnSubmitBooking.disabled = true;
    } else {
      btnSubmitBooking.textContent = isFull ? 'Join Event Waitlist' : 'Claim Seat & Receive Pass';
      btnSubmitBooking.className = isFull ? 'btn btn-outline' : 'btn btn-accent';
      btnSubmitBooking.style.width = '100%';
      btnSubmitBooking.disabled = false;
    }

    // Reset validation & form fields
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
  // 5. Search, Filter Chips & Keyboard Shortcut
  // ----------------------------------------------------
  // Shortcut '/' to focus search input
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isFocusInInput()) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  function isFocusInInput() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  // Search input change handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimeout);
      searchQuery = e.target.value;

      if (btnClearSearch) {
        btnClearSearch.style.display = searchQuery ? 'flex' : 'none';
      }

      searchDebounceTimeout = setTimeout(() => {
        loadEvents();
      }, 250);
    });
  }

  // Clear search button
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

  // Filter chips
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
        chip.classList.toggle('active', activeFaculty === filterValue);
      } else if (filterType === 'timeframe') {
        chip.classList.toggle('active', activeTimeframe === filterValue);
      }
    });
  }

  // Dynamic filter status banner
  function updateFilterStatusDisplay(resultCount) {
    if (!filterStatusRow) return;

    const isFiltered = activeFaculty !== 'All' || !!searchQuery.trim() || !!activeTimeframe;

    if (!isFiltered) {
      filterStatusRow.style.display = 'none';
      return;
    }

    const parts = [];
    if (searchQuery.trim()) {
      parts.push(`matching "<strong>${escapeHtml(searchQuery.trim())}</strong>"`);
    }
    if (activeFaculty !== 'All') {
      parts.push(`in <strong>${escapeHtml(activeFaculty)}</strong>`);
    }
    if (activeTimeframe === 'this_week') {
      parts.push(`scheduled for <strong>This Week</strong>`);
    }

    filterStatusText.innerHTML = `Showing <strong>${resultCount}</strong> ${resultCount === 1 ? 'event' : 'events'} ${parts.join(' • ')}`;
    filterStatusRow.style.display = 'flex';
  }

  function resetAllFilters() {
    activeFaculty = 'All';
    activeTimeframe = null;
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
    }
    if (btnClearSearch) {
      btnClearSearch.style.display = 'none';
    }
    updateActiveChipUI();
    loadEvents();
  }

  if (btnResetFilterStatus) {
    btnResetFilterStatus.addEventListener('click', resetAllFilters);
  }

  if (btnTogglePast) {
    btnTogglePast.addEventListener('click', () => {
      includePast = !includePast;
      btnTogglePast.textContent = includePast ? 'Hide past events' : 'Show past events';
      btnTogglePast.classList.toggle('active', includePast);
      loadEvents();
    });
  }

  // ----------------------------------------------------
  // 6. Toast Notifications
  // ----------------------------------------------------
  function showToast(message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
