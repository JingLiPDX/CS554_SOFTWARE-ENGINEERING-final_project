from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import bcrypt
from flask_cors import CORS
from datetime import datetime, timezone
from werkzeug.security import check_password_hash

# from typing import List, Tuple # for assignment6 Unittest for purpose 
import os

app = Flask(__name__, template_folder="templates", static_folder='static')
CORS(app)
app.secret_key = "1234"  

DB_FILE = os.path.join(os.getcwd(), "users.db")

stored_password = "$2b$12$AyG4l30buPtMP9SmHo.kyOQqDlMNHDmExjiUzK6mgkrQIHEhqB42C"
input_password = "123456"

if bcrypt.checkpw(input_password.encode('utf-8'), stored_password.encode('utf-8')):
    print("✅ Password matches")
else:
    print("❌ Password does not match")

# Initialize Database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Create users table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL 
        );
    """)

    # Create transactions table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        );
    """)
    
    # Create budgets table if not exists (to store per-user monthly budget)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            user_id INTEGER NOT NULL,
            budget REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        );
    """)

    conn.commit()
    conn.close()

# for Frontend Pages
@app.route('/')
def home():
    return render_template("index.html")


# for unit testing purpose
"""def is_user_logged_in() -> bool:
    
    return 'user_id' in session and 'username' in session

def get_user_id() -> int:
    
    return session['user_id']

def get_username() -> str:
    return session['username']


 """

# load dashboard
@app.route("/dashboard")
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('home'))

    user_id = session['user_id']
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Fetch transactions for the logged-in user
    cursor.execute("SELECT amount, category, date, description FROM transactions WHERE user_id = ?", (user_id,))
    transactions = cursor.fetchall()
    conn.close()

    return render_template("dashboard.html", username=session['username'], transactions=transactions)


# User Login Endpoint (Redirects to Dashboard on Success)
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not all(k in data for k in ("username", "email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  

    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)  
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)",
                       (data['username'], data['email'], hashed_password, datetime.now(timezone.utc).isoformat()))
        
        user_id = cursor.lastrowid  # Get the newly created user_id
        cursor.execute("INSERT INTO budgets (user_id, budget) VALUES (?, 0)", (user_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 400  


# user loging 
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, password FROM users WHERE email = ?", (data["email"],))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    

    
    if not user:
        print("❌ No user found with this email")
        return jsonify({"error": "Invalid email or password"}), 401

    print("✅ User found:", user[1])
    print("🔹 Stored hashed password:", user[2])

    
    if bcrypt.checkpw(data['password'].encode('utf-8'), user[2].encode('utf-8')):
        session["user_id"] = user[0]
        session["username"] = user[1]
        print("✅ Login successful")
        return jsonify({"message": "Login successful!", "user_id": user[0], "username": user[1]}), 200
    else:
        print("❌ Password mismatch")
        return jsonify({"error": "Invalid email or password"}), 401
    

# Logout
@app.route('/logout')
def logout():
    session.pop("user_id", None)
    session.pop("username", None)
    return redirect(url_for('home'))

# Transaction endpoint
@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    user_id = session['user_id']
    amount = data.get('amount')
    category = data.get('category')
    date = data.get('date')
    description = data.get('description')

    print(f"🔹 Received transaction data: {data}")

    if not amount or not category or not date:
        print("❌ Missing required fields")
        return jsonify({'message': 'All fields are required'}), 400

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO transactions (user_id, amount, category, date, description) VALUES (?, ?, ?, ?, ?)",
            (user_id, amount, category, date, description)
        )
        conn.commit()
        conn.close()

        print("✅ Transaction successfully saved in the database!")
        return jsonify({'message': 'Transaction added successfully'})

    except Exception as e:
        print("❌ Error inserting transaction:", e)
        return jsonify({'message': 'Database error'}), 500

'''
# Get Transaction endpoint
@app.route("/transactions", methods=["GET"])
def get_transactions():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT amount, category, date, description 
        FROM transactions WHERE user_id = ?
        ORDER BY date DESC
    """, (session.get("user_id"),))

    transactions = cursor.fetchall()
    conn.close()
    
    return jsonify([
        {"amount": row[0], "category": row[1], "date": row[2], "description": row[3]}
        for row in transactions
    ])
'''

# Get Transaction endpoint
@app.route("/transactions", methods=["GET"])
def get_transactions():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get month from query parameter if provided, default to all months
    month = request.args.get('month')
    query = """
        SELECT amount, category, date, description 
        FROM transactions 
        WHERE user_id = ? 
        ORDER BY date DESC
    """
    params = (user_id,)

    if month:
        query += " AND date LIKE ?"
        params += (f"{month}%",)

    cursor.execute(query, params)
    transactions = cursor.fetchall()
    conn.close()

    return jsonify([
        {"amount": row[0], "category": row[1], "date": row[2], "description": row[3]}
        for row in transactions
    ])
    
# Get/Set User Budget Endpoint
@app.route('/user/budget', methods=['GET', 'POST'])
def user_budget():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    user_id = session['user_id']
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        if request.method == 'GET':
            # Fetch user's budget
            cursor.execute("SELECT budget FROM budgets WHERE user_id = ?", (user_id,))
            budget = cursor.fetchone()
            conn.close()
            return jsonify({"budget": budget[0] if budget else 0})

        elif request.method == 'POST':
            data = request.get_json()
            if not data or 'budget' not in data:
                return jsonify({'message': 'Missing budget value'}), 400

            budget = float(data['budget'])
            # Update or insert budget for the user
            cursor.execute("INSERT OR REPLACE INTO budgets (user_id, budget) VALUES (?, ?)", (user_id, budget))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Budget updated successfully'})
    except Exception as e:
        print(f"❌ Error in user_budget: {e}")
        conn.close()
        return jsonify({'message': 'Database error'}), 500
    
    
# Main entry point to run the Flask app
if __name__ == '__main__':
    init_db()
    app.run(debug=False)
