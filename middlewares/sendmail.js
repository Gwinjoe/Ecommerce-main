// emailSender.js
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Render placeholders like {{name}} with values in `data`.
 * Allowed placeholder keys: [a-zA-Z0-9_]+
 * If a key is missing, we fall back to defaults.
 */
function renderTemplateString(templateString, data = {}) {
  const defaults = {
    name: 'User',
    store_name: 'swisstools',
    year: new Date().getFullYear(),
    order_id: '',
    password: '',
    code: '',
    order_total: '',
    order_items: '',
    order_link: '',
    login_link: '',
    verification_link: '',
    expiry_minutes: '10',
    profileImage: '',
  };

  // Merge data over defaults
  const merged = Object.assign({}, defaults, data || {});

  return templateString.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    // Avoid injecting undefined
    const v = merged[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Load template by filename from templates directory.
 * templateName should be the file base name (e.g. 'welcome' or 'order-confirmation')
 * or full filename like 'welcome.html'
 */
function loadTemplate(templateFile) {
  const fileName = templateFile.endsWith('.html') ? templateFile : `${templateFile}.html`;
  const full = path.join(TEMPLATES_DIR, fileName);
  if (!fs.existsSync(full)) {
    throw new Error(`Email template not found: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

/**
 * Create nodemailer transporter using env vars.
 * Env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true|false),
 *   SMTP_USER, SMTP_PASS
 *   EMAIL_FROM (optional; defaults to support@swisstools.store)
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (port === 465);

  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'support@swisstools.store';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!pass) {
    console.warn('Warning: SMTP_PASS not set. Make sure you configure SMTP credentials in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Main send function
 * options: { to, subject, template, data }
 *   template: 'welcome' | 'order-confirmation' | 'guest-welcome' | 'forgot-password'  (without .html)
 */
async function sendMail({ to, subject, template, data = {} }) {
  if (!to) throw new Error('Recipient (to) is required');

  const transporter = createTransporter();

  // load template file
  let tpl;
  try {
    tpl = loadTemplate(template);
  } catch (err) {
    throw err;
  }

  const html = renderTemplateString(tpl, data);

  const fromAddress = process.env.EMAIL_FROM || (process.env.SMTP_USER || 'support@swisstools.store');
  const fromName = process.env.EMAIL_FROM_NAME || 'SWISStools';

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject: subject || `${data.subject || 'Message from ' + (data.store_name || 'swisstools')}`,
    html,
    attachments: [
      {
        filename: "swisstools_logo.png",
        path: "../frontend/assets/images/swisstools_logo.png",
        cid: "logo.png", // same cid value as in the html img src
      },
    ],
  };

  // Optionally verify transporter before sending (uncomment in prod if you want verify)
  // await transporter.verify();

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendMail, renderTemplateString, loadTemplate };

