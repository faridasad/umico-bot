document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  // Check if user is already logged in
  const sessionToken = localStorage.getItem("sessionToken");
  if (sessionToken) {
    // Redirect to dashboard if session exists
    window.location.href = "/index.html";
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store session token in localStorage
        localStorage.setItem("sessionToken", data.sessionToken);
        localStorage.setItem("username", data.username);

        // Redirect to dashboard
        window.location.href = "/index.html";
      } else {
        // Show error message
        errorMessage.style.display = "block";
      }
    } catch (error) {
      console.error("Login error:", error);
      errorMessage.style.display = "block";
    }
  });
});
