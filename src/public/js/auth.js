// public/js/auth.js
// Global auth state
let isAuthenticated = false;

document.addEventListener("DOMContentLoaded", function () {
  const sessionToken = localStorage.getItem("sessionToken");
  if (!sessionToken) {
    // Redirect to login page if no session exists
    window.location.href = "/login.html";
    return;
  }

  // Check if user is already authenticated
  checkAuthStatus();

  // Login button
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin);
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});

/**
 * Check authentication status and update UI accordingly
 */
async function checkAuthStatus() {
  try {
    const response = await fetch("/auth/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionToken: localStorage.getItem("sessionToken") }),
    });
    const data = await response.json();

    isAuthenticated = data.isAuthenticated;
    if (!isAuthenticated) {
      window.location.href = "/login.html";
      return;
    }
    updateAuthUI(isAuthenticated);
  } catch (error) {
    console.error("Error checking auth status:", error);
    updateAuthUI(false);
  }
}

/**
 * Handle login button click - triggers server-side authentication
 */
async function handleLogin() {
  try {
    // Show loading state
    const loginBtn = document.getElementById("login-btn");
    loginBtn.textContent = "Signing in...";
    loginBtn.disabled = true;

    const response = await fetch("/auth/trigger-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Empty JSON body
    });

    const data = await response.json();

    if (data.success) {
      isAuthenticated = true;
      updateAuthUI(true);
    } else {
      isAuthenticated = false;
      updateAuthUI(false);
      showStatusMessage(data.message || "Authentication failed", false);
    }
  } catch (error) {
    console.error("Login error:", error);
    isAuthenticated = false;
    updateAuthUI(false);
    showStatusMessage("An error occurred. Please try again.", false);
  } finally {
    // Reset button
    const loginBtn = document.getElementById("login-btn");
    loginBtn.textContent = "Sign In";
    loginBtn.disabled = false;
  }
}

/**
 * Handle logout button click
 */
async function handleLogout() {
  try {
    const response = await fetch("/auth/sign-out", {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      isAuthenticated = false;
      updateAuthUI(false);
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

/**
 * Update UI elements based on authentication state
 */
function updateAuthUI(authenticated) {
  // Update status message
  const authStatusMessage = document.getElementById("auth-status-message");
  const authStatusSpan = document.getElementById("auth-status");

  if (authenticated) {
    if (authStatusMessage) {
      authStatusMessage.textContent = "Status: Authenticated";
    }
    if (authStatusSpan) {
      authStatusSpan.textContent = "Authenticated";
    }
    showStatusMessage("Successfully authenticated!", true);
  } else {
    if (authStatusMessage) {
      authStatusMessage.textContent = "Status: Not authenticated";
    }
    if (authStatusSpan) {
      authStatusSpan.textContent = "Not authenticated";
    }
  }

  // Toggle login/logout buttons
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn) {
    loginBtn.classList.toggle("hidden", authenticated);
  }
  if (logoutBtn) {
    logoutBtn.classList.toggle("hidden", !authenticated);
  }

  // Update modules that require authentication
  updateAuthenticatedModules(authenticated);
}

/**
 * Show a status message
 */
function showStatusMessage(message, isSuccess) {
  const statusElement = document.getElementById("auth-status-message");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.style.color = isSuccess ? "#28a745" : "#dc3545";

  // Reset after a delay
  setTimeout(() => {
    statusElement.textContent = `Status: ${isAuthenticated ? "Authenticated" : "Not authenticated"}`;
    statusElement.style.color = "";
  }, 3000);
}

/**
 * Update modules that require authentication
 */
function updateAuthenticatedModules(authenticated) {
  // Find all locked cards
  const lockedCards = document.querySelectorAll('.card[data-requires-auth="true"]');

  lockedCards.forEach((card) => {
    // Get auth message and action button
    const authMessage = card.querySelector(".auth-required-message");
    const actionBtn = card.querySelector(".action-btn");

    if (authenticated) {
      // Remove locked state and show action button
      card.classList.remove("locked");
      if (authMessage) authMessage.classList.add("hidden");
      if (actionBtn) actionBtn.classList.remove("hidden");
    } else {
      // Add locked state and hide action button
      card.classList.add("locked");
      if (authMessage) authMessage.classList.remove("hidden");
      if (actionBtn) actionBtn.classList.add("hidden");
    }
  });
}

// Expose isAuthenticated to other scripts
window.AuthService = {
  isAuthenticated: function () {
    return isAuthenticated;
  },
};
