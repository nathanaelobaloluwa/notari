const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Generate an Ethereal test account or use JSON transport
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Mailer] Initialized Ethereal test mailer (User: ${testAccount.user})`);
    } catch (err) {
      console.warn('[Mailer] Could not create Ethereal account, falling back to console logger transport');
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  return transporter;
}

async function sendTicketConfirmation({ attendeeEmail, attendeeName, event, ticketCode }) {
  try {
    const transport = await getTransporter();
    
    const formattedDate = new Date(event.date).toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #F7F3EC; color: #241F1A; margin: 0; padding: 24px; }
        .ticket-wrapper { max-width: 520px; margin: 0 auto; background-color: #FFFDF8; border: 1px solid #D8CFC0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(36,31,26,0.08); }
        .ticket-header { background-color: #1F4D3A; color: #FFFDF8; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
        .ticket-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .ticket-body { padding: 24px; }
        .event-title { font-size: 22px; font-weight: 700; color: #241F1A; margin-top: 0; margin-bottom: 16px; }
        .meta-row { margin-bottom: 12px; font-size: 14px; color: #4A443E; }
        .meta-label { font-family: 'Courier New', monospace; text-transform: uppercase; font-size: 11px; color: #736B63; letter-spacing: 0.5px; }
        .meta-val { font-weight: 600; color: #241F1A; }
        .divider { border-top: 2px dashed #D8CFC0; margin: 20px 0; }
        .code-box { background-color: #F7F3EC; border: 1px solid #D8CFC0; border-radius: 6px; padding: 12px; text-align: center; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px; color: #C8622A; }
        .ticket-footer { background-color: #F7F3EC; padding: 14px 24px; font-size: 12px; color: #736B63; text-align: center; border-top: 1px solid #D8CFC0; }
      </style>
    </head>
    <body>
      <div class="ticket-wrapper">
        <div class="ticket-header">
          <div class="ticket-brand">NOTARI • CAMPUS PASS</div>
        </div>
        <div class="ticket-body">
          <div class="meta-label">CONFIRMED SEAT RESERVATION</div>
          <h1 class="event-title">${event.eventName}</h1>
          
          <div class="meta-row">
            <div class="meta-label">ATTENDEE</div>
            <div class="meta-val">${attendeeName} (${attendeeEmail})</div>
          </div>
          
          <div class="meta-row">
            <div class="meta-label">DATE & TIME</div>
            <div class="meta-val">${formattedDate}</div>
          </div>
          
          <div class="meta-row">
            <div class="meta-label">VENUE</div>
            <div class="meta-val">${event.venue}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">ORGANIZER & FACULTY</div>
            <div class="meta-val">${event.organizer} (${event.faculty || 'General'})</div>
          </div>

          <div class="divider"></div>

          <div class="meta-label" style="text-align: center; margin-bottom: 6px;">TICKET CODE</div>
          <div class="code-box">${ticketCode}</div>
        </div>
        <div class="ticket-footer">
          Show this email or ticket code at the entrance. Need help? Contact ${event.contact || 'the organizer'}.
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"NOTARI Campus Events" <notices@notari.campus.edu>',
      to: attendeeEmail,
      subject: `Your Pass: ${event.eventName} [${ticketCode}]`,
      text: `You're in for ${event.eventName}!\nDate: ${formattedDate}\nVenue: ${event.venue}\nTicket Code: ${ticketCode}`,
      html: htmlContent
    });

    let previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Confirmation email sent! Preview URL: ${previewUrl}`);
    } else {
      console.log(`[Mailer] Confirmation email sent to ${attendeeEmail}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('[Mailer] Failed to send email confirmation:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendAdminAccessRequestNotification({ applicantUsername, applicantEmail, clubName }) {
  try {
    const transport = await getTransporter();
    const superadminEmail = process.env.ADMIN_EMAIL;

    if (!superadminEmail) {
      console.warn('[Mailer] ADMIN_EMAIL not configured; skipping superadmin notification.');
      return { success: false, error: 'ADMIN_EMAIL not configured' };
    }

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const accessRequestsUrl = `${appUrl}/admin.html?redirect=requests`;

    const subject = `New admin access request — ${clubName || 'Unknown Club'}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #F7F3EC; color: #241F1A; margin: 0; padding: 24px; }
        .wrapper { max-width: 560px; margin: 0 auto; background-color: #FFFDF8; border: 1px solid #D8CFC0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(36,31,26,0.08); }
        .header { background-color: #1F4D3A; color: #FFFDF8; padding: 24px; }
        .header h1 { font-family: 'Archivo', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 800; margin: 0; }
        .body { padding: 24px; }
        .body p { margin: 0 0 12px 0; line-height: 1.5; color: #4A443E; font-size: 14px; }
        .body .val { color: #241F1A; font-weight: 600; }
        .cta { text-align: center; margin: 28px 0; }
        .cta a { display: inline-block; background-color: #C8622A; color: #FFFDF8; text-decoration: none; font-weight: 600; padding: 0.85rem 1.5rem; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px; }
        .cta a:hover { filter: brightness(1.08); }
        .footer { background-color: #F7F3EC; color: #736B63; font-size: 12px; padding: 16px 24px; text-align: center; font-family: 'IBM Plex Mono', ui-monospace, monospace; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>New Admin Access Request</h1>
        </div>
        <div class="body">
          <p>A new club executive has submitted a request for admin access on NOTARI.</p>
          <p><span class="val">Applicant:</span> ${applicantUsername}</p>
          <p><span class="val">Email:</span> ${applicantEmail}</p>
          <p><span class="val">Club / Organization:</span> ${clubName || 'N/A'}</p>
          <p>Their identification image is available for review in the Access Requests dashboard, behind authenticated superadmin login.</p>
          <div class="cta">
            <a href="${accessRequestsUrl}">Review Access Requests</a>
          </div>
        </div>
        <div class="footer">
          NOTARI • Campus Event Notice Board
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `A new admin access request has been submitted.

Applicant: ${applicantUsername}
Email: ${applicantEmail}
Club: ${clubName || 'N/A'}

Please log in to the NOTARI admin dashboard and review this request in the Access Requests section.

Access Requests: ${accessRequestsUrl}`;

    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"NOTARI Campus Events" <notices@notari.campus.edu>',
      to: superadminEmail,
      subject,
      text,
      html: htmlContent
    });

    let previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer] Admin access request notification sent! Preview URL: ${previewUrl}`);
    } else {
      console.log(`[Mailer] Admin access request notification sent to ${superadminEmail}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('[Mailer] Failed to send admin access request notification:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendTicketConfirmation, sendAdminAccessRequestNotification };
