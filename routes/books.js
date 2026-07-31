const {
  getAllBooks,
  getBookById,
  searchBooksByTitle,
  createBook,
  updateBook,
  deleteBook,
  setBookIssued
} = require('../data');
const { sendJson } = require('../lib/http-utils');

function dbErr(res, err) {
  console.error(err);
  sendJson(res, 500, { error: 'Database error. Is MySQL running and configured correctly in config.js?' });
}

// View All Books - every role
async function getAll(req, res) {
  try {
    sendJson(res, 200, await getAllBooks());
  } catch (err) {
    dbErr(res, err);
  }
}

// Search Book - every role
async function search(req, res, query) {
  try {
    if (query.id) {
      const book = await getBookById(query.id);
      return sendJson(res, 200, book ? [book] : []);
    }
    if (query.title) {
      return sendJson(res, 200, await searchBooksByTitle(query.title));
    }
    sendJson(res, 200, await getAllBooks());
  } catch (err) {
    dbErr(res, err);
  }
}

// Generate Report - Librarian, Admin
async function report(req, res) {
  try {
    const books = await getAllBooks();
    const issued = books.filter(b => b.isIssued).length;
    sendJson(res, 200, { total: books.length, issued, available: books.length - issued, books });
  } catch (err) {
    dbErr(res, err);
  }
}

// Add New Book - Librarian, Admin
async function add(req, res, body) {
  const { id, title, author } = body;

  if (!id || !title || !title.trim() || !author || !author.trim()) {
    return sendJson(res, 400, { error: 'Book ID, title, and author are all required.' });
  }

  try {
    const existing = await getBookById(id);
    if (existing) {
      return sendJson(res, 409, { error: 'A book with this ID already exists.' });
    }

    await createBook({ id: String(id), title: title.trim(), author: author.trim() });
    sendJson(res, 201, { message: 'Book added successfully.' });
  } catch (err) {
    dbErr(res, err);
  }
}

// Update Book - Librarian, Admin
async function update(req, res, id, body) {
  try {
    const existing = await getBookById(id);
    if (!existing) return sendJson(res, 404, { error: 'Book not found.' });

    await updateBook(id, { title: body.title, author: body.author });
    sendJson(res, 200, { message: 'Book updated successfully.' });
  } catch (err) {
    dbErr(res, err);
  }
}

// Delete Book - Admin only
async function remove(req, res, id) {
  try {
    const existing = await getBookById(id);
    if (!existing) return sendJson(res, 404, { error: 'Book not found.' });

    await deleteBook(id);
    sendJson(res, 200, { message: 'Book deleted successfully.' });
  } catch (err) {
    dbErr(res, err);
  }
}

// Issue Book - Teacher, Librarian, Admin
async function issue(req, res, id) {
  try {
    const book = await getBookById(id);
    if (!book) return sendJson(res, 404, { error: 'Book not found.' });
    if (book.isIssued) return sendJson(res, 409, { error: 'Book is already issued.' });

    await setBookIssued(id, true);
    sendJson(res, 200, { message: 'Book issued successfully.' });
  } catch (err) {
    dbErr(res, err);
  }
}

// Return Book - Teacher, Librarian, Admin
async function returnBook(req, res, id) {
  try {
    const book = await getBookById(id);
    if (!book) return sendJson(res, 404, { error: 'Book not found.' });
    if (!book.isIssued) return sendJson(res, 409, { error: 'This book was not issued.' });

    await setBookIssued(id, false);
    sendJson(res, 200, { message: 'Book returned successfully.' });
  } catch (err) {
    dbErr(res, err);
  }
}

module.exports = { getAll, search, report, add, update, remove, issue, returnBook };
