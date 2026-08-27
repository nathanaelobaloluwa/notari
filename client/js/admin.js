/**
 * NOTARI — Club Executive Admin Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  let authToken = localStorage.getItem('notari_admin_token');
  let currentAdminRole = localStorage.getItem('notari_admin_role') || null;
  let loadedEvents = [];
  let currentEventRoster = null;
  let pendingCountTimer = null;

  // DOM Elements - Auth & Views
  const adminLoginView = document.getElementById('admin-login-view');
  const adminDashboardView = document.getElementById('admin-dashboard-view');
  const adminLoginForm = document.getElementById('admin-login-form');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginUsernameError = document.getElementById('login-username-error');
  const loginPasswordError = document.getElementById('login-password-error');
  const loginAlert = document.getElementById('login-alert');
  const btnLogout = document.getElementById('btn-logout');
  const btnRequestAdminAccess = document.getElementById('btn-request-admin-access');

  // Stats & Table
  const statTotalEvents = document.getElementById('stat-total-events');
  const statTotalAttendees = document.getElementById('stat-total-attendees');
  const statTotalWaitlist = document.getElementById('stat-total-waitlist');
  const adminEventsTbody = document.getElementById('admin-events-tbody');
  const btnOpenRequestsView = document.getElementById('btn-open-requests-view');
  const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');
  const adminRequestsView = document.getElementById('admin-requests-view');
  const pendingRequestsTbody = document.getElementById('pending-requests-tbody');
  const btnNotificationsBell = document.getElementById('btn-notifications-bell');
  const notificationsBadge = document.getElementById('notifications-badge');

  // Event Modal Elements
  const eventFormModal = document.getElementById('event-form-modal');
  const eventEditorForm = document.getElementById('event-editor-form');
  const btnOpenCreateModal = document.getElementById('btn-open-create-modal');
  const btnCloseFormModal = document.getElementById('btn-close-form-modal');
  const btnCancelForm = document.getElementById('btn-cancel-form');
  const formModalTitle = document.getElementById('form-modal-title');
  const formModalEyebrow = document.getElementById('form-modal-eyebrow');
  const formErrorFeedback = document.getElementById('form-error-feedback');

  // Form Fields
  const editEventId = document.getElementById('edit-event-id');
  const evName = document.getElementById('ev-name');
  const evOrganizer = document.getElementById('ev-organizer');
  const evFaculty = document.getElementById('ev-faculty');
  const evDate = document.getElementById('ev-date');
  const evVenue = document.getElementById('ev-venue');
  const evCapacity = document.getElementById('ev-capacity');
  const evContact = document.getElementById('ev-contact');
  const evDescription = document.getElementById('ev-description');
  const evFlyer = document.getElementById('ev-flyer');
  const evFlyerError = document.getElementById('ev-flyer-error');

  // Attendees Modal Elements
  const attendeesModal = document.getElementById('attendees-modal');
  const btnCloseAttendeesModal = document.getElementById('btn-close-attendees-modal');
  const attendeesModalTitle = document.getElementById('attendees-modal-title');
  const attendeeCountBadge = document.getElementById('attendee-count-badge');
  const attendeesTableBody = document.getElementById('attendees-table-body');
  const waitlistSection = document.getElementById('waitlist-section');
  const waitlistTableBody = document.getElementById('waitlist-table-body');
  const btnExportCsv = document.getElementById('btn-export-csv');

  // Signup Modal Elements
  const signupModal = document.getElementById('signup-modal');
  const btnCloseSignupModal = document.getElementById('btn-close-signup-modal');
  const btnCancelSignup = document.getElementById('btn-cancel-signup');
  const adminSignupForm = document.getElementById('admin-signup-form');
  const signupUsernameInput = document.getElementById('signup-username');
  const signupEmailInput = document.getElementById('signup-email');
  const signupClubInput = document.getElementById('signup-club');
  const signupIdentificationInput = document.getElementById('signup-identification');
  const signupPasswordInput = document.getElementById('signup-password');
  const signupUsernameError = document.getElementById('signup-username-error');
  const signupEmailError = document.getElementById('signup-email-error');
  const signupIdentificationError = document.getElementById('signup-identification-error');
  const signupPasswordError = document.getElementById('signup-password-error');
  const signupErrorFeedback = document.getElementById('signup-error-feedback');

  // Toast & Theme
  const toastContainer = document.getElementById('toast-container');
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
  // 2. Authentication Flow
  // ----------------------------------------------------
  async function checkAuthSession() {
    if (!authToken) {
      showLoginView();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

         if (res.ok) {
           const data = await res.json();
           currentAdminRole = data.admin.role;
           localStorage.setItem('notari_admin_role', currentAdminRole);
           showDashboardView();
           loadAdminEvents();
           handlePostAuthNavigation();
           startPendingCountPolling();
         } else {
         localStorage.removeItem('notari_admin_token');
         localStorage.removeItem('notari_admin_role');
         authToken = null;
         currentAdminRole = null;
         showLoginView();
       }
    } catch (err) {
      console.error(err);
      showLoginView();
    }
  }

   function showLoginView() {
     adminLoginView.style.display = 'block';
     adminDashboardView.style.display = 'none';
     adminRequestsView.style.display = 'none';
     btnLogout.style.display = 'none';
     stopPendingCountPolling();
     if (notificationsBadge) notificationsBadge.style.display = 'none';
     if (btnNotificationsBell) btnNotificationsBell.style.display = 'none';

     // Clear any previously entered credentials so the login form starts fresh
     // (e.g. after logout) and doesn't retain the password/username.
     loginPasswordInput.value = '';
     loginUsernameInput.value = '';
     loginUsernameInput.classList.remove('is-invalid');
     loginPasswordInput.classList.remove('is-invalid');
     loginUsernameError.classList.remove('visible');
     loginPasswordError.classList.remove('visible');
     loginAlert.classList.remove('visible');
     loginAlert.textContent = '';
   }

   function showDashboardView() {
     adminLoginView.style.display = 'none';
     adminDashboardView.style.display = 'block';
     adminRequestsView.style.display = 'none';
     btnLogout.style.display = 'inline-flex';
     if (currentAdminRole === 'superadmin') {
       btnOpenRequestsView.style.display = 'inline-flex';
       btnNotificationsBell.style.display = 'inline-flex';
     } else {
       btnOpenRequestsView.style.display = 'none';
       btnNotificationsBell.style.display = 'none';
     }
   }

  // Handle Login Submission
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    let hasError = false;
    if (!username) {
      loginUsernameInput.classList.add('is-invalid');
      loginUsernameError.classList.add('visible');
      hasError = true;
    } else {
      loginUsernameInput.classList.remove('is-invalid');
      loginUsernameError.classList.remove('visible');
    }

    if (!password) {
      loginPasswordInput.classList.add('is-invalid');
      loginPasswordError.classList.add('visible');
      hasError = true;
    } else {
      loginPasswordInput.classList.remove('is-invalid');
      loginPasswordError.classList.remove('visible');
    }

    if (hasError) return;

    loginAlert.classList.remove('visible');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
       if (!res.ok) {
         if (data.error === 'pending approval') {
           loginAlert.textContent = data.message || 'Your admin account is pending approval.';
         } else if (data.error === 'Account rejected') {
           loginAlert.textContent = data.message || 'Your admin access has been rejected.';
         } else {
           loginAlert.textContent = data.error || 'Authentication failed. Please verify credentials.';
         }
         loginAlert.classList.add('visible');
         return;
       }

       authToken = data.token;
       currentAdminRole = data.admin.role;
       localStorage.setItem('notari_admin_token', authToken);
       localStorage.setItem('notari_admin_role', currentAdminRole);
        showToast('Signed in successfully.');
        showDashboardView();
        loadAdminEvents();
        handlePostAuthNavigation();
        startPendingCountPolling();
      } catch (err) {
      console.error(err);
      loginAlert.textContent = 'Server connection error. Please retry.';
      loginAlert.classList.add('visible');
    }
  });

   btnLogout.addEventListener('click', () => {
     localStorage.removeItem('notari_admin_token');
     localStorage.removeItem('notari_admin_role');
     authToken = null;
     currentAdminRole = null;
     stopPendingCountPolling();
     showToast('Signed out of Back Office.');
     showLoginView();
   });

   // ----------------------------------------------------
   // 2b. Signup / Request Admin Access Flow
   // ----------------------------------------------------
   btnRequestAdminAccess.addEventListener('click', (e) => {
     e.preventDefault();
     openSignupModal();
   });

    function openSignupModal() {
      adminSignupForm.reset();
      signupErrorFeedback.classList.remove('visible');
      signupUsernameInput.classList.remove('is-invalid');
      signupEmailInput.classList.remove('is-invalid');
      signupIdentificationInput.classList.remove('is-invalid');
      signupPasswordInput.classList.remove('is-invalid');
      signupUsernameError.classList.remove('visible');
      signupEmailError.classList.remove('visible');
      signupIdentificationError.classList.remove('visible');
      signupPasswordError.classList.remove('visible');
      signupModal.classList.add('active');
      signupUsernameInput.focus();
    }

   function closeSignupModal() {
     signupModal.classList.remove('active');
   }

   btnCloseSignupModal.addEventListener('click', closeSignupModal);
   btnCancelSignup.addEventListener('click', closeSignupModal);

   signupModal.addEventListener('click', (e) => {
     if (e.target === signupModal) closeSignupModal();
   });

   document.addEventListener('keydown', (e) => {
     if (e.key === 'Escape') {
       if (signupModal.classList.contains('active')) closeSignupModal();
       if (attendeesModal.classList.contains('active')) {
         attendeesModal.classList.remove('active');
       }
     }
   });

    adminSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = signupUsernameInput.value.trim();
      const email = signupEmailInput.value.trim();
      const clubName = signupClubInput.value.trim();
      const password = signupPasswordInput.value;
      const identificationFile = signupIdentificationInput.files[0];

      let hasError = false;

      if (!username) {
        signupUsernameInput.classList.add('is-invalid');
        signupUsernameError.classList.add('visible');
        hasError = true;
      } else {
        signupUsernameInput.classList.remove('is-invalid');
        signupUsernameError.classList.remove('visible');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        signupEmailInput.classList.add('is-invalid');
        signupEmailError.classList.add('visible');
        hasError = true;
      } else {
        signupEmailInput.classList.remove('is-invalid');
        signupEmailError.classList.remove('visible');
      }

      if (!identificationFile) {
        signupIdentificationInput.classList.add('is-invalid');
        signupIdentificationError.classList.add('visible');
        hasError = true;
      } else {
        signupIdentificationInput.classList.remove('is-invalid');
        signupIdentificationError.classList.remove('visible');
      }

      if (!password || password.length < 6) {
        signupPasswordInput.classList.add('is-invalid');
        signupPasswordError.classList.add('visible');
        hasError = true;
      } else {
        signupPasswordInput.classList.remove('is-invalid');
        signupPasswordError.classList.remove('visible');
      }

      if (hasError) return;

      signupErrorFeedback.classList.remove('visible');
      signupErrorFeedback.textContent = '';

      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('clubName', clubName);
      formData.append('password', password);
      formData.append('identification', identificationFile);

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (!res.ok) {
          signupErrorFeedback.textContent = data.error || 'Signup failed. Please retry.';
          signupErrorFeedback.classList.add('visible');
          return;
        }

        showToast('Admin access request submitted! Awaiting superadmin approval.');
        closeSignupModal();
      } catch (err) {
        console.error(err);
        signupErrorFeedback.textContent = 'Server connection error. Please retry.';
        signupErrorFeedback.classList.add('visible');
      }
    });

   // ----------------------------------------------------
   // 2c. Superadmin: Pending Access Requests Dashboard
   // ----------------------------------------------------
    btnOpenRequestsView.addEventListener('click', () => {
      showRequestsView();
      loadPendingRequests();
    });

    btnNotificationsBell.addEventListener('click', () => {
      showRequestsView();
      loadPendingRequests();
    });

   btnBackToDashboard.addEventListener('click', () => {
     adminRequestsView.style.display = 'none';
     adminDashboardView.style.display = 'block';
   });

    async function loadPendingRequests() {
      try {
        const res = await fetch('/api/admin/pending-requests', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load pending requests');
        }

        const data = await res.json();
        const requests = data.requests || [];
        renderPendingRequests(requests);
      } catch (err) {
        console.error(err);
        pendingRequestsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: var(--ink-muted);">
              ${escapeHtml(err.message || 'Error loading requests.')}
            </td>
          </tr>
        `;
      }
    }

    function showRequestsView() {
      adminDashboardView.style.display = 'none';
      adminRequestsView.style.display = 'block';
    }

    // Poll the pending-request count and render the notification bell badge.
    async function updatePendingCount() {
      if (currentAdminRole !== 'superadmin' || !authToken) return;
      try {
        const res = await fetch('/api/admin-requests/count', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = Number(data.pending) || 0;
        if (notificationsBadge) {
          if (count > 0) {
            notificationsBadge.textContent = String(count);
            notificationsBadge.style.display = 'inline-flex';
          } else {
            notificationsBadge.style.display = 'none';
          }
        }
      } catch (err) {
        console.error('[Notifications] Failed to fetch pending request count:', err);
      }
    }

    function startPendingCountPolling() {
      if (currentAdminRole !== 'superadmin') return;
      stopPendingCountPolling();
      updatePendingCount();
      pendingCountTimer = setInterval(updatePendingCount, 45000);
    }

    function stopPendingCountPolling() {
      if (pendingCountTimer) {
        clearInterval(pendingCountTimer);
        pendingCountTimer = null;
      }
    }

    window.addEventListener('beforeunload', stopPendingCountPolling);

    // Honor a deep-link intent (query param from the superadmin signup-notification
    // email, or a #admin-requests-view hash) once the session is confirmed.
    // The email link uses ?redirect=requests so the superadmin must still log in
    // with their password; only after a successful auth do we land on Access Requests.
    function handlePostAuthNavigation() {
      if (currentAdminRole !== 'superadmin') return;

      const params = new URLSearchParams(window.location.search);
      const wantsRequests =
        params.get('redirect') === 'requests' ||
        window.location.hash === '#admin-requests-view';
      if (!wantsRequests) return;

      if (params.get('redirect') === 'requests') {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      showRequestsView();
      loadPendingRequests();
    }

    function onHashChange() {
      if (window.location.hash === '#admin-requests-view' && currentAdminRole === 'superadmin') {
        showRequestsView();
        loadPendingRequests();
      }
    }

    window.addEventListener('hashchange', onHashChange);


     function renderPendingRequests(requests) {
       if (requests.length === 0) {
         pendingRequestsTbody.innerHTML = `
           <tr>
             <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--ink-muted);">
               No pending access requests at this time.
             </td>
           </tr>
         `;
         return;
       }

       pendingRequestsTbody.innerHTML = requests.map(req => {
         const requestedDate = new Date(req.createdAt).toLocaleDateString('en-US', {
           month: 'short',
           day: 'numeric',
           year: 'numeric'
         });

          const identificationUrl = req.identificationUrl || '';
          const normalizedIdUrl = identificationUrl
            ? identificationUrl.startsWith('/api/uploads/') || identificationUrl.startsWith('/uploads/')
              ? identificationUrl
              : `/api/uploads/identification/${identificationUrl.replace(/^\/+/, '')}`
            : '';
          const absoluteIdUrl = normalizedIdUrl ? `${window.location.origin}${normalizedIdUrl}` : '';
         const identificationHtml = absoluteIdUrl
           ? `<a href="${escapeHtml(absoluteIdUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(absoluteIdUrl)}" alt="Identification" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--line); cursor: pointer;" title="Click to view full-size"></a>`
           : escapeHtml('—');

         return `
           <tr data-id="${req._id}">
             <td><strong>${escapeHtml(req.username)}</strong></td>
             <td>${escapeHtml(req.clubName || '—')}</td>
             <td>${escapeHtml(req.email)}</td>
             <td>${identificationHtml}</td>
             <td>${requestedDate}</td>
             <td style="text-align: right;">
               <div class="table-actions" style="justify-content: flex-end;">
                 <button class="btn btn-outline btn-approve" data-id="${req._id}" style="min-height: 32px; padding: 0.25rem 0.6rem; font-size: 0.8rem;">
                   Approve
                 </button>
                 <button class="btn btn-danger btn-reject" data-id="${req._id}" style="min-height: 32px; padding: 0.25rem 0.6rem; font-size: 0.8rem;">
                   Reject
                 </button>
               </div>
             </td>
           </tr>
         `;
       }).join('');

       document.querySelectorAll('.btn-approve').forEach(btn => {
         btn.addEventListener('click', () => {
           const id = btn.getAttribute('data-id');
           approveRequest(id);
         });
       });

       document.querySelectorAll('.btn-reject').forEach(btn => {
         btn.addEventListener('click', () => {
           const id = btn.getAttribute('data-id');
           rejectRequest(id);
         });
       });
     }

   async function approveRequest(requestId) {
     try {
       const res = await fetch(`/api/admin/requests/${requestId}/approve`, {
         method: 'PATCH',
         headers: { 'Authorization': `Bearer ${authToken}` }
       });

       const data = await res.json();
       if (!res.ok) {
         showToast(data.error || 'Failed to approve request.');
         return;
       }

        showToast(`Approved access for "${data.admin.username}".`);
        loadPendingRequests();
        loadAdminEvents();
        updatePendingCount();
      } catch (err) {
       console.error(err);
       showToast('Network error approving request.');
     }
   }

   async function rejectRequest(requestId) {
     if (!confirm('Reject this admin access request? The user will not be able to log in.')) return;

     try {
       const res = await fetch(`/api/admin/requests/${requestId}/reject`, {
         method: 'PATCH',
         headers: { 'Authorization': `Bearer ${authToken}` }
       });

       const data = await res.json();
       if (!res.ok) {
         showToast(data.error || 'Failed to reject request.');
         return;
       }

        showToast(`Rejected access for "${data.admin.username}".`);
        loadPendingRequests();
        loadAdminEvents();
        updatePendingCount();
      } catch (err) {
       console.error(err);
       showToast('Network error rejecting request.');
     }
   }

   // ----------------------------------------------------
   // 3. Load & Render Events Management Table
  // ----------------------------------------------------
    async function loadAdminEvents() {
      try {
        const res = await fetch('/api/events/mine', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch events');
       const data = await res.json();
       loadedEvents = data.events || [];

       renderStats(loadedEvents);
       renderTable(loadedEvents);
     } catch (err) {
       console.error(err);
       showToast('Error loading events list.');
     }
   }

  function renderStats(events) {
    statTotalEvents.textContent = events.length;
    let totalAttendees = 0;
    let totalWaitlist = 0;

    events.forEach(e => {
      totalAttendees += (e.attendees ? e.attendees.length : 0);
      totalWaitlist += (e.waitlist ? e.waitlist.length : 0);
    });

    statTotalAttendees.textContent = totalAttendees;
    statTotalWaitlist.textContent = totalWaitlist;
  }

  function renderTable(events) {
    if (events.length === 0) {
      adminEventsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--ink-muted);">
            No events pinned to the board. Click <strong>Pin New Event</strong> above to create your first notice.
          </td>
        </tr>
      `;
      return;
    }

    adminEventsTbody.innerHTML = events.map(event => {
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      const attendeesCount = event.attendees ? event.attendees.length : 0;
      const waitlistCount = event.waitlist ? event.waitlist.length : 0;
      const capacity = event.capacity || 0;
      const capacityText = capacity === 0 ? 'Unlimited' : `${capacity} seats`;

      return `
        <tr data-id="${event._id}">
          <td><strong>${escapeHtml(event.eventName)}</strong></td>
          <td><span class="card-tag">${escapeHtml(event.faculty || 'General')}</span></td>
          <td>${escapeHtml(event.organizer)}</td>
          <td>${eventDate}</td>
          <td>${escapeHtml(event.venue)}</td>
          <td>${capacityText}</td>
          <td>
            <button class="btn btn-outline btn-view-attendees" data-id="${event._id}" style="min-height: 32px; padding: 0.25rem 0.6rem; font-size: 0.8rem;">
              ${attendeesCount} Booked ${waitlistCount > 0 ? `(${waitlistCount} WL)` : ''}
            </button>
          </td>
          <td>
            <div class="table-actions" style="justify-content: flex-end;">
              <button class="btn btn-outline btn-edit-event" data-id="${event._id}" title="Edit Notice" style="min-height: 36px; padding: 0.35rem 0.6rem;">
                Edit
              </button>
              <button class="btn btn-danger btn-delete-event" data-id="${event._id}" title="Delete Notice" style="min-height: 36px; padding: 0.35rem 0.6rem;">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row action listeners
    document.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        confirmDeleteEvent(id);
      });
    });

    document.querySelectorAll('.btn-view-attendees').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openAttendeesModal(id);
      });
    });
  }

  // ----------------------------------------------------
  // 4. Create / Edit Event Flow
  // ----------------------------------------------------
   function openCreateModal() {
     editEventId.value = '';
     formModalTitle.textContent = 'Pin Event to Board';
     formModalEyebrow.textContent = 'NEW NOTICE';
     formErrorFeedback.classList.remove('visible');

     // Reset fields
     evName.value = '';
     evOrganizer.value = '';
     evFaculty.value = 'General';
     evVenue.value = '';
     evCapacity.value = '0';
     evContact.value = '';
     evDescription.value = '';
     evFlyer.value = '';
     evFlyerError.classList.remove('visible');

     // Set default date to tomorrow at 18:00
     const tomorrow = new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
     tomorrow.setHours(18, 0, 0, 0);
     evDate.value = formatDateForInput(tomorrow);

     eventFormModal.classList.add('active');
     evName.focus();
   }

   function openEditModal(eventId) {
     const event = loadedEvents.find(e => e._id === eventId);
     if (!event) return;

     editEventId.value = event._id;
     formModalTitle.textContent = 'Edit Event Notice';
     formModalEyebrow.textContent = 'UPDATE NOTICE';
     formErrorFeedback.classList.remove('visible');

     evName.value = event.eventName || '';
     evOrganizer.value = event.organizer || '';
     evFaculty.value = event.faculty || 'General';
     evDate.value = formatDateForInput(new Date(event.date));
     evVenue.value = event.venue || '';
     evCapacity.value = event.capacity !== undefined ? event.capacity : 0;
     evContact.value = event.contact || '';
     evDescription.value = event.description || '';
     evFlyer.value = '';
     evFlyerError.classList.remove('visible');

     eventFormModal.classList.add('active');
     evName.focus();
   }

  function closeFormModal() {
    eventFormModal.classList.remove('active');
  }

  btnOpenCreateModal.addEventListener('click', openCreateModal);
  btnCloseFormModal.addEventListener('click', closeFormModal);
  btnCancelForm.addEventListener('click', closeFormModal);

   eventEditorForm.addEventListener('submit', async (e) => {
     e.preventDefault();
     const id = editEventId.value;
     const isEdit = Boolean(id);

     const eventName = evName.value.trim();
     const organizer = evOrganizer.value.trim();
     const faculty = evFaculty.value;
     const date = evDate.value;
     const venue = evVenue.value.trim();
     const capacity = parseInt(evCapacity.value || '0', 10);
     const contact = evContact.value.trim();
     const description = evDescription.value.trim();
     const flyerFile = evFlyer.files[0];

     let hasError = false;
     if (!eventName) {
       evName.classList.add('is-invalid');
       document.getElementById('ev-name-error').classList.add('visible');
       hasError = true;
     } else {
       evName.classList.remove('is-invalid');
       document.getElementById('ev-name-error').classList.remove('visible');
     }

     if (!organizer) {
       evOrganizer.classList.add('is-invalid');
       document.getElementById('ev-organizer-error').classList.add('visible');
       hasError = true;
     } else {
       evOrganizer.classList.remove('is-invalid');
       document.getElementById('ev-organizer-error').classList.remove('visible');
     }

     if (!date) {
       evDate.classList.add('is-invalid');
       document.getElementById('ev-date-error').classList.add('visible');
       hasError = true;
     } else {
       evDate.classList.remove('is-invalid');
       document.getElementById('ev-date-error').classList.remove('visible');
     }

     if (!venue) {
       evVenue.classList.add('is-invalid');
       document.getElementById('ev-venue-error').classList.add('visible');
       hasError = true;
     } else {
       evVenue.classList.remove('is-invalid');
       document.getElementById('ev-venue-error').classList.remove('visible');
     }

     if (!isEdit && !flyerFile) {
       evFlyer.classList.add('is-invalid');
       evFlyerError.classList.add('visible');
       hasError = true;
     } else {
       evFlyer.classList.remove('is-invalid');
       evFlyerError.classList.remove('visible');
     }

     if (hasError) return;

     const formData = new FormData();
     formData.append('eventName', eventName);
     formData.append('organizer', organizer);
     formData.append('faculty', faculty);
     formData.append('date', new Date(date).toISOString());
     formData.append('venue', venue);
     formData.append('capacity', isNaN(capacity) ? 0 : Math.max(0, capacity));
     formData.append('contact', contact);
     formData.append('description', description);
     if (flyerFile) {
       formData.append('flyer', flyerFile);
     }

     const url = isEdit ? `/api/events/${id}` : '/api/events';
     const method = isEdit ? 'PUT' : 'POST';

     try {
       const res = await fetch(url, {
         method,
         headers: {
           'Authorization': `Bearer ${authToken}`
         },
         body: formData
       });

       const data = await res.json();
       if (!res.ok) {
         formErrorFeedback.textContent = data.error || 'Failed to save event.';
         formErrorFeedback.classList.add('visible');
         return;
       }

       showToast(isEdit ? 'Event notice updated.' : 'New event pinned to notice board.');
       closeFormModal();
       loadAdminEvents();
     } catch (err) {
       console.error(err);
       formErrorFeedback.textContent = 'Server error. Please retry.';
       formErrorFeedback.classList.add('visible');
     }
   });

  // ----------------------------------------------------
  // 5. Delete Event Flow
  // ----------------------------------------------------
  async function confirmDeleteEvent(eventId) {
    const event = loadedEvents.find(e => e._id === eventId);
    const eventTitle = event ? event.eventName : 'this event';

    if (!confirm(`Are you sure you want to unpin and remove "${eventTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to delete event.');
        return;
      }

      showToast('Event removed from notice board.');
      loadAdminEvents();
    } catch (err) {
      console.error(err);
      showToast('Network error deleting event.');
    }
  }

  // ----------------------------------------------------
  // 6. Attendee Roster Modal & CSV Export
  // ----------------------------------------------------
  async function openAttendeesModal(eventId) {
    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error('Failed to retrieve attendees roster');
      const data = await res.json();
      currentEventRoster = data;

      attendeesModalTitle.textContent = data.eventName;
      attendeeCountBadge.textContent = `${data.attendees.length} Confirmed ${data.capacity > 0 ? `(of ${data.capacity} max)` : ''}`;

      if (data.attendees.length === 0) {
        attendeesTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--ink-muted); padding: 1.5rem;">
              No students have reserved passes for this event yet.
            </td>
          </tr>
        `;
      } else {
        attendeesTableBody.innerHTML = data.attendees.map(a => `
          <tr>
            <td><code>${escapeHtml(a.ticketCode || 'N/A')}</code></td>
            <td><strong>${escapeHtml(a.name)}</strong></td>
            <td>${escapeHtml(a.email)}</td>
            <td>${new Date(a.bookedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        `).join('');
      }

      // Waitlist
      if (data.waitlist && data.waitlist.length > 0) {
        waitlistSection.style.display = 'block';
        waitlistTableBody.innerHTML = data.waitlist.map((w, idx) => `
          <tr>
            <td>#${idx + 1}</td>
            <td><strong>${escapeHtml(w.name)}</strong></td>
            <td>${escapeHtml(w.email)}</td>
            <td>${new Date(w.joinedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
        `).join('');
      } else {
        waitlistSection.style.display = 'none';
      }

      attendeesModal.classList.add('active');
    } catch (err) {
      console.error(err);
      showToast('Could not load guest list.');
    }
  }

  btnCloseAttendeesModal.addEventListener('click', () => {
    attendeesModal.classList.remove('active');
  });

  btnExportCsv.addEventListener('click', () => {
    if (!currentEventRoster || !currentEventRoster.attendees) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Ticket Code,Name,Email,Booked At\n';

    currentEventRoster.attendees.forEach(a => {
      const row = [
        `"${a.ticketCode || ''}"`,
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${(a.email || '').replace(/"/g, '""')}"`,
        `"${new Date(a.bookedAt).toISOString()}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const sanitizedTitle = (currentEventRoster.eventName || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `attendees_${sanitizedTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  function formatDateForInput(date) {
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

   // ----------------------------------------------------
   // 0. Password Visibility Toggle
   // ----------------------------------------------------
   function initPasswordToggles() {
     document.querySelectorAll('.password-toggle').forEach(btn => {
       const input = document.getElementById(btn.getAttribute('data-target'));
       if (!input) return;
       const showIcon = btn.querySelector('.pw-icon-show');
       const hideIcon = btn.querySelector('.pw-icon-hide');

       function setRevealed(revealed) {
         input.type = revealed ? 'text' : 'password';
         if (showIcon) showIcon.style.display = revealed ? 'none' : 'inline-flex';
         if (hideIcon) hideIcon.style.display = revealed ? 'inline-flex' : 'none';
         btn.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
         btn.setAttribute('title', revealed ? 'Hide password' : 'Show password');
       }

        btn.addEventListener('click', () => {
          const isCurrentlyHidden = input.type === 'password';
          setRevealed(isCurrentlyHidden);
        });
     });
   }

   // Initialize
   initTheme();
   initPasswordToggles();
   checkAuthSession();
});
