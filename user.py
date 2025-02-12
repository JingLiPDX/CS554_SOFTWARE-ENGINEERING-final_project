import sqlite3
import bcrypt
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

DB_FILE = 'users.db'

# Initialize Database
def init_user():
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

# Serve Frontend Pages
@app.route('/')
def home():
    return render_template("index.html")


# User Registration
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not all(k in data for k in ("username", "email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  

    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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
        return jsonify({"error": "Email already registered"}), 400  



# User Login Endpoint (Verify Password)
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, password FROM users WHERE email = ?", (data['email'],))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user[2].encode('utf-8')):
        return jsonify({"message": "Login successful!", "user_id": user[0], "username": user[1]}), 200
    return jsonify({"error": "Invalid email or password"}), 401


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
