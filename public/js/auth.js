// Redirect straight to the dashboard if already logged in
if (localStorage.getItem('lms_token')) {
  window.location.href = 'dashboard.html';
}

const tabs = document.querySelectorAll('.tab');
const panels = {
  login: document.getElementById('loginForm'),
  register: document.getElementById('registerForm')
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    Object.values(panels).forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    panels[tab.dataset.tab].classList.add('active');
  });
});

function showMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = 'msg show ' + (ok ? 'ok' : 'error');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('loginMsg');
  msg.className = 'msg';

  const gmail = document.getElementById('loginGmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmail, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg(msg, data.error || 'Login failed.');
      return;
    }

    localStorage.setItem('lms_token', data.token);
    localStorage.setItem('lms_username', data.username);
    localStorage.setItem('lms_role', data.role);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showMsg(msg, 'Could not reach the server. Is it running?');
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('registerMsg');
  msg.className = 'msg';

  const username = document.getElementById('regUsername').value.trim();
  const gmail = document.getElementById('regGmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, gmail, password, role })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg(msg, data.error || 'Registration failed.');
      return;
    }

    showMsg(msg, data.message + ' Switch to the Log in tab.', true);
    document.getElementById('registerForm').reset();
  } catch (err) {
    showMsg(msg, 'Could not reach the server. Is it running?');
  }
});
