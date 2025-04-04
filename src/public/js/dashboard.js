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

  // Check for authenticated state and fetch data if authenticated
  if (AuthService.isAuthenticated()) {
    fetchDashboardData();
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
