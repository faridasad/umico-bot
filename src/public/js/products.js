// public/js/products.js
// Storage keys
const PRODUCT_OFFERS_KEY = "product_offers";
const PRODUCT_META_KEY = "product_meta";

document.addEventListener("DOMContentLoaded", function () {
  // Check auth status
  checkAuthStatus();

  // Set up load products button
  const loadProductsBtn = document.getElementById("load-products-btn");
  if (loadProductsBtn) {
    loadProductsBtn.addEventListener("click", loadAllProducts);
  }

  setupModalEvents();
  setupBulkPriceButtons();
  initSchedulerUI();

  // Check if we have products in localStorage and display them
  loadProductsFromLocalStorage();

  const priceAdjustment = document.getElementById("price-adjustment");
  if (priceAdjustment) {
    priceAdjustment.addEventListener("change", function () {
      updateScheduleAmountDisplay();
      // Save settings when adjustment changes
      saveScheduleSettings();
    });
  }

  // Add event listeners for interval and action changes
  const intervalInput = document.getElementById("update-interval");
  if (intervalInput) {
    intervalInput.addEventListener("change", saveScheduleSettings);
  }

  const radioButtons = document.getElementsByName("price-action");
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", saveScheduleSettings);
  });
});

function setupModalEvents() {
  // Close modal buttons
  document.getElementById("close-modal")?.addEventListener("click", closeUpdateModal);
  document.getElementById("modal-cancel")?.addEventListener("click", closeUpdateModal);

  // Save changes button
  document.getElementById("modal-save")?.addEventListener("click", saveProductChanges);
}

function openUpdateModal(uuid, name, retailPrice, oldPrice, qty) {
  // Get modal elements
  const modal = document.getElementById("update-modal");
  const productNameEl = document.getElementById("modal-product-name");
  const retailPriceInput = document.getElementById("modal-retail-price");
  const oldPriceInput = document.getElementById("modal-old-price");
  const qtyInput = document.getElementById("modal-qty");
  const uuidInput = document.getElementById("modal-product-uuid");

  // Set values
  if (productNameEl) productNameEl.textContent = name;
  if (retailPriceInput) retailPriceInput.value = retailPrice.toFixed(2);
  if (oldPriceInput) oldPriceInput.value = oldPrice > 0 ? oldPrice.toFixed(2) : "";
  if (qtyInput) qtyInput.value = qty.toString();
  if (uuidInput) uuidInput.value = uuid;

  // Show modal
  if (modal) modal.style.display = "block";
}

function closeUpdateModal() {
  const modal = document.getElementById("update-modal");
  if (modal) modal.style.display = "none";
}

/**
 * Save the product changes
 */
async function saveProductChanges() {
  // Get values from form
  const uuid = document.getElementById("modal-product-uuid").value;
  const retailPrice = parseFloat(document.getElementById("modal-retail-price").value);
  const oldPriceInput = document.getElementById("modal-old-price");
  const qtyInput = document.getElementById("modal-qty");

  // Validate inputs
  if (!uuid || isNaN(retailPrice)) {
    showMessage("Invalid product or price", false);
    return;
  }

  // Prepare update data
  const updateData = {
    retail_price: retailPrice,
  };

  // Add old price if provided
  if (oldPriceInput && oldPriceInput.value.trim() !== "") {
    updateData.old_price = parseFloat(oldPriceInput.value);
  }

  // Add quantity if provided
  if (qtyInput && qtyInput.value.trim() !== "") {
    updateData.qty = parseInt(qtyInput.value);
  }

  try {
    // Show loading
    showLoader();

    // Make API request
    const response = await fetch(`/api/products/${uuid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        // Close modal
        closeUpdateModal();

        // Refresh products
        await fetchProducts();

        showMessage("Product updated successfully", true);
      } else {
        showMessage(data.message || "Failed to update product", false);
      }
    } else {
      showMessage("Failed to update product", false);
    }
  } catch (error) {
    console.error("Error updating product:", error);
    showMessage("Error updating product", false);
  } finally {
    hideLoader();
  }
}

/**
 * Load products from localStorage if available
 */
function loadProductsFromLocalStorage() {
  try {
    const offersJson = localStorage.getItem(PRODUCT_OFFERS_KEY);
    const metaJson = localStorage.getItem(PRODUCT_META_KEY);

    if (offersJson && metaJson) {
      const offers = JSON.parse(offersJson);
      const meta = JSON.parse(metaJson);

      if (offers.length > 0) {
        renderProductsTable(offers);
        updateProductsCount(offers.length);

        const lastUpdated = new Date(meta.lastUpdated);
        showMessage(`Loaded ${offers.length} products from cache (${lastUpdated.toLocaleString()})`, true);
      }
    }
  } catch (error) {
    console.error("Error loading products from localStorage:", error);
  }
}

/**
 * Save products to localStorage
 */
function saveProductsToLocalStorage(products, meta) {
  try {
    localStorage.setItem(PRODUCT_OFFERS_KEY, JSON.stringify(products));
    localStorage.setItem(PRODUCT_META_KEY, JSON.stringify(meta));
    console.log("Products saved to localStorage");
  } catch (error) {
    console.error("Error saving to localStorage:", error);

    // If localStorage is full, try to save only essential data
    try {
      // Only save essential fields to reduce storage size
      const reducedProducts = products.map((offer) => ({
        id: offer.id,
        attributes: {
          uuid: offer.attributes.uuid,
          mpn: offer.attributes.mpn,
          retail_price: offer.attributes.retail_price,
          old_price: offer.attributes.old_price,
          qty: offer.attributes.qty,
          product: {
            name_az: offer.attributes.product.name_az,
            name_ru: offer.attributes.product.name_ru,
            category_id: offer.attributes.product.category_id,
            category_name_az: offer.attributes.product.category_name_az,
          },
        },
      }));

      localStorage.setItem(PRODUCT_OFFERS_KEY, JSON.stringify(reducedProducts));
      localStorage.setItem(PRODUCT_META_KEY, JSON.stringify(meta));
      console.log("Saved reduced product data to localStorage");
    } catch (e) {
      console.error("Failed to save even reduced data to localStorage:", e);
      // Clear localStorage as a last resort
      localStorage.removeItem(PRODUCT_OFFERS_KEY);
      localStorage.removeItem(PRODUCT_META_KEY);
    }
  }
}

/**
 * Load all products from the API
 */
async function loadAllProducts() {
  showLoader();

  try {
    const response = await fetch("/api/products/load", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Empty JSON body
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        // After loading, fetch products
        fetchProducts();
        showMessage(`Successfully loaded ${data.totalProducts} products`, true);
      } else {
        showMessage(data.message || "Failed to load products", false);
      }
    } else {
      showMessage("Failed to load products", false);
    }
  } catch (error) {
    console.error("Error loading products:", error);
    showMessage("Error loading products", false);
  }
}

/**
 * Fetch products from the API
 */
async function fetchProducts() {
  try {
    const response = await fetch("/api/products");

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        renderProductsTable(data.products);
        updateProductsCount(data.totalProducts);

        // Save products to localStorage for future use
        saveProductsToLocalStorage(data.products, {
          lastUpdated: data.lastUpdated,
          totalProducts: data.totalProducts,
        });
      } else {
        showMessage("Failed to fetch products", false);
      }
    } else {
      showMessage("Failed to fetch products", false);
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    showMessage("Error fetching products", false);
  } finally {
    hideLoader();
  }
}

/**
 * Render products in the table
 */
function renderProductsTable(products) {
  const tableBody = document.getElementById("products-table-body");

  if (!tableBody) return;

  // Clear existing rows
  tableBody.innerHTML = "";

  if (products.length === 0) {
    tableBody.innerHTML = `
          <tr>
              <td colspan="8" style="text-align: center; padding: 20px;">No products found.</td>
          </tr>
      `;
    return;
  }

  // Add product rows
  products.forEach((product) => {
    const attributes = product.attributes;

    const row = document.createElement("tr");
    row.innerHTML = `
          <td style="border: 1px solid #ddd; padding: 8px;">${product.id}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attributes.product.name_az}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attributes.mpn || "N/A"}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${attributes.retail_price.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-decoration: line-through;">${attributes.old_price ? attributes.old_price.toFixed(2) : "-"}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attributes.qty}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${attributes.product.category_name_az}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">
              <button 
                  class="btn btn-primary" 
                  style="padding: 5px 10px; font-size: 14px;"
                  onclick="openUpdateModal('${product.id}', '${attributes.product.name_az.replace(/'/g, "\\'")}', ${attributes.retail_price}, ${attributes.old_price || 0}, ${attributes.qty})"
              >
                  Update Price
              </button>
          </td>
      `;

    tableBody.appendChild(row);
  });
}

/**
 * Update products count display
 */
function updateProductsCount(count) {
  const countElement = document.getElementById("products-count");

  if (countElement) {
    countElement.textContent = `${count} products`;
  }
}

/**
 * Show message
 */
function showMessage(message, isSuccess) {
  const statusElement = document.getElementById("auth-status-message");

  if (statusElement) {
    statusElement.textContent = message;
    statusElement.style.color = isSuccess ? "#28a745" : "#dc3545";

    // Reset after a delay
    setTimeout(() => {
      statusElement.textContent = `Status: ${window.AuthService.isAuthenticated() ? "Authenticated" : "Not authenticated"}`;
      statusElement.style.color = "";
    }, 3000);
  }
}

/**
 * Show loader
 */
function showLoader() {
  const loader = document.getElementById("loader");

  if (loader) {
    loader.classList.remove("hidden");
  }

  // Disable load button
  const loadBtn = document.getElementById("load-products-btn");
  if (loadBtn) {
    loadBtn.disabled = true;
  }
}

/**
 * Hide loader
 */
function hideLoader() {
  const loader = document.getElementById("loader");

  if (loader) {
    loader.classList.add("hidden");
  }

  // Enable load button
  const loadBtn = document.getElementById("load-products-btn");
  if (loadBtn) {
    loadBtn.disabled = false;
  }
}

function setupBulkPriceButtons() {
  const increaseBtn = document.getElementById("increase-all-prices");
  const decreaseBtn = document.getElementById("decrease-all-prices");

  if (increaseBtn) {
    increaseBtn.addEventListener("click", function () {
      bulkUpdatePrices(true);
    });
  }

  if (decreaseBtn) {
    decreaseBtn.addEventListener("click", function () {
      bulkUpdatePrices(false);
    });
  }
}

async function bulkUpdatePrices(isIncrease) {
  // Get adjustment amount
  const adjustmentInput = document.getElementById("price-adjustment");
  if (!adjustmentInput) return;

  let adjustment = parseFloat(adjustmentInput.value);
  if (isNaN(adjustment)) {
    showMessage("Please enter a valid adjustment amount", false);
    return;
  }

  // Make adjustment negative if decreasing
  if (!isIncrease) {
    adjustment = -adjustment;
  }

  // Confirm with user
  const action = isIncrease ? "increase" : "decrease";
  const confirmMsg = `Are you sure you want to ${action} all product prices by ${Math.abs(adjustment)}?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  // Show loading
  showLoader();

  try {
    // Make API request
    const response = await fetch("/api/products/bulk-update-prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adjustment }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        // Refresh products
        await fetchProducts();

        showMessage(data.message, true);
      } else {
        showMessage(data.message || "Failed to update prices", false);
      }
    } else {
      showMessage("Failed to update prices", false);
    }
  } catch (error) {
    console.error("Error updating prices:", error);
    showMessage("Error updating prices", false);
  } finally {
    hideLoader();
  }
}

const SCHEDULER_STATUS_CHECK_INTERVAL = 15000;
let statusCheckInterval = null;
let schedulePulseInterval = null;

// Initialize scheduler UI
function initSchedulerUI() {
  // Show the status section initially hidden
  const statusSection = document.getElementById("schedule-status");
  if (statusSection) {
    statusSection.style.display = "none";
  }

  loadScheduleSettings();

  // Set up buttons
  setupSchedulerButtons();

  // Check initial status
  checkScheduleStatus();
}

// Set up scheduler button handlers
function setupSchedulerButtons() {
  const startBtn = document.getElementById("start-schedule-btn");
  const stopBtn = document.getElementById("stop-schedule-btn");

  if (startBtn) {
    startBtn.addEventListener("click", startSchedule);
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", stopSchedule);
  }
}

function updateScheduleAmountDisplay() {
  const adjustment = parseFloat(document.getElementById("price-adjustment").value) || 0.01;
  const amountElement = document.getElementById("update-amount");

  if (amountElement) {
    amountElement.textContent = adjustment;
  }
}

// Check the current schedule status
async function checkScheduleStatus() {
  try {
    const response = await fetch("/api/scheduler/status");

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        const hasActiveSchedule = data.hasActiveSchedule && data.schedule;
        updateScheduleUI(data.schedule, hasActiveSchedule);

        // Show or hide status section based on whether there's an active schedule
        const statusSection = document.getElementById("schedule-status");
        if (statusSection) {
          statusSection.style.display = hasActiveSchedule ? "block" : "none";
        }

        // Start or stop regular status checks based on schedule state
        if (hasActiveSchedule && !statusCheckInterval) {
          statusCheckInterval = setInterval(checkScheduleStatus, SCHEDULER_STATUS_CHECK_INTERVAL);
          startSchedulePulse();
        } else if (!hasActiveSchedule && statusCheckInterval) {
          clearInterval(statusCheckInterval);
          statusCheckInterval = null;
          stopSchedulePulse();
        }
      }
    }
  } catch (error) {
    console.error("Error checking schedule status:", error);
  }
}

// Start a schedule
async function startSchedule() {
  try {
    // Get values from UI
    const interval = parseInt(document.getElementById("update-interval").value) || 60;
    const adjustment = parseFloat(document.getElementById("price-adjustment").value) || 0.01;

    // Validate inputs
    if (interval < 1 || interval > 1440) {
      showMessage("Interval must be between 1 and 1440 minutes", false);
      return;
    }

    if (adjustment <= 0) {
      showMessage("Adjustment amount must be greater than zero", false);
      return;
    }

    // Get selected action (increase or decrease)
    let action = "increase";
    const radioButtons = document.getElementsByName("price-action");
    for (const radio of radioButtons) {
      if (radio.checked) {
        action = radio.value;
        break;
      }
    }

    // Confirm with user
    if (!confirm(`Start scheduled ${action} of ${adjustment} every ${interval} minutes?\n\nThis will run until manually stopped.`)) {
      return;
    }

    saveScheduleSettings();

    // Show loading
    showLoader();

    // Send request to server
    const response = await fetch("/api/scheduler/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        interval,
        adjustment,
        action,
        runImmediately: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        showMessage(`Schedule started: ${data.message}`, true);

        // Update schedule display
        const amountElement = document.getElementById("update-amount");
        const directionElement = document.getElementById("update-direction");

        if (amountElement) amountElement.textContent = adjustment;
        if (directionElement) directionElement.textContent = action;

        checkScheduleStatus(); // Update UI
      } else {
        showMessage(data.message || "Failed to start schedule", false);
      }
    } else {
      showMessage("Failed to start schedule", false);
    }
  } catch (error) {
    console.error("Error starting schedule:", error);
    showMessage("Error starting schedule", false);
  } finally {
    hideLoader();
  }
}

// Stop a schedule
async function stopSchedule() {
  try {
    // Confirm with user
    if (!confirm("Stop the scheduled price updates?\n\nThis will cancel all future updates.")) {
      return;
    }

    // Show loading
    showLoader();

    // Send request to server
    const response = await fetch("/api/scheduler/stop", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        showMessage(data.message, true);

        // Hide the status section
        const statusSection = document.getElementById("schedule-status");
        if (statusSection) {
          statusSection.style.display = "none";
        }

        checkScheduleStatus(); // Update UI
      } else {
        showMessage(data.message || "Failed to stop schedule", false);
      }
    } else {
      showMessage("Failed to stop schedule", false);
    }
  } catch (error) {
    console.error("Error stopping schedule:", error);
    showMessage("Error stopping schedule", false);
  } finally {
    hideLoader();
  }
}

// Update the UI based on schedule status
function updateScheduleUI(schedule, isActive) {
  const startBtn = document.getElementById("start-schedule-btn");
  const stopBtn = document.getElementById("stop-schedule-btn");
  const statusText = document.getElementById("schedule-status-text");
  const nextUpdateEl = document.getElementById("next-update-time");
  const lastUpdateEl = document.getElementById("last-update-time");
  const bulkUpdateBtns = [document.getElementById("increase-all-prices"), document.getElementById("decrease-all-prices")];

  // Update button states
  if (startBtn) startBtn.disabled = isActive;
  if (stopBtn) stopBtn.disabled = !isActive;

  // Update bulk update buttons based on schedule state
  bulkUpdateBtns.forEach((btn) => {
    if (btn) btn.disabled = isActive;
  });

  // Update status text and timing information
  if (isActive && schedule) {
    // Status text
    if (statusText) {
      statusText.textContent = schedule.isCurrentlyExecuting ? `Active (Updating Now)` : `Active (${schedule.interval} min intervals)`;
      statusText.style.color = "#28a745";
    }

    // Next update time
    if (nextUpdateEl && schedule.nextRunTime) {
      const nextTime = new Date(schedule.nextRunTime);
      nextUpdateEl.textContent = formatDateTime(nextTime);

      // Start countdown if not currently executing
      if (!schedule.isCurrentlyExecuting) {
        startCountdown(nextUpdateEl, nextTime);
      } else {
        nextUpdateEl.textContent += " (update in progress)";
      }
    } else if (nextUpdateEl) {
      nextUpdateEl.textContent = "Calculating after current update completes...";
    }

    // Last update time
    if (lastUpdateEl) {
      if (schedule.lastRunTime) {
        lastUpdateEl.textContent = formatDateTime(new Date(schedule.lastRunTime));
      } else {
        lastUpdateEl.textContent = "First update in progress...";
      }
    }
  } else {
    // Reset all fields for inactive state
    if (statusText) {
      statusText.textContent = "Not active";
      statusText.style.color = "#6c757d";
    }
    if (nextUpdateEl) nextUpdateEl.textContent = "-";
    if (lastUpdateEl) lastUpdateEl.textContent = "Never";
  }
}

// Format date and time nicely
function formatDateTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " on " + date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Start a countdown display
let countdownInterval = null;
function startCountdown(element, targetTime) {
  // Clear any existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update immediately
  updateCountdown();

  // Update every second
  countdownInterval = setInterval(updateCountdown, 1000);

  function updateCountdown() {
    const now = new Date();
    const timeDiff = new Date(targetTime).getTime() - now.getTime();

    if (timeDiff <= 0) {
      // Time has passed
      element.textContent = formatDateTime(new Date(targetTime)) + " (due now)";
      clearInterval(countdownInterval);

      // Check status again after a short delay to get updated time
      setTimeout(checkScheduleStatus, 5000);
      return;
    }

    // Calculate remaining time
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    // Display countdown with formatted target time
    element.textContent = formatDateTime(new Date(targetTime)) + ` (in ${minutes}m ${seconds}s)`;
  }
}

// Start pulse animation for active schedule
function startSchedulePulse() {
  const indicator = document.getElementById("schedule-indicator");
  if (!indicator) return;

  // Show indicator
  indicator.style.display = "inline-block";

  // Stop any existing pulse interval
  if (schedulePulseInterval) {
    clearInterval(schedulePulseInterval);
  }

  // Set up pulse animation
  let pulseState = true;
  schedulePulseInterval = setInterval(() => {
    pulseState = !pulseState;
    indicator.style.opacity = pulseState ? "1" : "0.3";
  }, 1000);
}

// Stop pulse animation
function stopSchedulePulse() {
  if (schedulePulseInterval) {
    clearInterval(schedulePulseInterval);
    schedulePulseInterval = null;
  }

  const indicator = document.getElementById("schedule-indicator");
  if (indicator) {
    indicator.style.display = "none";
  }
}

const SCHEDULE_SETTINGS_KEY = "price_schedule_settings";

// Save schedule settings to localStorage
function saveScheduleSettings() {
  try {
    const interval = parseInt(document.getElementById("update-interval").value) || 60;
    const adjustment = parseFloat(document.getElementById("price-adjustment").value) || 0.01;

    // Get selected action (increase or decrease)
    let action = "increase";
    const radioButtons = document.getElementsByName("price-action");
    for (const radio of radioButtons) {
      if (radio.checked) {
        action = radio.value;
        break;
      }
    }

    // Create settings object
    const settings = {
      interval,
      adjustment,
      action,
      lastSaved: new Date().toISOString(),
    };

    // Store in localStorage
    localStorage.setItem(SCHEDULE_SETTINGS_KEY, JSON.stringify(settings));
    console.log("Saved schedule settings to localStorage:", settings);
  } catch (error) {
    console.error("Error saving settings to localStorage:", error);
  }
}

// Load schedule settings from localStorage
function loadScheduleSettings() {
  try {
    const savedSettings = localStorage.getItem(SCHEDULE_SETTINGS_KEY);
    if (!savedSettings) return false;

    const settings = JSON.parse(savedSettings);
    console.log("Loaded schedule settings from localStorage:", settings);

    // Apply interval
    const intervalInput = document.getElementById("update-interval");
    if (intervalInput && settings.interval) {
      intervalInput.value = settings.interval;
    }

    // Apply adjustment amount
    const adjustmentInput = document.getElementById("price-adjustment");
    if (adjustmentInput && settings.adjustment) {
      adjustmentInput.value = settings.adjustment;
    }

    // Apply action (increase/decrease)
    if (settings.action) {
      const radioButtons = document.getElementsByName("price-action");
      for (const radio of radioButtons) {
        if (radio.value === settings.action) {
          radio.checked = true;
          break;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error loading settings from localStorage:", error);
    return false;
  }
}
