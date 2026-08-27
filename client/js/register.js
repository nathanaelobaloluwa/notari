/**
 * NOTARI — Registration & Digital Ticket Pass Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const initialStatus = urlParams.get('status');
  const initialTicketCode = urlParams.get('ticketCode');
  const initialName = urlParams.get('name');
  const initialEmail = urlParams.get('email');

  const contentArea = document.getElementById('pass-content-area');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');

  // ----------------------------------------------------
  // 1. Theme Management
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
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // ----------------------------------------------------
  // 2. Load Event & Render Appropriate Screen
  // ----------------------------------------------------
  if (!eventId) {
    renderError('No event specified', 'Please select an event from the notice board to reserve a pass.');
    return;
  }

  fetchEventAndRender();

  async function fetchEventAndRender() {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        throw new Error('Event not found or server error');
      }
      const data = await res.json();
      const event = data.event;

      if (initialStatus === 'confirmed' && initialTicketCode) {
        renderConfirmedPass(event, {
          ticketCode: initialTicketCode,
          name: decodeURIComponent(initialName || 'Registered Attendee'),
          email: decodeURIComponent(initialEmail || '')
        });
      } else {
        renderBookingForm(event);
      }
    } catch (err) {
      console.error(err);
      renderError('Event not found', 'This event posting may have been unpinned or removed.');
    }
  }

  // ----------------------------------------------------
  // 3. Render Booking Form Screen
  // ----------------------------------------------------
  function renderBookingForm(event) {
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const attendeesCount = event.attendees ? event.attendees.length : 0;
    const capacity = event.capacity || 0;
    const isUnlimited = capacity === 0;
    const seatsLeft = isUnlimited ? null : Math.max(0, capacity - attendeesCount);
    const isFull = !isUnlimited && seatsLeft === 0;
    const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((attendeesCount / capacity) * 100));

    contentArea.innerHTML = `
      <div style="max-width: 580px; margin: 0 auto;">
        <!-- Card Header Info -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span class="card-tag">${escapeHtml(event.faculty || 'General')}</span>
            <span class="card-tag" style="background: color-mix(in srgb, var(--ink) 8%, transparent); color: var(--ink);">By ${escapeHtml(event.organizer)}</span>
          </div>
          <h2 style="font-family: var(--font-display); font-size: 2rem; font-weight: 800; line-height: 1.15; color: var(--ink); margin-bottom: 0.75rem;">
            ${escapeHtml(event.eventName)}
          </h2>
          <p style="color: var(--ink-muted); font-size: 0.95rem; line-height: 1.5;">
            ${escapeHtml(event.description || '')}
          </p>
        </div>

        <!-- Meta Details Box -->
        <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1.5rem;">
          <div class="card-meta-list">
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span><strong>When:</strong> ${eventDate}</span>
            </div>
            <div class="card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span><strong>Where:</strong> ${escapeHtml(event.venue)}</span>
            </div>
            ${event.contact ? `
              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span><strong>Contact:</strong> ${escapeHtml(event.contact)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Torn-ticket capacity visualization -->
          <div class="ticket-stub" style="margin-top: 1rem; margin-bottom: 0;">
            <div class="ticket-header">
              <span class="ticket-label">SEAT AVAILABILITY</span>
              <span class="ticket-count ${isFull ? 'seats-critical' : ''}">
                ${isUnlimited ? 'UNLIMITED' : (isFull ? 'EVENT FULL' : `${seatsLeft} / ${capacity} SEATS LEFT`)}
              </span>
            </div>
            ${!isUnlimited ? `
              <div class="ticket-perforation" aria-hidden="true">
                <div class="ticket-fill" style="width: ${usagePercent}%;"></div>
                <div class="ticket-dashed-line"></div>
              </div>
              <div class="ticket-footer">
                <span>${attendeesCount} BOOKED</span>
                <span>${usagePercent}% CAPACITY</span>
              </div>
            ` : `
              <div class="ticket-footer" style="margin-top: 0.25rem;">
                <span>OPEN REGISTRATION</span>
                <span>NO TICKET LIMIT</span>
              </div>
            `}
          </div>
        </div>

        <!-- Booking Form Container -->
        <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow-card);">
          <h3 style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--ink);">
            ${isFull ? 'Join Event Waitlist' : 'Enter Your Details'}
          </h3>

          <form id="page-booking-form" novalidate>
            <div class="form-group">
              <label for="input-name" class="form-label">Full Name <span class="required-star">*</span></label>
              <input type="text" id="input-name" class="form-input" placeholder="e.g. Alexis Taylor" required autocomplete="name">
              <span class="form-error" id="name-error">Please enter your full name.</span>
            </div>

            <div class="form-group">
              <label for="input-email" class="form-label">University / Student Email <span class="required-star">*</span></label>
              <input type="email" id="input-email" class="form-input" placeholder="e.g. ataylor@campus.edu" required autocomplete="email">
              <span class="form-error" id="email-error">Please enter a valid university email address.</span>
            </div>

            <div id="form-feedback" class="form-error" style="margin-bottom: 1rem;"></div>

            <button type="submit" id="btn-submit-pass" class="${isFull ? 'btn btn-outline' : 'btn btn-accent'}" style="width: 100%;">
              ${isFull ? 'Event full — join the waitlist' : 'Claim Seat & Receive Pass'}
            </button>
          </form>

          <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 0.75rem 0 0 0; text-align: center;">
            By registering, you agree to our <a href="privacy.html" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: underline;">Privacy Policy</a>.
          </p>
        </div>
      </div>
    `;

    // Hook Form Submit
    const form = document.getElementById('page-booking-form');
    const nameInput = document.getElementById('input-name');
    const emailInput = document.getElementById('input-email');
    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const feedback = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('btn-submit-pass');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();

      let hasError = false;
      if (!name) {
        nameInput.classList.add('is-invalid');
        nameError.classList.add('visible');
        hasError = true;
      } else {
        nameInput.classList.remove('is-invalid');
        nameError.classList.remove('visible');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        emailInput.classList.add('is-invalid');
        emailError.classList.add('visible');
        hasError = true;
      } else {
        emailInput.classList.remove('is-invalid');
        emailError.classList.remove('visible');
      }

      if (hasError) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing reservation...';
      feedback.classList.remove('visible');

      try {
        const res = await fetch(`/api/events/${event._id}/register`, {
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
          feedback.textContent = data.error || 'Registration could not be completed.';
          feedback.classList.add('visible');
          submitBtn.disabled = false;
          submitBtn.textContent = isFull ? 'Event full — join the waitlist' : 'Claim Seat & Receive Pass';
          return;
        }

        if (data.status === 'confirmed') {
          renderConfirmedPass(event, {
            ticketCode: data.ticket.ticketCode,
            name,
            email
          });
        } else if (data.status === 'waitlisted') {
          renderWaitlistedState(event, name, email);
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Network error during reservation. Please retry.';
        feedback.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Claim Seat & Receive Pass';
      }
    });
  }

  // ----------------------------------------------------
  // 4. Render Confirmed Ticket Pass Screen
  // ----------------------------------------------------
  function renderConfirmedPass(event, attendee) {
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    contentArea.innerHTML = `
      <div style="max-width: 620px; margin: 0 auto;">
        <!-- Confirmation Copy Banner (Plain, direct, student-facing) -->
        <div class="ticket-confirmation-banner">
          <svg class="ticket-confirmation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>
            <h3 class="ticket-confirmation-title">You're in — check your email for your ticket.</h3>
            <p class="ticket-confirmation-copy">Your pass has been registered on the server and an official ticket confirmation was dispatched to <strong>${escapeHtml(attendee.email)}</strong>.</p>
          </div>
        </div>

        <!-- Tactile Paper Ticket Stub Card -->
        <div class="ticket-full-card" id="printable-ticket">
          <!-- Ticket Top Bar -->
          <div class="ticket-card-header">
            <div class="ticket-brand">NOTARI • CAMPUS PASS</div>
            <div class="ticket-badge">${escapeHtml(event.faculty || 'GENERAL')}</div>
          </div>

          <!-- Ticket Content -->
          <div class="ticket-card-body">
            <div class="ticket-detail-label">OFFICIAL EVENT ADMISSION</div>
            <h2 class="ticket-event-name">${escapeHtml(event.eventName)}</h2>

            <div class="ticket-details-grid">
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">ATTENDEE NAME</span>
                <span class="ticket-detail-val">${escapeHtml(attendee.name)}</span>
              </div>
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">EMAIL ADDRESS</span>
                <span class="ticket-detail-val">${escapeHtml(attendee.email)}</span>
              </div>
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">DATE & TIME</span>
                <span class="ticket-detail-val">${eventDate}</span>
              </div>
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">VENUE LOCATION</span>
                <span class="ticket-detail-val">${escapeHtml(event.venue)}</span>
              </div>
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">ORGANIZED BY</span>
                <span class="ticket-detail-val">${escapeHtml(event.organizer)}</span>
              </div>
              <div class="ticket-detail-item">
                <span class="ticket-detail-label">CONTACT INFO</span>
                <span class="ticket-detail-val">${escapeHtml(event.contact || 'campus.events@univ.edu')}</span>
              </div>
            </div>

            <!-- Perforation Cutout Line -->
            <hr class="ticket-divider-line">

            <!-- Ticket Code Box & Barcode Graphic -->
            <div style="text-align: center;">
              <div class="ticket-detail-label" style="margin-bottom: 0.4rem;">VERIFICATION PASS CODE</div>
              <div style="font-family: var(--font-mono); font-size: 1.45rem; font-weight: 700; color: var(--accent-2); letter-spacing: 0.15em;">
                ${escapeHtml(attendee.ticketCode)}
              </div>

              <!-- Barcode Mockup -->
              <div class="ticket-barcode" aria-hidden="true">
                <span style="width: 3px;"></span>
                <span style="width: 2px;"></span>
                <span style="width: 5px;"></span>
                <span style="width: 1px;"></span>
                <span style="width: 4px;"></span>
                <span style="width: 2px;"></span>
                <span style="width: 6px;"></span>
                <span style="width: 2px;"></span>
                <span style="width: 3px;"></span>
                <span style="width: 4px;"></span>
                <span style="width: 1px;"></span>
                <span style="width: 5px;"></span>
                <span style="width: 3px;"></span>
                <span style="width: 2px;"></span>
                <span style="width: 4px;"></span>
                <span style="width: 6px;"></span>
                <span style="width: 2px;"></span>
                <span style="width: 3px;"></span>
              </div>
              <div class="ticket-code-text">${escapeHtml(attendee.ticketCode)} • NOTARI CAMPUS NETWORK</div>
            </div>
          </div>
        </div>

        <!-- Post-booking action buttons -->
        <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.75rem; flex-wrap: wrap;">
          <button class="btn btn-outline" id="btn-print-pass">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            <span>Print or Save Pass</span>
          </button>
          
          <a href="index.html" class="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Notice Board</span>
          </a>
        </div>
      </div>
    `;

    document.getElementById('btn-print-pass')?.addEventListener('click', () => {
      window.print();
    });
  }

  function renderWaitlistedState(event, name, email) {
    contentArea.innerHTML = `
      <div style="max-width: 580px; margin: 0 auto; text-align: center;">
        <div class="state-box">
          <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 14 14"></polyline>
          </svg>
          <h2 class="state-title">You're on the waitlist</h2>
          <p class="state-text">
            We have recorded your details (<strong>${escapeHtml(email)}</strong>). If a seat opens up for <strong>${escapeHtml(event.eventName)}</strong>, we will notify you immediately.
          </p>
          <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">
            Return to Notice Board
          </a>
        </div>
      </div>
    `;
  }

  function renderError(title, msg) {
    contentArea.innerHTML = `
      <div style="max-width: 580px; margin: 0 auto;">
        <div class="state-box">
          <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 class="state-title">${escapeHtml(title)}</h2>
          <p class="state-text">${escapeHtml(msg)}</p>
          <a href="index.html" class="btn btn-primary">Return to Notice Board</a>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize
  initTheme();
});
