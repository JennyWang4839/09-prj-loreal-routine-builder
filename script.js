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

const userInput = document.getElementById("userInput");

let conversationHistory = [];

const generateBtn = document.getElementById("generateRoutine");

const searchInput = document.getElementById("searchInput");

let allProducts = [];

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
categoryFilter.addEventListener("change", async () => {
  const products = await loadProducts();

  currentProducts = applyFilters(products);

  displayProducts(currentProducts);
});

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = sender;

  div.innerText = text; // IMPORTANT: keeps formatting readable
  div.style.whiteSpace = "pre-wrap";
  div.style.lineHeight = "1.6";
  div.style.marginBottom = "12px";

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
  const rawMessage = userInput.value.trim();
  if (!rawMessage) return;

  addMessage(rawMessage, "user");
  userInput.value = "";

  conversationHistory.push({
    role: "user",
    content: rawMessage
  });

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `
              You are a beauty assistant.

              Rules:
              - Only answer skincare, haircare, makeup, fragrance, grooming
              - Stay consistent with earlier routine if provided
              - Use conversation history for context
              `
          },
          ...conversationHistory
        ]
      })
    });

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content: botReply
    });

    addMessage(botReply, "bot");

  } catch (error) {
    console.error(error);
    addMessage("Sorry, something went wrong.", "bot");
  }
}

generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("Please select at least one product.", "bot");
    return;
  }

  const payload = selectedProducts.map(p => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description
  }));

  const systemPrompt = `
    You are a professional beauty advisor.

    Create a personalized routine using ONLY the provided products.

    Rules:
    - Use ONLY the products provided
    - Organize into morning/evening steps
    - Explain order of use
    - Keep it simple and practical
    - If products are insufficient, suggest gaps briefly
    `;

  conversationHistory.push({
    role: "user",
    content: JSON.stringify(payload)
  });

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory
        ]
      })
    });

    const data = await response.json();
    const routine = data.choices[0].message.content;

    console.log(data.choices[0].message.content);

    conversationHistory.push({
      role: "assistant",
      content: routine
    });

    addMessage("✨ Your Personalized Routine:\n\n" + routine, "bot");

    chatWindow.scrollTop = chatWindow.scrollHeight;

  } 
  
  catch (err) {
    console.error(err);
    addMessage("Failed to generate routine. Try again.", "bot");
  }
});

function applyFilters(products) {
  const category = categoryFilter.value;
  const query = searchInput.value.toLowerCase().trim();

  return products.filter(product => {
    const matchesCategory = category ? product.category === category : true;

    const matchesSearch = query
      ? product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      : true;

    return matchesCategory && matchesSearch;
  });
}

async function initProducts() {
  const data = await loadProducts();
  allProducts = data;
  currentProducts = data;
}

function applyFilters() {
  const category = categoryFilter.value;
  const query = searchInput.value.toLowerCase().trim();

  return allProducts.filter(product => {
    const matchesCategory = category ? product.category === category : true;

    const matchesSearch = query
      ? product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      : true;

    return matchesCategory && matchesSearch;
  });
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault(); // stops page reload
  sendMessage();
});

userInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
      sendMessage();
  }
});

searchInput.addEventListener("input", async () => {
  const products = await loadProducts();

  currentProducts = applyFilters(products);
  displayProducts(currentProducts);
});

initProducts();