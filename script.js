const apiUrl = "http://127.0.0.1:5000"; // Flask backend URL

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Script Loaded!");

  // Attach event listeners only if elements exist
  let incomeForm = document.getElementById("incomeForm");
  if (incomeForm) {
    incomeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addTransaction("income");
    });
  }

  let expenseForm = document.getElementById("expenseForm");
  if (expenseForm) {
    expenseForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addTransaction("expense");
    });
  }

  // Load transactions when page loads
  loadTransactions();
});

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
        let modalElement = document.getElementById("signupModal");
        let modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        document.getElementById("signupName").value = "";
        document.getElementById("signupEmail").value = "";
        document.getElementById("signupPassword").value = "";
      }
    })
    .catch((error) => console.error("Error:", error));
};

// user login in dashboard
window.loginUser = function () {
  console.log("Login function called"); // Debugging check
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Email and password are required.");
    return;
  }

  fetch("http://127.0.0.1:5000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Login successful!") {
        alert("Login successful!");
        sessionStorage.setItem("username", data.username);
        window.location.href = "/dashboard";
      } else {
        alert("Invalid email or password.");
      }
    })
    .catch((error) => console.error("Error:", error));
};

// ✅ Logout function
window.logout = function () {
  sessionStorage.removeItem("username");
  window.location.href = "/";
};

// ✅ Ensure user stays logged in
window.checkLogin = function () {
  let user = sessionStorage.getItem("username");
  if (!user) {
    window.location.href = "/";
  } else {
    document.getElementById("welcomeUser").textContent = "Hello, " + user + "!";
  }
};

// ✅ Budget Setting
window.setBudget = function () {
  let budget = document.getElementById("budgetAmount").value;
  if (budget > 0) {
    localStorage.setItem("budget", budget);
    document.getElementById("budgetProgress").style.width = "0%";
    document.getElementById("budgetProgress").textContent = "0%";
    alert("Budget set successfully!");
  }
};

// Handle Transaction history
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

    console.log("🔹 Sending transaction:", {
      amount,
      category,
      date,
      description,
    });

    fetch("http://127.0.0.1:5000/add_transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, category, date, description }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("✅ Server response:", data);
        alert(data.message);
        loadTransactions(); // Refresh transaction history
      })
      .catch((error) => console.error("❌ Fetch error:", error));
  });

// add transaction
function addTransaction(type) {
  let amount, date, category, description;

  if (type === "income") {
    amount = document.getElementById("incomeAmount").value;
    date = document.getElementById("incomeDate").value;
    category = "Income"; // Special category for income
    description = document.getElementById("incomeDescription").value;
  } else {
    amount = document.getElementById("amount").value;
    date = document.getElementById("date").value;
    category = document.getElementById("category").value;
    description = document.getElementById("description").value;
  }

  if (!amount || !date) {
    alert("Please enter an amount and date.");
    return;
  }

  // Convert amount to a number
  amount = parseFloat(amount);

  fetch("http://127.0.0.1:5000/add_transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, category, date, description }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      loadTransactions(); // Refresh transactions
    })
    .catch((error) => console.error("❌ Error:", error));
}

// load transaction
function loadTransactions() {
  fetch("http://127.0.0.1:5000/transactions")
    .then((response) => response.json())
    .then((data) => {
      console.log("✅ Transactions received:", data);

      const transactionList = document.getElementById("transactionList");
      transactionList.innerHTML = ""; // Clear previous list

      let totalIncome = 0;
      let totalExpenses = 0;
      let categoryTotals = {};

      data.forEach((transaction) => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `<strong>$${transaction.amount}</strong> - ${transaction.category} (${transaction.date})<br>
                              <small>${transaction.description}</small>`;
        transactionList.appendChild(li);

        // Categorizing transactions
        if (transaction.category === "Income") {
          totalIncome += parseFloat(transaction.amount);
        } else {
          totalExpenses += parseFloat(transaction.amount);
          categoryTotals[transaction.category] =
            (categoryTotals[transaction.category] || 0) +
            parseFloat(transaction.amount);
        }
      });

      updateCharts(totalIncome, totalExpenses, categoryTotals);
    })
    .catch((error) => console.error("❌ Fetch error:", error));
}

// Handle Income Submission
document
  .getElementById("incomeForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    let amount = document.getElementById("incomeAmount").value;
    let date = document.getElementById("incomeDate").value;
    let description = document.getElementById("incomeDescription").value;

    if (!amount || !date) {
      alert("Please enter amount and date!");
      return;
    }

    fetch("http://127.0.0.1:5000/add_transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(amount),
        category: "Income",
        date,
        description,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
        updateCharts();
      })
      .catch((error) => console.error("Error:", error));
  });

// Handle Expense Submission
document
  .getElementById("expenseForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    let amount = document.getElementById("expenseAmount").value;
    let date = document.getElementById("expenseDate").value;
    let category = document.getElementById("expenseCategory").value;
    let description = document.getElementById("expenseDescription").value;

    if (!amount || !date || !category) {
      alert("Please enter amount, date, and category!");
      return;
    }

    fetch("http://127.0.0.1:5000/add_transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: -Math.abs(parseFloat(amount)),
        category,
        date,
        description,
      }), // Negative for expenses
    })
      .then((response) => response.json())
      .then((data) => {
        alert(data.message);
        updateCharts();
      })
      .catch((error) => console.error("Error:", error));
  });

//chart for visual display
function updateCharts(totalIncome, totalExpenses, categoryTotals) {
  let pieCtx = document.getElementById("pieChart").getContext("2d");
  let barCtx = document.getElementById("barChart").getContext("2d");

  // Pie Chart (Spending by Category)
  new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          label: "Spending by Category",
          data: Object.values(categoryTotals),
          backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });

  // Bar Chart (Income vs Expenses)
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
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

//Run when page loads
document.addEventListener("DOMContentLoaded", function () {
  fetch("/transactions") // Ensure Flask has a `/transactions` API
    .then((response) => response.json())
    .then((data) => {
      console.log("Transactions:", data);

      let transactionList = document.getElementById("transactionList");
      transactionList.innerHTML = ""; // Clear old entries

      data.forEach((transaction) => {
        let listItem = document.createElement("li");
        listItem.classList.add("list-group-item");
        listItem.innerHTML = `<strong>$${transaction.amount}</strong> - ${transaction.category} (${transaction.date})<br>
                                <small>${transaction.description}</small>`;
        transactionList.appendChild(listItem);
      });
    })
    .catch((error) => console.error("❌ Error fetching transactions:", error));
});

window.logout = function () {
  fetch("/logout")
    .then(() => {
      sessionStorage.removeItem("username");
      window.location.href = "/"; // Redirect to home
    })
    .catch((error) => console.error("Logout Error:", error));
};

// Run only if user is on the dashboard page
if (window.location.pathname === "/dashboard") {
  const username = sessionStorage.getItem("username");
  if (username) {
    document.getElementById("welcomeUser").textContent = `Hello, ${username}!`;
  } else {
    window.location.href = "/"; // Redirect to login if not logged in
  }

  // Only add event listener if form exists
  const transactionForm = document.getElementById("transactionForm");
  if (transactionForm) {
    transactionForm.addEventListener("submit", function (event) {
      event.preventDefault();
      console.log("Transaction form submitted!");
    });
  }
}

window.logout = function () {
  fetch("/logout")
    .then(() => {
      sessionStorage.removeItem("username");
      window.location.href = "/"; // Redirect to home
    })
    .catch((error) => console.error("Logout Error:", error));
};

/*
// Run only if user is on the dashboard page
if (window.location.pathname === "/dashboard") {
  const username = sessionStorage.getItem("username");
  if (username) {
    document.getElementById("welcomeUser").textContent = `Hello, ${username}!`;
  } else {
    window.location.href = "/"; // Redirect to login if not logged in
  }

  // Only add event listener if form exists
  const transactionForm = document.getElementById("transactionForm");
  if (transactionForm) {
    transactionForm.addEventListener("submit", function (event) {
      event.preventDefault();
      console.log("Transaction form submitted!");
    });
  }
}
*/
