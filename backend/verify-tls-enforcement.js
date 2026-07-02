#!/usr/bin/env node

/**
 * TLS 1.3 and Security Headers Verification Script
 * 
 * This script verifies:
 * 1. HSTS header presence and configuration
 * 2. Content-Security-Policy header
 * 3. X-Frame-Options header
 * 4. X-Content-Type-Options header
 * 5. Referrer-Policy header
 * 6. Permissions-Policy header
 * 
 * Run with: node verify-tls-enforcement.js [URL]
 * Example: node verify-tls-enforcement.js https://localhost:8000
 */

const https = require('https');
const http = require('http');

const URL = process.argv[2] || 'https://localhost:8000';

console.log('🔒 TLS 1.3 & Security Headers Verification');
console.log('='.repeat(50));
console.log(`Target URL: ${URL}\n`);

// Parse URL
const urlObj = new URL(URL);
const protocol = urlObj.protocol === 'https:' ? https : http;

// Expected security headers
const requiredHeaders = {
  'strict-transport-security': {
    name: 'HSTS',
    shouldContain: ['max-age=31536000', 'includeSubDomains', 'preload'],
    optional: false,
  },
  'content-security-policy': {
    name: 'CSP',
    shouldContain: ["default-src 'self'"],
    optional: false,
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    shouldContain: ['DENY'],
    optional: false,
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    shouldContain: ['nosniff'],
    optional: false,
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    shouldContain: ['strict-origin-when-cross-origin'],
    optional: false,
  },
  'permissions-policy': {
    name: 'Permissions-Policy',
    shouldContain: ['camera=()'],
    optional: true, // Modern header, older servers might not have
  },
};

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname || '/',
  method: 'HEAD',
  rejectUnauthorized: false, // Allow self-signed certs for testing
};

const request = protocol.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}\n`);
  console.log('Security Headers Check:');
  console.log('-'.repeat(50));

  let passCount = 0;
  let failCount = 0;
  let results = [];

  // Check each required header
  for (const [headerKey, headerSpec] of Object.entries(requiredHeaders)) {
    const headerValue = res.headers[headerKey.toLowerCase()];

    if (!headerValue) {
      const status = headerSpec.optional ? '⚠️ ' : '❌ ';
      const type = headerSpec.optional ? 'Missing (optional)' : 'Missing';
      results.push({
        header: headerSpec.name,
        status: type,
        value: '',
        icon: status,
        pass: headerSpec.optional,
      });
      if (!headerSpec.optional) failCount++;
      else passCount++;
      continue;
    }

    // Check if header contains required values
    let allMatch = true;
    for (const required of headerSpec.shouldContain) {
      if (!headerValue.toLowerCase().includes(required.toLowerCase())) {
        allMatch = false;
        break;
      }
    }

    const pass = allMatch;
    const icon = pass ? '✅ ' : '❌ ';
    const status = pass ? 'Present' : 'Invalid';

    results.push({
      header: headerSpec.name,
      status: status,
      value: headerValue,
      icon: icon,
      pass: pass,
    });

    if (pass) passCount++;
    else failCount++;
  }

  // Display results
  for (const result of results) {
    console.log(`\n${result.icon}${result.header}`);
    console.log(`   Status: ${result.status}`);
    if (result.value) {
      console.log(`   Value: ${result.value}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\nResults: ${passCount} passed, ${failCount} failed`);

  if (failCount === 0) {
    console.log('✅ All security headers are properly configured!');
    process.exit(0);
  } else {
    console.log('❌ Some security headers are missing or improperly configured');
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
  console.error('\nDetails:');
  console.error(`  Host: ${options.hostname}`);
  console.error(`  Port: ${options.port}`);
  console.error(`  Protocol: ${urlObj.protocol}`);
  console.error('\nTroubleshooting:');
  console.error('  1. Ensure the server is running');
  console.error('  2. Check the hostname and port');
  console.error('  3. For HTTPS, ensure the certificate is valid');
  console.error('  4. For self-signed certs, the script allows them (rejectUnauthorized: false)');
  process.exit(1);
});

request.end();

// Additional validation functions for TLS version
console.log('\nNote: To verify TLS version, run:');
console.log(`  openssl s_client -connect ${urlObj.hostname}:${urlObj.port || 443}`);
console.log('\nNote: curl with TLS 1.2 should fail (if TLS 1.3 enforced):');
console.log(`  curl --tlsv1.2 ${URL}`);
console.log('\nExpected result: "curl: (35) error:1410D0B9:SSL routines:SSL_CTX_set_tlsext_status_req_ocsp_resp_parse_failed"');
