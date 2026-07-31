# Library Management System - Web Version (MySQL)

Converted from the original C console app into a full web app (frontend + backend),
using MySQL for storage.

## 1. Install MySQL (if you don't have it)

Windows: download MySQL Installer from https://dev.mysql.com/downloads/installer/
(or use XAMPP, which bundles MySQL). During setup, set a root password and remember it.

## 2. Create the database and tables

Open a terminal (or MySQL Workbench / phpMyAdmin) and run the contents of `schema.sql`.
From the command line, that's:

    mysql -u root -p < schema.sql

This creates a `library_management` database with `users` and `books` tables.

## 3. Set your MySQL credentials

Open `config.js` and edit the `password` (and `user`/`host` if different from the
defaults):

    module.exports = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'YOUR_MYSQL_PASSWORD_HERE',
      database: 'library_management'
    };

## 4. Install dependencies

In a terminal, inside this folder, run:

    npm install

(This installs `mysql2`, the only dependency.)

## 5. Run the server

    node server.js

Then open your browser to: http://localhost:3000

## Roles

- **Student**   - View All Books, Search Book
- **Teacher**   - View, Search, Issue Book, Return Book
- **Librarian** - Add, View, Search, Update, Delete, Issue, Return, Generate Report
- **Admin**     - Everything Librarian has, plus View Registered Users

## Notes

- Passwords are hashed with scrypt before being stored - never in plain text.
- Sessions use a signed token (HMAC-SHA256), similar in spirit to a JWT, stored in the
  browser's localStorage after login.
- Gmail must end with `@gmail.com`, and passwords need 8+ characters with an uppercase
  letter, a lowercase letter, a number, and a special character - same rules as the
  original C version.
- If you see a "Database error" message, double check MySQL is running and that
  `config.js` has the right host/user/password/database.
