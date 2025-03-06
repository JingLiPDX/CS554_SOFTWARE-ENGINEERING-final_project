const apiUrl = "http://127.0.0.1:5000"; // Corrected and consistently used variable name (camelCase)

// Global variables
let currentBudget = 0;
let userId = null; // Start with null, set dynamically after login
let currentMonth = new Date().toISOString().slice(0, 7); // Default to current month (YYYY-MM)

// Global variables to store chart instances
let pieChartInstance = null; // Store the pie chart instance
let barChartInstance = null; // Store the bar chart instance

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

  // Check login status and load user data
  const storedUserId = sessionStorage.getItem("userId");
  if (storedUserId) {
    userId = storedUserId;
    loadUserData(); // Load data if userId exists
  } else {
    console.log("❌ No user ID found. Please log in.");
  }

  // Welcome user if on dashboard
  if (window.location.pathname === "/dashboard") {
    const username = sessionStorage.getItem("username");
    if (username) {
      document.getElementById(
        "welcomeUser"
      ).textContent = `Hello, ${username}!`;
    } else {
      window.location.href = "/login"; // Redirect to login if not logged in
    }
  }

  // Add form submission for login page if on login page (root '/')
  if (window.location.pathname === "/") {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        loginUser(); // Call loginUser on form submission
      });
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", function (event) {
        event.preventDefault();
        registerUser(); // Call registerUser on form submission
      });
    }
  }
});

// Function to set userId after login (example)
function setUserId(id) {
  userId = id;
  sessionStorage.setItem("userId", userId);
}

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

// User login in dashboard
window.loginUser = function () {
  console.log("Login function called");
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Email and password are required.");
    return;
  }

  fetch(`${apiUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Login response:", data);
      if (data.message === "Login successful!") {
        // Extract userId and username from the response, handle potential variations
        if (data.userId && data.username) {
          setUserId(data.userId); // Set the dynamic userId
          sessionStorage.setItem("username", data.username); // Keep username for display
          alert("Login successful!");
          window.location.href = "/dashboard";
        } else if (data.user_id && data.username) {
          // Handle potential lowercase 'user_id'
          setUserId(data.user_id); // Set the dynamic userId
          sessionStorage.setItem("username", data.username); // Keep username for display
          alert("Login successful!");
          window.location.href = "/dashboard";
        } else {
          alert("❌ Login failed: User ID or username not provided by server.");
        }
      } else {
        alert("Invalid email or password.");
      }
    })
    .catch((error) => console.error("Error:", error));
};

// ✅ Logout function
window.logout = function () {
  fetch(`${apiUrl}/logout`)
    .then(() => {
      userId = null; // Clear user ID
      currentBudget = 0; // Reset budget locally (optional, since it’s stored on backend)
      sessionStorage.clear(); // Clear sessionStorage
      alert("Logged out successfully!");
      window.location.href = "/"; // Redirect to home
    })
    .catch((error) => console.error("Logout Error:", error));
};

// Set budget function (specific to the current user, saved to backend)
window.setBudget = function () {
  if (!userId) {
    alert("❌ Please log in to set a budget.");
    return;
  }

  let budgetInput = document.getElementById("budgetAmount").value;
  if (budgetInput > 0) {
    currentBudget = parseFloat(budgetInput); // Set the current user's budget
    // Save budget to backend
    fetch(`${apiUrl}/user/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId, budget: currentBudget }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        alert("✅ Budget set successfully for this user!");
        loadUserData(currentMonth); // Update with current month data
      })
      .catch((error) => console.error("❌ Error saving budget:", error));
  } else {
    alert("❌ Please enter a valid budget amount greater than 0.");
  }
};

// Load user data function (using dynamic userId, grouped by month)
function loadUserData(selectedMonth = currentMonth) {
  if (!userId) {
    console.error("❌ User ID not set. Please log in.");
    alert("Please log in to view your data.");
    window.location.href = "/login"; // Redirect to login page if no userId
    return;
  }

  // Fetch transactions for the user
  fetch(`${apiUrl}/transactions?userId=${encodeURIComponent(userId)}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("✅ Transactions received:", data);

      const transactionList = document.getElementById("transactionList");
      transactionList.innerHTML = ""; // Clear previous list

      // Group transactions by month
      const transactionsByMonth = {};
      data.forEach((transaction) => {
        const month = transaction.date.slice(0, 7);
        if (!transactionsByMonth[month]) {
          transactionsByMonth[month] = {
            income: 0,
            expenses: 0,
            categories: {},
          };
        }
        const amount = parseFloat(transaction.amount) || 0;
        if (
          transaction.category === "Income" ||
          transaction.category === "Salary"
        ) {
          transactionsByMonth[month].income += amount;
        } else {
          transactionsByMonth[month].expenses += Math.abs(amount);
          transactionsByMonth[month].categories[transaction.category] =
            (transactionsByMonth[month].categories[transaction.category] || 0) +
            Math.abs(amount);
        }

        // Add to transaction list (grouped by month)
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `<strong>$${Math.abs(amount)}</strong> - ${
          transaction.category
        } (${transaction.date})<br>
                                <small>${transaction.description}</small>`;
        transactionList.appendChild(li);
      });

      // Get data for the selected month
      const monthData = transactionsByMonth[selectedMonth] || {
        income: 0,
        expenses: 0,
        categories: {},
      };
      const totalIncome = monthData.income;
      const totalExpenses = monthData.expenses;
      const categoryTotals = monthData.categories;

      // Fetch user's budget from backend (persists per userId)
      fetch(`${apiUrl}/user/budget?userId=${encodeURIComponent(userId)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((budgetData) => {
          if (budgetData.budget !== undefined) {
            currentBudget = parseFloat(budgetData.budget) || 0;
            console.log("✅ Budget loaded:", currentBudget);
          } else {
            console.warn("No budget found for user, setting to 0");
            currentBudget = 0;
          }
          // Update pie chart for the selected month and bar chart for all relevant months
          updatePieChart(categoryTotals);
          updateBarChart();
        })
        .catch((error) => {
          console.error("❌ Fetch error (budget):", error);
          currentBudget = 0; // Default to 0 if fetch fails
          updatePieChart(categoryTotals);
          updateBarChart();
        });

      // Add month selector
      updateMonthSelector(transactionsByMonth);
    })
    .catch((error) => console.error("❌ Fetch error (transactions):", error));
}

// Function to update month selector (only updates pie chart)
function updateMonthSelector(transactionsByMonth) {
  const monthSelect = document.getElementById("monthSelect");
  console.log("Checking for monthSelect element:", monthSelect);
  if (!monthSelect) {
    const select = document.createElement("select");
    select.id = "monthSelect";
    select.className = "form-control mb-2";
    select.onchange = (e) => {
      currentMonth = e.target.value; // Update currentMonth
      loadPieChartData(currentMonth);
    };
    if (Object.keys(transactionsByMonth).length > 0) {
      const validMonths = ["2025-01", "2025-02", "2025-03", "2025-04"];
      validMonths.forEach((month) => {
        if (transactionsByMonth[month]) {
          const option = document.createElement("option");
          option.value = month;
          option.textContent = new Date(month + "-01").toLocaleString(
            "default",
            {
              month: "long",
              year: "numeric",
            }
          );
          select.appendChild(option);
        }
      });
      console.log(
        "Inserting monthSelect dropdown into DOM with months:",
        validMonths
      );
      // Ensure the container exists before inserting
      const container = document.querySelector(".container");
      if (container) {
        container.insertBefore(select, document.querySelector(".row.mt-4"));
      } else {
        console.error(
          "❌ Container not found in DOM for month selector insertion."
        );
      }
    } else {
      console.warn("No transactions found to populate month selector.");
    }
  } else {
    console.log("MonthSelect already exists, skipping creation.");
  }
}

// Load pie chart data for a specific month
function loadPieChartData(selectedMonth) {
  if (!userId) {
    console.error("❌ User ID not set. Please log in.");
    alert("Please log in to view your data.");
    window.location.href = "/login";
    return;
  }

  fetch(`${apiUrl}/transactions?userId=${encodeURIComponent(userId)}`)
    .then((response) => response.json())
    .then((data) => {
      console.log("✅ Transactions received for pie chart:", data);

      // Group transactions by month
      const transactionsByMonth = {};
      data.forEach((transaction) => {
        const month = transaction.date.slice(0, 7); // Extract YYYY-MM
        if (!transactionsByMonth[month]) {
          transactionsByMonth[month] = { categories: {} };
        }
        const amount = parseFloat(transaction.amount) || 0;
        if (
          transaction.category !== "Income" &&
          transaction.category !== "Salary"
        ) {
          transactionsByMonth[month].categories[transaction.category] =
            (transactionsByMonth[month].categories[transaction.category] || 0) +
            Math.abs(amount);
        }
      });

      // Get data for the selected month
      const categoryTotals =
        transactionsByMonth[selectedMonth]?.categories || {};

      // Update only the pie chart with the selected month's data
      updatePieChart(categoryTotals);
    })
    .catch((error) => console.error("❌ Fetch error for pie chart:", error));
}

// Update only the pie chart
function updatePieChart(categoryTotals) {
  let pieCtx = document.getElementById("pieChart").getContext("2d");

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          label: `Spending by Category - ${new Date(
            currentMonth + "-01"
          ).toLocaleString("default", { month: "long", year: "numeric" })}`,
          data: Object.values(categoryTotals).map(
            (value) => Math.abs(value) || 0
          ),
          backgroundColor: [
            "#ff6384", // Grocery
            "#36a2eb", // Insurance
            "#ffce56", // Personal Care
            "#4bc0c0", // Restaurant
            "#9966ff", // Entertainment
            "#ff9f40", // Food
            "#8c564b", // Rent
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: `Spending by Category - ${new Date(
            currentMonth + "-01"
          ).toLocaleString("default", { month: "long", year: "numeric" })}`,
        },
      },
    },
  });
}

// Update bar chart (maintain all months, unchanged)
function updateBarChart() {
  if (!userId) {
    console.error("❌ User ID not set. Please log in.");
    alert("Please log in to view your data.");
    window.location.href = "/login";
    return;
  }

  fetch(`${apiUrl}/transactions?userId=${encodeURIComponent(userId)}`)
    .then((response) => response.json())
    .then((data) => {
      const transactionsByMonth = {};
      data.forEach((transaction) => {
        const month = transaction.date.slice(0, 7); // Extract YYYY-MM
        // Only include months from January 2025 to March 2025
        if (month >= "2025-02" && month <= "2025-12") {
          if (!transactionsByMonth[month]) {
            transactionsByMonth[month] = { income: 0, expenses: 0 };
          }
          const amount = parseFloat(transaction.amount) || 0;
          if (
            transaction.category === "Income" ||
            transaction.category === "Salary"
          ) {
            transactionsByMonth[month].income += amount;
          } else {
            transactionsByMonth[month].expenses += Math.abs(amount); // Use absolute value for expenses
          }
        }
      });

      const months = Object.keys(transactionsByMonth).sort(); // Sort months chronologically
      const barData = {
        labels: months.map((month) =>
          new Date(month + "-01").toLocaleString("default", {
            month: "long",
            year: "numeric",
          })
        ),
        datasets: [
          {
            label: "Monthly Budget",
            data: months.map(() => currentBudget || 0), // Use currentBudget for all months
            backgroundColor: "#ff0000", // Red
          },
          {
            label: "Income",
            data: months.map(
              (month) => transactionsByMonth[month]?.income || 0
            ),
            backgroundColor: "#0000ff", // Blue
          },
          {
            label: "Expenses",
            data: months.map(
              (month) => transactionsByMonth[month]?.expenses || 0
            ),
            backgroundColor: "#ffff00", // Yellow
          },
        ],
      };

      let barCtx = document.getElementById("barChart").getContext("2d");

      if (barChartInstance) {
        barChartInstance.destroy();
      }
      barChartInstance = new Chart(barCtx, {
        type: "bar",
        data: barData,
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Amount ($)" },
            },
            x: { title: { display: true, text: "Month" } },
          },
        },
      });
    })
    .catch((error) => console.error("❌ Fetch error for bar chart:", error));
}

// Handle Transaction Submission (Income or Expense)
function addTransaction(type) {
  if (!userId) {
    alert("❌ Please log in to add a transaction.");
    return;
  }

  let amount, date, category, description;

  if (type === "income") {
    amount = document.getElementById("incomeAmount").value;
    date = document.getElementById("incomeDate").value;
    description = document.getElementById("incomeDescription").value;
    category = "Income";
  } else {
    amount = document.getElementById("amount").value;
    date = document.getElementById("date").value;
    category = document.getElementById("category").value;
    description = document.getElementById("description").value;
  }

  if (!amount || !date) {
    alert("Please enter amount and date!");
    return;
  }

  const transactionData = {
    userId: userId, // Include user ID
    amount:
      type === "expense" ? -Math.abs(parseFloat(amount)) : parseFloat(amount),
    category,
    date,
    description,
  };

  fetch(`${apiUrl}/add_transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transactionData),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      loadUserData(currentMonth); // Refresh transactions and charts for the current month
    })
    .catch((error) => console.error("❌ Fetch error:", error));
}
