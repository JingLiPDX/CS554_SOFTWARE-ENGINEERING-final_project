// Budget
document.addEventListener("DOMContentLoaded", function () {
  const apiUrl = "http://127.0.0.1:5000"; // Flask backend URL

  // ✅ Register User
  window.registerUser = function () {
    const username = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    if (!username || !email || !password) {
      alert("All fields are required.");
      return;
    }

    fetch(`${apiUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message || data.error);
        if (data.message) {
          // Close modal and reset form
          document.getElementById("signupModal").classList.remove("show");
          document.getElementById("signupName").value = "";
          document.getElementById("signupEmail").value = "";
          document.getElementById("signupPassword").value = "";
        }
      })
      .catch((error) => console.error("Error:", error));
  };

  // ✅ Login User
  window.loginUser = function () {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      alert("Email and password are required.");
      return;
    }

    fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          alert("Login successful!");
          sessionStorage.setItem("username", data.username);
          window.location.href = "dashboard.html"; // Redirect to dashboard
        } else {
          alert(data.error);
        }
      })
      .catch((error) => console.error("Error:", error));
  };
});

function registerUser() {
  let name = document.getElementById("signupName").value;
  let email = document.getElementById("signupEmail").value;
  let password = document.getElementById("signupPassword").value;

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  // Get existing users from localStorage or initialize an empty array
  let users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if email already exists
  if (users.find((user) => user.email === email)) {
    alert("Email already registered. Please log in.");
    return;
  }

  // Save new user
  users.push({ name, email, password });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created successfully! You can now log in.");

  // **Debugging Modal Closure**
  let modalElement = document.getElementById("signupModal");
  let modalInstance = bootstrap.Modal.getInstance(modalElement);

  console.log("Modal instance:", modalInstance);

  if (modalInstance) {
    modalInstance.hide();
  } else {
    console.warn("Bootstrap modal instance not found!");
  }

  // Clear input fields after signup
  document.getElementById("signupName").value = "";
  document.getElementById("signupEmail").value = "";
  document.getElementById("signupPassword").value = "";
}

// Login User
function loginUser() {
  let email = document.getElementById("loginEmail").value;
  let password = document.getElementById("loginPassword").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];

  let user = users.find(
    (user) => user.email === email && user.password === password
  );

  if (user) {
    localStorage.setItem("loggedInUser", user.name);
    alert("Login successful!");

    // **Redirect to Expense Tracker Dashboard**
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid email or password.");
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html"; // Redirect back to login page
}

// ✅ Ensure user stays logged in & redirect if not logged in
function checkLogin() {
  let user = localStorage.getItem("loggedInUser");
  if (!user) {
    window.location.href = "index.html"; // Redirect to login if not logged in
  } else {
    document.getElementById("welcomeUser").textContent = "Hello, " + user + "!";
  }
}

// ✅ Logout function
function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "index.html"; // Redirect to login
}

// ✅ Budget Setting
function setBudget() {
  let budget = document.getElementById("budgetAmount").value;
  if (budget > 0) {
    localStorage.setItem("budget", budget);
    document.getElementById("budgetProgress").style.width = "0%";
    document.getElementById("budgetProgress").textContent = "0%";
    alert("Budget set successfully!");
  }
}

// ✅ Handle Transactions
document
  .getElementById("transactionForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    let amount = document.getElementById("amount").value;
    let category = document.getElementById("category").value;
    let date = document.getElementById("date").value;
    let description = document.getElementById("description").value;

    if (!amount || !date) {
      alert("Please enter amount and date!");
      return;
    }

    let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    transactions.push({ amount, category, date, description });
    localStorage.setItem("transactions", JSON.stringify(transactions));

    alert("Transaction Added!");
    loadTransactions();
  });

// ✅ Load Transactions
function loadTransactions() {
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let transactionList = document.getElementById("transactionList");
  transactionList.innerHTML = "";

  transactions.forEach((transaction) => {
    let listItem = document.createElement("li");
    listItem.className = "list-group-item";
    listItem.textContent = `${transaction.date} - ${transaction.category} - $${transaction.amount}: ${transaction.description}`;
    transactionList.appendChild(listItem);
  });

  updateCharts();
}

// ✅ Update Charts
function updateCharts() {
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

  let categories = { Food: 0, Rent: 0, Utilities: 0, Entertainment: 0 };
  let totalIncome = 0,
    totalExpenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.amount > 0) {
      totalIncome += parseFloat(transaction.amount);
    } else {
      categories[transaction.category] += Math.abs(transaction.amount);
      totalExpenses += Math.abs(transaction.amount);
    }
  });

  let pieCtx = document.getElementById("pieChart").getContext("2d");
  let barCtx = document.getElementById("barChart").getContext("2d");

  new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [
        {
          label: "Spending",
          data: Object.values(categories),
          backgroundColor: ["red", "blue", "green", "yellow"],
        },
      ],
    },
  });

  new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [
        {
          label: "Amount ($)",
          data: [totalIncome, totalExpenses],
          backgroundColor: ["green", "red"],
        },
      ],
    },
  });
}

// ✅ Run when page loads
document.addEventListener("DOMContentLoaded", function () {
  checkLogin();
  loadTransactions();
});
