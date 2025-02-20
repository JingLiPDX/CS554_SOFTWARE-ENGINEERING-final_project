from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import bcrypt
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__, template_folder="templates", static_folder='static')
CORS(app)
app.secret_key = "1234"  

DB_FILE = 'users.db'

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
            password TEXT NOT NULL
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

    conn.commit()
    conn.close()

# for Frontend Pages
@app.route('/')
def home():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))

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
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 400  

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing required fields"}), 400  

    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, password FROM users WHERE email = ?", (data['email'],))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    print("User input email:", data["email"])
    print("User input password:", data["password"])

    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user[2].encode('utf-8')):
        session["user_id"] = user[0]  # Store user_id in session
        session["username"] = user[1]
        return jsonify({"message": "Login successful!", "user_id": user[0], "username": user[1]}), 200

    return jsonify({"error": "Invalid email or password"}), 401


# Logout
@app.route('/logout')
def logout():
    session.pop("user_id", None)
    session.pop("username", None)
    return redirect(url_for('home'))


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



@app.route("/transactions", methods=["GET"])
def get_transactions():
    if 'user_id' not in session:
        return jsonify([])

    user_id = session['user_id']
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT amount, category, date, description FROM transactions WHERE user_id = ?",
        (user_id,)
    )
    transactions = cursor.fetchall()
    conn.close()

    transactions_list = [
        {"amount": t[0], "category": t[1], "date": t[2], "description": t[3]}
        for t in transactions
    ]
    
    print(f"✅ Transactions for user {user_id}: {transactions_list}")  # Debugging
    return jsonify(transactions_list)


# Main entry point to run the Flask app
if __name__ == '__main__':
    init_db()
    app.run(debug=True)
