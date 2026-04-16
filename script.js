/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

const STORAGE_KEY = "selectedProducts";

let selectedProducts = loadSelectedProductsFromStorage();

const selectedContainer = document.getElementById("selectedProductsList");

const workerUrl = "https://loreal-openai-api.jennywang745.workers.dev/";

const clearBtn = document.getElementById("clearSelections");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (p) => p.id == product.id
      );

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>

            <button class="toggle-desc-btn">View Details</button>

            <div class="product-description">
              ${product.description || "No description available."}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".toggle-desc-btn")) return;

      const productId = card.getAttribute("data-id");

      toggleProductSelection(productId);
    });
  });

  document.querySelectorAll(".toggle-desc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const desc = btn.nextElementSibling;

      desc.classList.toggle("show");

      btn.textContent = desc.classList.contains("show")
        ? "Hide Details"
        : "View Details";
    });
  });
}

function toggleProductSelection(productId) {
  const product = currentProducts.find((p) => p.id == productId);
  
  const exists = selectedProducts.find((p) => p.id == productId);

  if (exists) {
    selectedProducts = selectedProducts.filter((p) => p.id != productId);
  } else {
    selectedProducts.push(product);
  }

  displayProducts(currentProducts);

  renderSelectedProducts();

  saveSelectedProducts();
}

function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedContainer.innerHTML = "<p>No products selected</p>";

    return;
  }

  selectedContainer.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item" data-id="${product.id}">
        <span>${product.name}</span>
        <button class="remove-btn">Remove</button>
      </div>
    `,
    )

    .join("");

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.parentElement.getAttribute("data-id");

      removeSelectedProduct(id);
    });
  });
}

function removeSelectedProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id != productId);

  saveSelectedProducts();
  
  renderSelectedProducts();

  displayProducts(currentProducts);

  categoryFilter.dispatchEvent(new Event("change"));
}

function saveSelectedProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

function loadSelectedProductsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  
  return data ? JSON.parse(data) : [];
}

clearBtn.addEventListener("click", () => {
  selectedProducts = [];

  localStorage.removeItem(STORAGE_KEY);

  renderSelectedProducts();
  
  displayProducts(currentProducts);
  
  document.querySelectorAll(".product-card").forEach(card => {
    card.classList.remove("selected");
  });
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  currentProducts = filteredProducts;

  displayProducts(filteredProducts);
});

async function sendMessage() {
  const message = "You: " + userInput.value.trim() + "\n\n";

  if (!message) return;

  addMessage(message, "user");
  userInput.value = "";

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({
          messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: message }
          ],
      })
    });

    const data = await response.json();
    const botReply = data.choices[0].message.content + "\n\n";

    addMessage(botReply, "bot");

  } 

  catch (error) {
    addMessage("Sorry, something went wrong. Please try again.", "bot");
    console.error(error);
  }
}

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?\n";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  sendMessage();
  // When using Cloudflare, you'll need to POST a `messages` array in the body,
  // and handle the response using: data.choices[0].message.content

  // Show message
  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});
