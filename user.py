import sqlite3
import bcrypt
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)
DB_FILE = 'users.db'  # SQLite database file

# Function to initialize the database and create the 'users' table if it does not exist
def init_user():
    """
    Initializes the SQLite database by creating the 'users' table if it does not already exist.
    The table includes:
        - user_id: Auto-incremented primary key
        - username: User's name (TEXT)
        - email: Unique user email (TEXT)
        - password: Encrypted user password (TEXT)
        - created_at: Timestamp of account creation (TEXT)
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()

# API endpoint to register a new user
@app.route('/register', methods=['POST'])
def register():
    """
    Handles user registration by accepting JSON input with 'username', 'email', and 'password'.
    - Encrypts the password using bcrypt before storing it in the database.
    - Ensures that the email is unique.
    
    Returns:
        - 201 Created: If the user is registered successfully.
        - 400 Bad Request: If required fields are missing or if the email is already registered.
    """
    data = request.json
    if not data or not all(k in data for k in ("username", "email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  # Missing input data

    # Encrypt the password using bcrypt
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)",
                       (data['username'], data['email'], hashed_password, datetime.utcnow().isoformat()))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 400  # Email must be unique

# API endpoint to retrieve all registered users (excluding passwords)
@app.route('/users', methods=['GET'])
def get_users():
    """
    Fetches and returns a list of all registered users from the database.
    - Excludes sensitive password data.
    
    Returns:
        - 200 OK: A JSON list of user details including user_id, username, email, and created_at timestamp.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, created_at FROM users")
    
    users = [
        {"user_id": row[0], "username": row[1], "email": row[2], "created_at": row[3]} 
        for row in cursor.fetchall()
    ]
    
    cursor.close()
    conn.close()
    return jsonify(users), 200

# Main entry point to run the Flask app
if __name__ == '__main__':
    init_user()  # Ensure the database is initialized before starting the server
    app.run(debug=True)
