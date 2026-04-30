'use strict';

const { CSS, shieldSvg, escHtml } = require('./shared');

/**
 * Render the admin login page.
 * @param {{ error?: string }} opts
 */
function render(opts = {}) {
  const error = opts.error || '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rakshak — Admin Login</title>
  ${CSS}
</head>
<body class="login-body">
  <div class="login-card">
    <div class="login-logo">${shieldSvg(52, '#3b82f6')}</div>
    <h1 class="login-title">Admin Login</h1>
    <p class="login-sub">Please enter your Employee ID to access the dashboard</p>

    ${error ? `<div class="login-error">⚠ ${escHtml(error)}</div>` : ''}

    <form method="POST" action="/auth/login">
      <div class="form-group">
        <label class="form-label" for="empId">Employee ID</label>
        <div class="input-wrap">
          <span class="input-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <input
            id="empId" type="text" name="employeeId"
            class="form-input" placeholder="Enter Employee ID"
            autocomplete="off" spellcheck="false" autofocus required
          >
        </div>
      </div>
      <button type="submit" class="btn-login">Login →</button>
    </form>

    <p class="login-hint">Valid ID: <strong>EMP001</strong></p>
  </div>
</body>
</html>`;
}

module.exports = { render };
