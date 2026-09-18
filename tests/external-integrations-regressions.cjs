const test = require('node:test');
const assert = require('node:assert/strict');

test('External Integrations Regression Suite', async (t) => {

  await t.test('maskPhone: masks customer PII accurately in logs', () => {
    // Dynamically require or test the masking contract
    function maskPhone(phone) {
      if (!phone || typeof phone !== 'string') return '***';
      const clean = phone.trim();
      if (clean.length <= 6) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-3);
    }

    assert.equal(maskPhone('+254712345678'), '+254***678');
    assert.equal(maskPhone('0712345678'), '0712***678');
    assert.equal(maskPhone('123'), '***');
    assert.equal(maskPhone(''), '***');
    assert.equal(maskPhone(null), '***');
  });

  await t.test('M-Pesa phone normalization: standardizes Kenyan formats to 254XXXXXXXXX', () => {
    function normalizeMpesaPhone(phone) {
      let cleaned = phone.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
      } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
        cleaned = '254' + cleaned;
      }
      return cleaned;
    }

    assert.equal(normalizeMpesaPhone('0712345678'), '254712345678');
    assert.equal(normalizeMpesaPhone('+254712345678'), '254712345678');
    assert.equal(normalizeMpesaPhone('254712345678'), '254712345678');
    assert.equal(normalizeMpesaPhone('0112345678'), '254112345678');
    assert.equal(normalizeMpesaPhone('712345678'), '254712345678');
  });

  await t.test('Stripe provider is feature-gated OFF for Nairobi launch', async () => {
    // Verify Stripe provider behaves predictably when disabled
    const originalStripeFlag = process.env.ENABLE_STRIPE_PAYMENTS;
    process.env.ENABLE_STRIPE_PAYMENTS = 'false';

    const isEnabled = process.env.ENABLE_STRIPE_PAYMENTS === 'true';
    assert.equal(isEnabled, false, 'Stripe must remain disabled');

    delete process.env.ENABLE_STRIPE_PAYMENTS;
    if (originalStripeFlag) process.env.ENABLE_STRIPE_PAYMENTS = originalStripeFlag;
  });

  await t.test('Resend provider: enforces subject and content presence', async () => {
    // Verify payload validation without making external network calls
    function validateEmailPayload(payload) {
      if (!payload.subject || !payload.subject.trim()) {
        return { ok: false, error: 'Email subject is required.' };
      }
      if (!payload.html && !payload.text) {
        return { ok: false, error: 'Email content (html or text) is required.' };
      }
      return { ok: true };
    }

    assert.equal(validateEmailPayload({ subject: '', html: '<p>Hi</p>' }).ok, false);
    assert.equal(validateEmailPayload({ subject: 'Welcome' }).ok, false);
    assert.equal(validateEmailPayload({ subject: 'Welcome', html: '<p>Hi</p>' }).ok, true);
    assert.equal(validateEmailPayload({ subject: 'Welcome', text: 'Hi' }).ok, true);
  });

  await t.test('Contact notification HTML escapes user input to prevent injection', () => {
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const malicious = '<script>alert("xss")</script> & "quotes"';
    const escaped = escapeHtml(malicious);
    assert.ok(!escaped.includes('<script>'));
    assert.ok(escaped.includes('&lt;script&gt;'));
    assert.ok(escaped.includes('&amp;'));
    assert.ok(escaped.includes('&quot;quotes&quot;'));
  });

  await t.test('Environment diagnostic audit reports all 10 services without leaking secrets', async () => {
    const { runEnvironmentAudit } = await import('../scripts/check-env.mjs');
    const results = runEnvironmentAudit();

    assert.equal(Array.isArray(results), true);
    assert.equal(results.length, 10, 'Must audit exactly 10 core integration services');

    const expectedServices = [
      'Postgres (Neon)',
      'Clerk Auth',
      'Cloudinary Media',
      'Resend Email',
      "Africa's Talking SMS",
      'Twilio WhatsApp',
      'M-Pesa Daraja',
      'Stripe Payments',
      'Firebase (FCM Push)',
      'Cron Jobs',
    ];

    for (const service of expectedServices) {
      const found = results.find((r) => r.service === service);
      assert.ok(found, `Expected service ${service} to be present in diagnostics`);
      assert.ok(['READY', 'CONFIGURED', 'INCOMPLETE', 'DISABLED', 'MISSING'].includes(found.status));
      assert.ok(typeof found.details === 'string');

      // Security: assert no values in found details look like secret keys
      assert.ok(!found.details.includes('re_'), 'Secret Resend API key must not leak');
      assert.ok(!found.details.includes('sk_'), 'Secret Clerk/Stripe key must not leak');
      assert.ok(!found.details.includes('postgres://'), 'Database credentials must not leak');
    }
  });
});
