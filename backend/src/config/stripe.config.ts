import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,

  plans: {
    free: {
      priceId: process.env.STRIPE_PRICE_FREE,
      name: 'Free',
      price: 0,
      features: ['Basic clinical calculators', '10 AI queries/day', 'Core drug database'],
    },
    professional: {
      priceId: process.env.STRIPE_PRICE_PRO,
      name: 'Professional',
      price: 14.99,
      features: [
        'All clinical calculators',
        '1,000 AI queries/day',
        'Full drug interactions',
        'Clinical protocols',
        'Lab interpretation',
        'Offline access',
      ],
    },
    institutional: {
      priceId: process.env.STRIPE_PRICE_INSTITUTIONAL,
      name: 'Institutional',
      price: null, // Custom pricing
      features: [
        'All Professional features',
        '10,000 AI queries/day',
        // Honest claim: live FHIR/HL7/DICOM writeback is not production-ready yet
        // (interop hub reports synthetic_ready). See docs/enterprise-subsystems-capability-map.md QW-3.
        'Integration hub (demo adapters; live FHIR/HL7/DICOM writeback not included)',
        'Custom branding',
        'Dedicated support',
        'SSO/SAML',
        'Team management',
      ],
    },
  },

  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:8000/subscription/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:8000/subscription/cancel',
}));
