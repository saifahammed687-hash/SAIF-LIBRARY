const token = localStorage.getItem('lms_token');
const username = localStorage.getItem('lms_username');
const role = localStorage.getItem('lms_role');

if (!token) {
  window.location.href = 'index.html';
}

const CAN = {
  add: ['Librarian', 'Admin'].includes(role),
  update: ['Librarian', 'Admin'].includes(role),
  delete: ['Admin'].includes(role),
  issueReturn: ['Teacher', 'Librarian', 'Admin'].includes(role),
  report: ['Librarian', 'Admin'].includes(role),
  users: ['Admin'].includes(role)
};

document.getElementById('userStamp').textContent = `${username} — ${role}`;
document.getElementById('userStamp').classList.add(`role-${role}`);

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_username');
  localStorage.removeItem('lms_role');
  window.location.href = 'index.html';
});

// ---------- Tabs (hide ones this role can't use) ----------
document.querySelectorAll('#tablist .pill').forEach(btn => {
  const allowed = btn.dataset.roles;
  if (allowed && !allowed.split(',').includes(role)) {
    btn.remove();
  } else {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  }
});

function switchPanel(name) {
  document.querySelectorAll('#tablist .pill').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'report') loadReport();
  if (name === 'users') loadUsers();
}

// ---------- API helper ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = 'index.html';
    return null;
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function flash(el, text, ok = false) {
  el.textContent = text;
  el.className = 'msg show ' + (ok ? 'ok' : 'error');
  setTimeout(() => { el.className = 'msg'; }, 3500);
}

// ---------- Books table ----------
function renderBooks(books) {
  const wrap = document.getElementById('booksTableWrap');

  if (!books.length) {
    wrap.innerHTML = `<div class="empty-state">No books in the catalog yet.</div>`;
    return;
  }

  const rows = books.map(b => `
    <tr data-id="${escapeHtml(b.id)}">
      <td class="mono">${escapeHtml(b.id)}</td>
      <td class="cell-title">${escapeHtml(b.title)}</td>
      <td class="cell-author">${escapeHtml(b.author)}</td>
      <td><span class="stamp ${b.isIssued ? 'status-issued' : 'status-available'}">${b.isIssued ? 'Issued' : 'Available'}</span></td>
      <td>
        <div class="row-actions">
          ${CAN.issueReturn && !b.isIssued ? `<button class="icon-btn" data-action="issue">Issue</button>` : ''}
          ${CAN.issueReturn && b.isIssued ? `<button class="icon-btn" data-action="return">Return</button>` : ''}
          ${CAN.update ? `<button class="icon-btn" data-action="edit">Edit</button>` : ''}
          ${CAN.delete ? `<button class="icon-btn danger" data-action="delete">Delete</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <table class="ledger">
      <thead>
        <tr><th>ID</th><th>Title</th><th>Author</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  wrap.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleRowAction(btn));
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

async function handleRowAction(btn) {
  const row = btn.closest('tr');
  const id = row.dataset.id;
  const action = btn.dataset.action;
  const msg = document.getElementById('booksMsg');

  if (action === 'issue' || action === 'return') {
    const r = await api(`/api/books/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
    if (r.ok) { flash(msg, r.data.message, true); loadBooks(); }
    else flash(msg, r.data.error);
  }

  if (action === 'delete') {
    if (!confirm(`Delete book ${id}? This can't be undone.`)) return;
    const r = await api(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (r.ok) { flash(msg, r.data.message, true); loadBooks(); }
    else flash(msg, r.data.error);
  }

  if (action === 'edit') {
    startEdit(row, id);
  }
}

function startEdit(row, id) {
  const titleCell = row.querySelector('.cell-title');
  const authorCell = row.querySelector('.cell-author');
  const currentTitle = titleCell.textContent;
  const currentAuthor = authorCell.textContent;

  titleCell.innerHTML = `<input type="text" value="${escapeHtml(currentTitle)}" class="edit-title">`;
  authorCell.innerHTML = `<input type="text" value="${escapeHtml(currentAuthor)}" class="edit-author">`;

  const actionsCell = row.querySelector('.row-actions');
  actionsCell.innerHTML = `
    <button class="icon-btn" data-save>Save</button>
    <button class="icon-btn" data-cancel>Cancel</button>
  `;

  actionsCell.querySelector('[data-cancel]').addEventListener('click', loadBooks);
  actionsCell.querySelector('[data-save]').addEventListener('click', async () => {
    const title = row.querySelector('.edit-title').value.trim();
    const author = row.querySelector('.edit-author').value.trim();
    const msg = document.getElementById('booksMsg');

    const r = await api(`/api/books/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ title, author })
    });

    if (r.ok) { flash(msg, r.data.message, true); loadBooks(); }
    else flash(msg, r.data.error);
  });
}

async function loadBooks() {
  const r = await api('/api/books');
  if (r && r.ok) renderBooks(r.data);
}

document.getElementById('searchBtn').addEventListener('click', async () => {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return loadBooks();
  const param = /^\d+$/.test(q) ? `id=${encodeURIComponent(q)}` : `title=${encodeURIComponent(q)}`;
  const r = await api(`/api/books/search?${param}`);
  if (r && r.ok) renderBooks(r.data);
});

document.getElementById('clearSearchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  loadBooks();
});

// ---------- Add book ----------
if (CAN.add) {
  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('addMsg');

    const body = {
      id: document.getElementById('addId').value.trim(),
      title: document.getElementById('addTitle').value.trim(),
      author: document.getElementById('addAuthor').value.trim()
    };

    const r = await api('/api/books', { method: 'POST', body: JSON.stringify(body) });
    if (r.ok) {
      flash(msg, r.data.message, true);
      document.getElementById('addForm').reset();
      loadBooks();
    } else {
      flash(msg, r.data.error);
    }
  });
}

// ---------- Report ----------
async function loadReport() {
  const r = await api('/api/books/report/summary');
  if (!r || !r.ok) return;

  document.getElementById('statStrip').innerHTML = `
    <div class="stat"><div class="num">${r.data.total}</div><div class="label">Total books</div></div>
    <div class="stat"><div class="num">${r.data.issued}</div><div class="label">Issued</div></div>
    <div class="stat"><div class="num">${r.data.available}</div><div class="label">Available</div></div>
  `;

  const rows = r.data.books.map(b => `
    <tr>
      <td class="mono">${escapeHtml(b.id)}</td>
      <td>${escapeHtml(b.title)}</td>
      <td>${escapeHtml(b.author)}</td>
      <td><span class="stamp ${b.isIssued ? 'status-issued' : 'status-available'}">${b.isIssued ? 'Issued' : 'Available'}</span></td>
    </tr>
  `).join('');

  document.getElementById('reportTableWrap').innerHTML = r.data.books.length
    ? `<table class="ledger"><thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty-state">No books to report on yet.</div>`;
}

document.getElementById('refreshReportBtn')?.addEventListener('click', loadReport);

// ---------- Users (Admin only) ----------
async function loadUsers() {
  const r = await api('/api/auth/users');
  if (!r || !r.ok) return;

  const rows = r.data.map(u => `
    <tr>
      <td>${escapeHtml(u.username)}</td>
      <td>${escapeHtml(u.gmail)}</td>
      <td><span class="stamp role-${u.role}">${escapeHtml(u.role)}</span></td>
    </tr>
  `).join('');

  document.getElementById('usersTableWrap').innerHTML = r.data.length
    ? `<table class="ledger"><thead><tr><th>Username</th><th>Gmail</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty-state">No registered users yet.</div>`;
}

// ---------- Init ----------
loadBooks();
