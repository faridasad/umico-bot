// public/js/products.js
// Storage keys
const PRODUCT_OFFERS_KEY = "product_offers";
const PRODUCT_META_KEY = "product_meta";
const PRICE_LIMITS_KEY = "price_limits";

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

  // Add view JSON button to the menu
  addViewJsonButton();

  // Check if we have products in localStorage and display them
  loadProductsFromLocalStorage();

  // Load price limits
  loadPriceLimits();

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

// Add View JSON button to the UI
function addViewJsonButton() {
  const actionContainer = document.querySelector(".product-actions");
  if (actionContainer) {
    const viewJsonBtn = document.createElement("button");
    viewJsonBtn.id = "view-json-btn";
    viewJsonBtn.className = "btn btn-secondary";
    viewJsonBtn.style.marginLeft = "10px";
    viewJsonBtn.textContent = "Qiymət limitlərinə baxın/redaktə edin";
    viewJsonBtn.addEventListener("click", openJsonModal);

    actionContainer.appendChild(viewJsonBtn);
  }
}

// JSON Modal Functions
function openJsonModal() {
  // Fetch the current JSON file content
  fetch("/api/products/min-price-limits")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Format the JSON nicely
        const jsonContent = JSON.stringify(data.limits, null, 2);

        // Set the content in the textarea
        const textarea = document.getElementById("json-content");
        if (textarea) {
          textarea.value = jsonContent;
        }

        // Show the modal
        const modal = document.getElementById("json-modal");
        if (modal) {
          modal.style.display = "block";
        }
      } else {
        showMessage("Qiymət limitləri datasını yükləmək alınmadı", false);
      }
    })
    .catch((error) => {
      console.error("Error loading JSON:", error);
      showMessage("Qiymət limitləri datasını yükləmə xətası", false);
    });
}

function closeJsonModal() {
  const modal = document.getElementById("json-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function saveJsonChanges() {
  const textarea = document.getElementById("json-content");
  if (!textarea) return;

  try {
    // Parse the JSON to validate it
    const jsonData = JSON.parse(textarea.value);

    // TODO: Add endpoint to save the entire JSON file
    // For now, we'll show a message
    showMessage("JSON editing capability is coming soon!", true);
    closeJsonModal();
  } catch (error) {
    showMessage("Invalid JSON format. Please check your edits.", false);
  }
}

// Load price limits from API and store in localStorage
async function loadPriceLimits() {
  try {
    const response = await fetch("/api/products/min-price-limits");

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        // Store the price limits in localStorage
        localStorage.setItem(PRICE_LIMITS_KEY, JSON.stringify(data.limits));
        console.log("Price limits loaded and stored in localStorage");
      }
    }
  } catch (error) {
    console.error("Error loading price limits:", error);
  }
}

// Get price limit for a product from localStorage
function getPriceLimit(productId) {
  try {
    const limitsJson = localStorage.getItem(PRICE_LIMITS_KEY);
    if (limitsJson) {
      const limits = JSON.parse(limitsJson);
      return limits[productId] || null;
    }
  } catch (error) {
    console.error("Error getting price limit from localStorage:", error);
  }
  return null;
}

function setupModalEvents() {
  // Close modal buttons
  document.getElementById("close-modal")?.addEventListener("click", closeUpdateModal);
  document.getElementById("modal-cancel")?.addEventListener("click", closeUpdateModal);

  // Close JSON modal buttons
  document.getElementById("close-json-modal")?.addEventListener("click", closeJsonModal);
  document.getElementById("json-modal-cancel")?.addEventListener("click", closeJsonModal);
  document.getElementById("json-modal-save")?.addEventListener("click", saveJsonChanges);

  // Save changes button
  document.getElementById("modal-save")?.addEventListener("click", saveMinPriceLimit);

  // Set default limit button
  document.getElementById("default-limit-btn")?.addEventListener("click", setDefaultMinPriceLimit);
}

function setDefaultMinPriceLimit() {
  const currentPriceEl = document.getElementById("modal-product-price");
  const minPriceLimitInput = document.getElementById("modal-min-price-limit");

  if (currentPriceEl && minPriceLimitInput) {
    const currentPrice = parseFloat(currentPriceEl.value);
    if (!isNaN(currentPrice)) {
      // Set to 90% of current price
      const defaultLimit = Math.round(currentPrice * 0.9 * 100) / 100; // Round to 2 decimal places
      minPriceLimitInput.value = defaultLimit.toFixed(2);
    }
  }
}

function openUpdateModal(uuid, name, retailPrice, oldPrice, qty) {
  // Get modal elements
  const modal = document.getElementById("update-modal");
  const productNameEl = document.getElementById("modal-product-name");
  const currentPriceEl = document.getElementById("modal-current-price");
  const minPriceLimitInput = document.getElementById("modal-min-price-limit");
  const uuidInput = document.getElementById("modal-product-uuid");
  const priceInput = document.getElementById("modal-product-price");

  // Get the current min price limit
  const currentLimit = getPriceLimit(uuid);

  // Set values
  if (productNameEl) productNameEl.textContent = name;
  if (currentPriceEl) currentPriceEl.textContent = retailPrice.toFixed(2);
  if (minPriceLimitInput) {
    if (currentLimit !== null) {
      minPriceLimitInput.value = currentLimit.toFixed(2);
    } else {
      // Default to 90% of current price if no limit is set
      minPriceLimitInput.value = (retailPrice * 0.9).toFixed(2);
    }
  }
  if (uuidInput) uuidInput.value = uuid;
  if (priceInput) priceInput.value = retailPrice.toString();

  // Show modal
  if (modal) modal.style.display = "block";
}

function closeUpdateModal() {
  const modal = document.getElementById("update-modal");
  if (modal) modal.style.display = "none";
}

/**
 * Save the minimum price limit
 */
async function saveMinPriceLimit() {
  // Get values from form
  const uuid = document.getElementById("modal-product-uuid").value;
  const minPriceLimit = parseFloat(document.getElementById("modal-min-price-limit").value);

  // Validate inputs
  if (!uuid || isNaN(minPriceLimit) || minPriceLimit < 0) {
    showMessage("Yanlış məhsul və ya qiymət limiti", false);
    return;
  }

  try {
    // Show loading
    showLoader();

    // Make API request
    const response = await fetch(`/api/products/min-price-limit/${uuid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ minimumPriceLimit: minPriceLimit }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success) {
        // Close modal
        closeUpdateModal();

        // Update price limit in localStorage
        updateLocalPriceLimit(uuid, minPriceLimit);

        // Refresh products table to show updated limit
        await fetchProducts();

        showMessage("Minimum qiymət limiti uğurla yeniləndi", true);
      } else {
        showMessage(data.message || "Minimum qiymət limitini yeniləmək alınmadı", false);
      }
    } else {
      showMessage("Minimum qiymət limitini yeniləmək alınmadı", false);
    }
  } catch (error) {
    console.error("Error updating minimum price limit:", error);
    showMessage("Minimum qiymət limitini yeniləyərkən xəta baş verdi", false);
  } finally {
    hideLoader();
  }
}

// Update price limit in localStorage
function updateLocalPriceLimit(productId, limit) {
  try {
    const limitsJson = localStorage.getItem(PRICE_LIMITS_KEY);
    let limits = {};

    if (limitsJson) {
      limits = JSON.parse(limitsJson);
    }

    limits[productId] = limit;
    localStorage.setItem(PRICE_LIMITS_KEY, JSON.stringify(limits));
  } catch (error) {
    console.error("Error updating price limit in localStorage:", error);
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
        showMessage(`Keşdən ${offers.length} məhsul yükləndi (${lastUpdated.toLocaleString()})`, true);
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
        showMessage(`${data.totalProducts} məhsul uğurla yükləndi`, true);

        // Also refresh price limits
        loadPriceLimits();
      } else {
        showMessage(data.message || "Məhsulları yükləmək alınmadı", false);
      }
    } else {
      showMessage("Məhsulları yükləmək alınmadı", false);
    }
  } catch (error) {
    console.error("Error loading products:", error);
    showMessage("Məhsulları yükləmə xətası", false);
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
        showMessage("Məhsulları yükləmə xətası", false);
      }
    } else {
      showMessage("Məhsulları yükləmə xətası", false);
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
        <td colspan="8" style="text-align: center; padding: 20px;">Məhsul tapılmadı.</td>
      </tr>
    `;
    return;
  }

  // Load price limits from localStorage
  const limitsJson = localStorage.getItem(PRICE_LIMITS_KEY);
  const priceLimits = limitsJson ? JSON.parse(limitsJson) : {};

  // Add product rows
  products.forEach((product) => {
    const attributes = product.attributes;
    const minPriceLimit = priceLimits[product.id] || null;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="border: 1px solid #ddd; padding: 8px;">${product.id}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${attributes.product.name_az}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${attributes.mpn || "N/A"}</td>
      <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${attributes.retail_price.toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; ${minPriceLimit ? "color: #28a745; font-weight: bold;" : "color: #dc3545;"}">
        ${minPriceLimit ? minPriceLimit.toFixed(2) : "Not set"}
      </td>
      <td style="border: 1px solid #ddd; padding: 8px;">${attributes.qty}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${attributes.product.category_name_az}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">
        <button 
          class="btn btn-primary" 
          style="padding: 5px 10px; font-size: 14px;"
          onclick="openUpdateModal('${product.id}', '${attributes.product.name_az.replace(/'/g, "\\'")}', ${attributes.retail_price}, ${attributes.old_price || 0}, ${attributes.qty})"
        >
          Set Price Limit
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
    showMessage("Lütfən, düzgün düzəliş məbləği daxil edin", false);
    return;
  }

  // Make adjustment negative if decreasing
  if (!isIncrease) {
    adjustment = -adjustment;
  }

  // Confirm with user
  const action = isIncrease ? "increase" : "decrease";
  const confirmMsg = `Bütün məhsul qiymətlərini ${Math.abs(adjustment)} ilə ${action} etmək istədiyinizə əminsiniz? Qiymət məhdudiyyəti olan məhsullar minimum qiymətindən aşağı düşməyəcək.`;

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

    console.log(response);
    

    if (response.ok) {
      const data = await response.json();

      console.log(data);

      if (data.success) {
        // Refresh products
        // await fetchProducts();

        // Detailed message including below-limit information
        let message = data.message;
        if (data.result && data.result.belowLimit > 0) {
          message += ` (${data.result.belowLimit} məhsul qiymət limitlərinə görə buraxıldı)`;
        }

        showMessage(message, true);
      } else {
        showMessage(data.message || "Qiymətləri yeniləmək alınmadı", false);
      }
    } else {
      showMessage("Qiymətləri yeniləmək alınmadı", false);
    }
  } catch (error) {
    console.error("Error updating prices:", error);
    showMessage("Qiymətləri yeniləmək alınmadı", false);
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
      showMessage("Interval 1 ilə 1440 dəqiqə arasında olmalıdır", false);
      return;
    }

    if (adjustment <= 0) {
      showMessage("Tənzimləmə məbləği sıfırdan böyük olmalıdır", false);
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
    if (
      !confirm(
        `Hər ${interval} dəqiqədən bir planlaşdırılmış ${action} ${adjustment} başlasın?\n\nBu, əl ilə dayandırılana qədər davam edəcək. Qiymət məhdudiyyəti olan məhsullar minimum qiymətindən aşağı düşməyəcək.`
      )
    ) {
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
        showMessage(data.message || "İntervalı başlatmaq alınmadı", false);
      }
    } else {
      showMessage("İntervalı başlatmaq alınmadı", false);
    }
  } catch (error) {
    console.error("Error starting schedule:", error);
    showMessage("İntervalı başlatmaq alınmadı", false);
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
        showMessage(data.message || "İntervalı başlatmaq alınmadı", false);
      }
    } else {
      showMessage("İntervalı başlatmaq alınmadı", false);
    }
  } catch (error) {
    console.error("Error stopping schedule:", error);
    showMessage("İntervalı başlatmaq alınmadı", false);
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
      statusText.textContent = schedule.isCurrentlyExecuting ? `Aktiv (İndi Yenilənir)` : `Aktivdir (${schedule.interval} dəq interval)`;
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
        nextUpdateEl.textContent += " (güncəlləmə davam edir)";
      }
    } else if (nextUpdateEl) {
      nextUpdateEl.textContent = "Cari yeniləmə tamamlandıqdan sonra hesablanır...";
    }

    // Last update time
    if (lastUpdateEl) {
      if (schedule.lastRunTime) {
        lastUpdateEl.textContent = formatDateTime(new Date(schedule.lastRunTime));
      } else {
        lastUpdateEl.textContent = "İlk yeniləmə davam edir...";
      }
    }
  } else {
    // Reset all fields for inactive state
    if (statusText) {
      statusText.textContent = "Aktiv deyil";
      statusText.style.color = "#6c757d";
    }
    if (nextUpdateEl) nextUpdateEl.textContent = "-";
    if (lastUpdateEl) lastUpdateEl.textContent = "heç vaxt";
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
      element.textContent = formatDateTime(new Date(targetTime)) + " (indiyə)";
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
    const updateAmout = document.getElementById("update-amount");

    if (adjustmentInput && settings.adjustment) {
      adjustmentInput.value = settings.adjustment;
    }

    if (updateAmout && settings.adjustment) {
      updateAmout.textContent = settings.adjustment;
    }

    const updateDirection = document.getElementById("update-direction");
    if (updateDirection) {
      updateDirection.textContent = settings.action;
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

// Add these functions to products.js

// Global variables for price limits table
let allProducts = [];
let priceLimitsTableData = [];
let currentSortField = "id";
let currentSortDirection = "asc";
let currentFilter = "all";
let searchTerm = "";
let changedPriceLimits = new Map(); // Stores changes made in the table

// Replace the view JSON button with a Price Limits Table button
function addViewJsonButton() {
  const actionContainer = document.querySelector(".product-actions");
  if (actionContainer) {
    const viewPriceLimitsBtn = document.createElement("button");
    viewPriceLimitsBtn.id = "view-price-limits-btn";
    viewPriceLimitsBtn.className = "btn btn-secondary";
    viewPriceLimitsBtn.style.marginLeft = "10px";
    viewPriceLimitsBtn.textContent = "Bütün Qiymət Limitlərini idarə edin";
    viewPriceLimitsBtn.addEventListener("click", openPriceLimitsModal);

    actionContainer.appendChild(viewPriceLimitsBtn);
  }
}

// Open the price limits modal
function openPriceLimitsModal() {
  // Start loading the data
  showLoader();

  // Reset changes tracking
  changedPriceLimits = new Map();

  // Get products from localStorage or fetch if needed
  const offersJson = localStorage.getItem(PRODUCT_OFFERS_KEY);
  const limitsJson = localStorage.getItem(PRICE_LIMITS_KEY);

  // Parse the data
  try {
    allProducts = offersJson ? JSON.parse(offersJson) : [];
    const priceLimits = limitsJson ? JSON.parse(limitsJson) : {};

    // Prepare data for the table
    priceLimitsTableData = allProducts.map((product) => {
      const attributes = product.attributes;
      return {
        id: product.id,
        name: attributes.product.name_az,
        price: attributes.retail_price,
        limit: priceLimits[product.id] || null,
        originalLimit: priceLimits[product.id] || null, // Keep track of original value
      };
    });

    // Set default sort
    currentSortField = "id";
    currentSortDirection = "asc";

    // Render the table
    renderPriceLimitsTable();

    // Show the modal
    const modal = document.getElementById("price-limits-modal");
    if (modal) {
      modal.style.display = "block";
    }

    // Update status
    updatePriceLimitsStatus();

    // Set up sort event listeners
    setupSortListeners();

    // Set up search and filter
    setupSearchAndFilter();

    // Add event listeners for batch actions
    setupBatchActions();
  } catch (error) {
    console.error("Error loading data for price limits table:", error);
    showMessage("Qiymət limitləri datasını yükləmə xətası", false);
  } finally {
    hideLoader();
  }
}

// Close the price limits modal
function closePriceLimitsModal() {
  const modal = document.getElementById("price-limits-modal");
  if (modal) {
    modal.style.display = "none";
  }

  // Check if there are unsaved changes
  if (changedPriceLimits.size > 0) {
    if (confirm("Qiymət limitlərində yadda saxlanmamış dəyişiklikləriniz var. Bu dəyişikliklər ləğv edilsin?")) {
      changedPriceLimits = new Map();
    } else {
      // Reopen modal
      modal.style.display = "block";
      return;
    }
  }
}

// Render the price limits table with current sorting and filtering
function renderPriceLimitsTable() {
  const tableBody = document.getElementById("price-limits-table-body");
  if (!tableBody) return;

  // Clear the table
  tableBody.innerHTML = "";

  // Filter and sort the data
  let filteredData = priceLimitsTableData;

  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredData = filteredData.filter((item) => item.id.toLowerCase().includes(term) || item.name.toLowerCase().includes(term));
  }

  // Apply category filter
  if (currentFilter === "set") {
    filteredData = filteredData.filter((item) => item.limit !== null);
  } else if (currentFilter === "unset") {
    filteredData = filteredData.filter((item) => item.limit === null);
  }

  // Sort the data
  filteredData.sort((a, b) => {
    let valueA = a[currentSortField];
    let valueB = b[currentSortField];

    // Handle nulls for sorting
    if (valueA === null && valueB !== null) return 1;
    if (valueA !== null && valueB === null) return -1;
    if (valueA === null && valueB === null) return 0;

    // String comparison for text fields
    if (currentSortField === "name" || currentSortField === "id") {
      valueA = String(valueA).toLowerCase();
      valueB = String(valueB).toLowerCase();
    }

    // Compare based on direction
    const result = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    return currentSortDirection === "asc" ? result : -result;
  });

  // If no results
  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px;">
          Filtrlərinizə uyğun məhsul tapılmadı.
        </td>
      </tr>
    `;
    return;
  }

  // Render each row
  filteredData.forEach((item) => {
    const row = document.createElement("tr");

    // Check if this item has been changed
    const hasChanged = changedPriceLimits.has(item.id);
    if (hasChanged) {
      row.classList.add("price-limit-changed");
    }

    // Format the current price with 2 decimal places
    const formattedPrice = item.price.toFixed(2);

    // Default limit value (90% of price)
    const defaultLimit = (item.price * 0.9).toFixed(2);

    // Current limit (either from original or changed)
    const currentLimit = hasChanged ? changedPriceLimits.get(item.id) : item.limit;

    row.innerHTML = `
      <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${item.id}</td>
      <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;" title="${item.name}">${item.name.length > 40 ? item.name.substring(0, 40) + "..." : item.name}</td>
      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">${formattedPrice}</td>
      <td class="price-limit-cell" style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd; position: relative;">
        <input 
          type="number" 
          class="price-limit-input" 
          data-product-id="${item.id}"
          value="${currentLimit !== null ? currentLimit : ""}" 
          placeholder="Not set"
          step="0.01"
          min="0"
        />
        <div class="quick-actions">
          <button class="quick-action-btn set-default-limit" data-product-id="${item.id}" data-default="${defaultLimit}">90%</button>
          <button class="quick-action-btn clear-limit" data-product-id="${item.id}">Clear</button>
        </div>
      </td>
      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">
        <button 
          class="btn btn-sm btn-primary save-single-limit" 
          data-product-id="${item.id}" 
          style="padding: 3px 8px; font-size: 12px;"
        >
          Save
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Add listeners to inputs
  setupInputListeners();

  // Add listeners to quick action buttons
  setupQuickActionListeners();

  // Add listeners to save buttons
  setupSaveSingleListeners();
}

// Set up listeners for the input fields
function setupInputListeners() {
  const inputs = document.querySelectorAll(".price-limit-input");
  inputs.forEach((input) => {
    input.addEventListener("change", function () {
      const productId = this.dataset.productId;
      const newValue = this.value.trim() === "" ? null : parseFloat(this.value);

      // Get the relevant item
      const item = priceLimitsTableData.find((p) => p.id === productId);

      // Only track if value actually changed
      if (
        (item.originalLimit === null && newValue !== null) ||
        (item.originalLimit !== null && newValue === null) ||
        (item.originalLimit !== null && newValue !== null && Math.abs(item.originalLimit - newValue) > 0.001)
      ) {
        changedPriceLimits.set(productId, newValue);

        // Highlight the row
        const row = this.closest("tr");
        if (row) row.classList.add("price-limit-changed");
      } else {
        // Value reset to original
        changedPriceLimits.delete(productId);

        // Remove highlight if no longer changed
        const row = this.closest("tr");
        if (row) row.classList.remove("price-limit-changed");
      }

      // Update status
      updatePriceLimitsStatus();
    });
  });
}

// Set up listeners for quick actions buttons
function setupQuickActionListeners() {
  // Set default (90%) button
  const defaultButtons = document.querySelectorAll(".set-default-limit");
  defaultButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.dataset.productId;
      const defaultValue = parseFloat(this.dataset.default);

      // Find the input and update it
      const input = document.querySelector(`.price-limit-input[data-product-id="${productId}"]`);
      if (input) {
        input.value = defaultValue.toFixed(2);

        // Trigger the change event
        const event = new Event("change");
        input.dispatchEvent(event);
      }
    });
  });

  // Clear button
  const clearButtons = document.querySelectorAll(".clear-limit");
  clearButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.dataset.productId;

      // Find the input and clear it
      const input = document.querySelector(`.price-limit-input[data-product-id="${productId}"]`);
      if (input) {
        input.value = "";

        // Trigger the change event
        const event = new Event("change");
        input.dispatchEvent(event);
      }
    });
  });
}

// Set up listeners for save single buttons
function setupSaveSingleListeners() {
  const saveButtons = document.querySelectorAll(".save-single-limit");
  saveButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const productId = this.dataset.productId;
      const input = document.querySelector(`.price-limit-input[data-product-id="${productId}"]`);

      if (!input) return;

      const newValue = input.value.trim() === "" ? null : parseFloat(input.value);

      try {
        // Disable the button and show loading
        this.disabled = true;
        this.innerHTML = "...";

        await savePriceLimit(productId, newValue);

        // Update the data
        const item = priceLimitsTableData.find((p) => p.id === productId);
        if (item) {
          item.limit = newValue;
          item.originalLimit = newValue;
        }

        // Remove from changed map
        changedPriceLimits.delete(productId);

        // Remove highlight
        const row = this.closest("tr");
        if (row) row.classList.remove("price-limit-changed");

        // Update status
        updatePriceLimitsStatus();

        // Show success
        showMessage(`${productId} məhsulu üçün yenilənmiş qiymət limiti`, true);
      } catch (error) {
        console.error("Error saving price limit:", error);
        showMessage("Qiymət limitini yadda saxlamaq xətası", false);
      } finally {
        // Reset button
        this.disabled = false;
        this.innerHTML = "Save";
      }
    });
  });
}

// Set up sort listeners
function setupSortListeners() {
  const headers = document.querySelectorAll("th[data-sort]");
  headers.forEach((header) => {
    header.addEventListener("click", function () {
      const field = this.dataset.sort;

      // Toggle direction if same field, otherwise set to asc
      if (field === currentSortField) {
        currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
      } else {
        currentSortField = field;
        currentSortDirection = "asc";
      }

      // Update sort indicators
      headers.forEach((h) => {
        const icon = h.querySelector(".sort-icon");
        if (h.dataset.sort === currentSortField) {
          icon.textContent = currentSortDirection === "asc" ? "↑" : "↓";
        } else {
          icon.textContent = "";
        }
      });

      // Re-render the table
      renderPriceLimitsTable();
    });
  });
}

// Set up search and filter
function setupSearchAndFilter() {
  const searchInput = document.getElementById("price-limits-search");
  const filterSelect = document.getElementById("price-limits-filter");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchTerm = this.value;
      renderPriceLimitsTable();
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      currentFilter = this.value;
      renderPriceLimitsTable();
    });
  }
}

// Set up batch actions
function setupBatchActions() {
  // Batch update to 90% button
  const batchUpdateBtn = document.getElementById("batch-update-90-percent");
  if (batchUpdateBtn) {
    batchUpdateBtn.addEventListener("click", function () {
      if (confirm("Bütün görünən məhsulları minimum qiymət limiti olaraq cari qiymətinin 90%-nə təyin edin?")) {
        const tableBody = document.getElementById("price-limits-table-body");
        const inputs = tableBody.querySelectorAll(".price-limit-input");

        inputs.forEach((input) => {
          const productId = input.dataset.productId;
          const product = priceLimitsTableData.find((p) => p.id === productId);

          if (product) {
            const defaultLimit = product.price * 0.9;
            input.value = defaultLimit.toFixed(2);

            // Trigger the change event
            const event = new Event("change");
            input.dispatchEvent(event);
          }
        });
      }
    });
  }

  // Save all button
  const saveAllBtn = document.getElementById("save-all-price-limits");
  if (saveAllBtn) {
    saveAllBtn.addEventListener("click", saveAllChanges);
  }

  // Modal save button
  const modalSaveBtn = document.getElementById("price-limits-modal-save");
  if (modalSaveBtn) {
    modalSaveBtn.addEventListener("click", saveAllChanges);
  }

  // Modal cancel button
  const modalCancelBtn = document.getElementById("price-limits-modal-cancel");
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closePriceLimitsModal);
  }

  // Modal close X button
  const closeBtn = document.getElementById("close-price-limits-modal");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePriceLimitsModal);
  }
}

// Save all changes
async function saveAllChanges() {
  if (changedPriceLimits.size === 0) {
    showMessage("No changes to save", false);
    return;
  }

  if (!confirm(`${changedPriceLimits.size} məhsul qiymət limitlərinə edilən dəyişikliklər yadda saxlanılsın?`)) {
    return;
  }

  showLoader();

  try {
    let successCount = 0;
    let failCount = 0;

    // Create a copy to track what's been processed
    const toProcess = new Map(changedPriceLimits);

    // Use Promise.all with a limit on concurrent requests
    const batchSize = 10;
    while (toProcess.size > 0) {
      const batch = Array.from(toProcess.entries()).slice(0, batchSize);

      // Remove this batch from the map
      batch.forEach(([id]) => toProcess.delete(id));

      // Process this batch in parallel
      const results = await Promise.allSettled(
        batch.map(async ([id, limit]) => {
          try {
            await savePriceLimit(id, limit);

            // Update the data
            const item = priceLimitsTableData.find((p) => p.id === id);
            if (item) {
              item.limit = limit;
              item.originalLimit = limit;
            }

            return { id, success: true };
          } catch (error) {
            console.error(`Error saving price limit for ${id}:`, error);
            return { id, success: false, error };
          }
        })
      );

      // Count successes and failures
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      });
    }

    // Clear all successfully processed changes
    changedPriceLimits.clear();

    // Re-render the table
    renderPriceLimitsTable();

    // Show message
    if (failCount === 0) {
      showMessage(`${successCount} qiymət limitləri uğurla yeniləndi`, true);

      // Also refresh price limits in localStorage
      await loadPriceLimits();

      // Close modal if all successful
      closePriceLimitsModal();
    } else {
      showMessage(`${successCount} qiymət limitləri yeniləndi, ${failCount} yenilənmədi`, false);
    }
  } catch (error) {
    console.error("Error saving price limits:", error);
    showMessage("Qiymət limitlərini yadda saxlamaq xətası", false);
  } finally {
    hideLoader();
    updatePriceLimitsStatus();
  }
}

// Update the status display
function updatePriceLimitsStatus() {
  const statusEl = document.getElementById("price-limits-status");
  if (!statusEl) return;

  let statusText = `${priceLimitsTableData.length} məhsul yükləndi`;

  if (changedPriceLimits.size > 0) {
    statusText += `, ${changedPriceLimits.size} dəyişiklikləri gözlənilir`;
  }

  statusEl.textContent = statusText;
}

// Save a single price limit
async function savePriceLimit(productId, limit) {
  // Get product name for the API call (helps with server-side logging)
  const product = priceLimitsTableData.find((p) => p.id === productId);
  const name = product ? product.name : productId;

  const response = await fetch(`/api/products/min-price-limit/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ minimumPriceLimit: limit }),
  });

  if (!response.ok) {
    throw new Error(`${name} üçün qiymət limitini yeniləmək alınmadı`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || `${name} üçün qiymət limitini yeniləmək alınmadı`);
  }

  // Update in localStorage
  updateLocalPriceLimit(productId, limit);

  return data;
}
