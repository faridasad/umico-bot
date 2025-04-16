// public/js/dashboard.js
document.addEventListener("DOMContentLoaded", function () {
  initDashboard();
});

/**
 * Initialize the dashboard
 */
async function initDashboard() {
  // Set up action buttons (disabling them if not authenticated)
  setupActionButtons();

  const currentUserElement = document.getElementById("current-user");
  const logoutButton = document.getElementById("logout-btn");

  // Check if user is logged in
  const sessionToken = localStorage.getItem("sessionToken");
  const username = localStorage.getItem("username");

  if (!sessionToken) {
    // Redirect to login page if no session exists
    window.location.href = "/login.html";
    return;
  }

  // Update UI with username
  if (username) {
    currentUserElement.textContent = `Welcome, ${username}`;
  }

  // Verify session with server
  verifySession();

  // Handle logout
  logoutButton.addEventListener("click", logout);

  // Functions
  async function verifySession() {
    try {
      const response = await fetch("/auth/status", {
        method: "POST",
        body: JSON.stringify({ sessionToken }),
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (!data.isAuthenticated) {
        // Session is invalid, redirect to login
        localStorage.removeItem("sessionToken");
        localStorage.removeItem("username");
        window.location.href = "/login.html";
      }
    } catch (error) {
      console.error("Error verifying session:", error);
    }
  }

  async function logout() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      // Clear session data
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("username");

      // Redirect to login page
      window.location.href = "/login.html";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }
}

/**
 * Fetch dashboard data from the API (only if authenticated)
 */
async function fetchDashboardData() {
  try {
    const response = await fetch("/api/dashboard");

    if (response.ok) {
      const data = await response.json();
      console.log("Dashboard data:", data);
      // Update UI with dashboard data in future implementations
    } else if (response.status === 401) {
      // If unauthorized, update UI
      updateAuthUI(false);
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }
}

/**
 * Set up action buttons for the dashboard
 */
function setupActionButtons() {
  // Future module action buttons will be set up here
  const productBtn = document.querySelector('.card[data-requires-auth="true"] .action-btn');
  if (productBtn) {
    productBtn.addEventListener("click", function () {
      window.location.href = "/products";
    });
  }
}

/**
 * Add a new module card to the dashboard
 * This will be useful when we implement new features
 */
function addModuleCard(title, description, requiresAuth = true, action = null) {
  const moduleCards = document.getElementById("module-cards");

  const card = document.createElement("div");
  card.className = "card";
  if (requiresAuth) {
    card.classList.add("locked");
    card.setAttribute("data-requires-auth", "true");
  }

  const titleEl = document.createElement("h3");
  titleEl.textContent = title;

  const descEl = document.createElement("p");
  descEl.textContent = description;

  card.appendChild(titleEl);
  card.appendChild(descEl);

  if (requiresAuth) {
    const authMessage = document.createElement("p");
    authMessage.className = "auth-required-message";
    authMessage.textContent = "Authentication required";
    card.appendChild(authMessage);
  }

  if (action) {
    const button = document.createElement("button");
    button.className = "btn btn-primary action-btn";
    if (requiresAuth && !AuthService.isAuthenticated()) {
      button.classList.add("hidden");
    }
    button.textContent = "Open";
    button.addEventListener("click", action);
    card.appendChild(button);
  }

  moduleCards.appendChild(card);
}
