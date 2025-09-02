// example-send.js
const { sendMail } = require('./sendmail');

async function test() {
  try {
    // 1. Welcome
    await sendMail({
      to: 'gwintrade820@gmail.com',
      subject: 'Welcome to SWISStools',
      template: 'welcome',
      data: { name: 'Joseph', verification_link: 'https://swisstools.store/verify/abc123' }
    });

    // 2. Order confirmation
    await sendMail({
      to: 'gwintrade820@gmail.com',
      subject: 'Your order is received',
      template: 'order-confirmation',
      data: {
        name: 'Joseph',
        order_id: 'ST-12345',
        order_total: '$89.99',
        order_items: '<ul><li>Hand tool set x1</li><li>Electric drill x1</li></ul>',
        order_link: 'https://swisstools.store/orders/ST-12345'
      }
    });

    // 3. Guest welcome (password)
    await sendMail({
      to: 'gwintrade820@gmail.com',
      subject: 'Account created for you',
      template: 'guest-welcome',
      data: { name: 'Guest', password: 'pAs$w0rd123', login_link: 'https://swisstools.store/login' }
    });

    // 4. Forgot password
    await sendMail({
      to: 'gwintrade820@gmail.com',
      subject: 'Reset code',
      template: 'forgot-password',
      data: { name: 'Joseph', code: '726140', expiry_minutes: 15 }
    });

    console.log('All test emails queued/sent (check transporter info).');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

test();

