const pool = require('./db');

function mapBookRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isIssued: !!row.is_issued
  };
}

/* ---------- Users ---------- */

async function getUserByGmail(gmail) {
  const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(gmail) = LOWER(?)', [gmail]);
  return rows[0] || null;
}

async function createUser({ username, gmail, passwordHash, role }) {
  await pool.query(
    'INSERT INTO users (username, gmail, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, gmail, passwordHash, role]
  );
}

async function getAllUsers() {
  const [rows] = await pool.query('SELECT username, gmail, role FROM users ORDER BY id');
  return rows;
}

/* ---------- Books ---------- */

async function getAllBooks() {
  const [rows] = await pool.query('SELECT * FROM books ORDER BY id');
  return rows.map(mapBookRow);
}

async function getBookById(id) {
  const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [String(id)]);
  return rows[0] ? mapBookRow(rows[0]) : null;
}

async function searchBooksByTitle(title) {
  const [rows] = await pool.query(
    'SELECT * FROM books WHERE LOWER(title) LIKE ? ORDER BY id',
    [`%${title.toLowerCase()}%`]
  );
  return rows.map(mapBookRow);
}

async function createBook({ id, title, author }) {
  await pool.query(
    'INSERT INTO books (id, title, author, is_issued) VALUES (?, ?, ?, FALSE)',
    [id, title, author]
  );
}

async function updateBook(id, { title, author }) {
  const fields = [];
  const params = [];

  if (title) { fields.push('title = ?'); params.push(title); }
  if (author) { fields.push('author = ?'); params.push(author); }
  if (!fields.length) return;

  params.push(String(id));
  await pool.query(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteBook(id) {
  await pool.query('DELETE FROM books WHERE id = ?', [String(id)]);
}

async function setBookIssued(id, isIssued) {
  await pool.query('UPDATE books SET is_issued = ? WHERE id = ?', [isIssued, String(id)]);
}

module.exports = {
  getUserByGmail,
  createUser,
  getAllUsers,
  getAllBooks,
  getBookById,
  searchBooksByTitle,
  createBook,
  updateBook,
  deleteBook,
  setBookIssued
};
