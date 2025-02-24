import unittest
from unittest.mock import patch, MagicMock
from user import user, init_db, add_transactionons, is_user_logged_in, get_user_id, get_username, dashboard
import sqlite3
import os
from flask import session

class TestDashboard(unittest.TestCase):
    def setUp(self):
        # Set up a test client for Flask
        user.config['TESTING'] = True
        self.user = user.test_client()
        self.user_context = user.user_context()
        self.user_context.push()

        # Create an in-memory SQLite database for testing
        self.conn = sqlite3.connect(':memory:')
        self.create_test_database()

    def tearDown(self):
        # Clean up after each test
        self.conn.close()
        self.user_context.pop()

    def create_test_database(self):
        # Create a test table and insert sample data
        cursor = self.conn.cursor()
        cursor.execute("""
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                amount REAL,
                category TEXT,
                date TEXT,
                description TEXT
            )
        """)
        # Insert sample transactions for user_id 1
        cursor.execute("""
            INSERT INTO transactions (user_id, amount, category, date, description)
            VALUES (?, ?, ?, ?, ?)
        """, (1, 100.0, "Food", "2025-02-24", "Grocery shopping"))
        self.conn.commit()

    def test_is_user_logged_in(self):
        # Test when user is not logged in
        session.pop('user_id', None)
        session.pop('username', None)
        self.assertFalse(is_user_logged_in())

        # Test when user is logged in
        session['user_id'] = 1
        session['username'] = "testuser"
        self.assertTrue(is_user_logged_in())

    def test_get_user_id(self):
        session['user_id'] = 1
        self.assertEqual(get_user_id(), 1)

        # Test raising KeyError if user_id is not in session
        session.pop('user_id', None)
        with self.assertRaises(KeyError):
            get_user_id()

    def test_get_username(self):
        session['username'] = "testuser"
        self.assertEqual(get_username(), "testuser")

        # Test raising KeyError if username is not in session
        session.pop('username', None)
        with self.assertRaises(KeyError):
            get_username()

    def test_fetch_user_transactions(self):
        # Test fetching transactions with a mock connection
        with sqlite3.connect(':memory:') as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE transactions (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    amount REAL,
                    category TEXT,
                    date TEXT,
                    description TEXT
                )
            """)
            cursor.execute("""
                INSERT INTO transactions (user_id, amount, category, date, description)
                VALUES (?, ?, ?, ?, ?)
            """, (1, 100.0, "Food", "2025-02-24", "Grocery shopping"))
            conn.commit()

            transactions = add_transactionons(1, conn)
            self.assertEqual(len(transactions), 1)
            self.assertEqual(transactions[0], (100.0, "Food", "2025-02-24", "Grocery shopping"))

    @patch('user.render_template')
    @patch('user.init_db()')
    def test_dashboard_logged_in(self, mock_db_connection, mock_render_template):
        # Mock session data
        session['user_id'] = 1
        session['username'] = "testuser"

        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_db_connection.return_value = mock_conn

        # Mock query result
        mock_cursor.fetchall.return_value = [(100.0, "Food", "2025-02-24", "Grocery shopping")]

        # Call the dashboard function
        response = dashboard()

        # Assert redirect doesn't happen (user is logged in)
        self.assertIsNotNone(response)
        self.assertEqual(response[0], "dashboard.html")  
        # Check render_template was called with correct args
        mock_render_template.assert_called_once_with(
            "dashboard.html",
            username="testuser",
            transactions=[(100.0, "Food", "2025-02-24", "Grocery shopping")]
        )

    @patch('user.render_template')
    def test_dashboard_not_logged_in(self, mock_render_template):
        # Ensure user is not logged in
        session.pop('user_id', None)
        session.pop('username', None)

        # Call the dashboard function
        response = dashboard()

        # Assert redirect to login page
        self.assertEqual(response.location, "http://127.0.0.1:5000")

        # Ensure render_template wasn't called
        mock_render_template.assert_not_called()

if __name__ == '__main__':
    unittest.main()