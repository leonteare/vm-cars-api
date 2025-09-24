const API_URL = "https://leonteare.github.io/vm-cars-api/cars.json";
const PAGE_SIZE = 40;
const VERSION = "v1.3";

let cars = [];
let makes = [];
let filteredCars = [];
let currentIndex = 0;

// Track selected values (updated by dropdowns, applied on Search)
let selectedMake = "";
let selectedFuel = "";

// -------- Helpers --------

// Title Case
function toTitleCase(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Format make with exceptions
function formatMake(str) {
  if (!str) return "";
  const upperCaseMakes = ["bmw", "fiat", "dfsk"];
  const lower = str.toLowerCase();
  if (upperCaseMakes.includes(lower)) return lower.toUpperCase();
  return toTitleCase(str);
}

// Format fuel
function formatFuelType(str) {
  if (!str) return "";
  const acronyms = ["phev", "hev", "ev", "bev", "lpg", "cng"];
  return str
    .split("/")
    .map(part => {
      const lower = part.trim().toLowerCase();
      if (acronyms.includes(lower)) return lower.toUpperCase();
      return toTitleCase(part.trim());
    })
    .join(" / ");
}

// -------- Fetch + Setup --------
async function fetchCars() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    cars = data.cars || [];
    makes = data.makes || [];

    // Attach makeName by cross-referencing makes array
    cars = cars.map(car => {
      const foundMake = makes.find(m => m.id === car.make);
      return {
        ...car,
        makeName: foundMake ? formatMake(foundMake.name) : car.make
      };
    });

    filteredCars = [...cars];

    populateDropdowns(); // all options
    renderCars();
    console.log(`✅ script.js ${VERSION} loaded! Cars: ${cars.length}`);
  } catch (err) {
    console.error("❌ Failed to fetch cars:", err);
  }
}

// -------- Dropdown population --------
function populateDropdowns(makeVal = "", fuelVal = "") {
  const makeSelect = document.getElementById("filter-make");
  const fuelSelect = document.getElementById("filter-type");
  if (!makeSelect || !fuelSelect) return;

  // Base dataset: all cars (no filters applied yet)
  let availableCars = [...cars];

  // Restrict based on currently selected filters
  if (makeVal) {
    availableCars = availableCars.filter(c => (c.makeName || "").toLowerCase() === makeVal);
  }
  if (fuelVal) {
    availableCars = availableCars.filter(c => (c.fuelType || "").toLowerCase() === fuelVal);
  }

  const makeSet = new Set();
  const fuelSet = new Set();

  availableCars.forEach(car => {
    if (car.makeName) makeSet.add(car.makeName.trim());
    if (car.fuelType) fuelSet.add(car.fuelType.trim());
  });

  // --- Populate Makes ---
  makeSelect.innerHTML = '<option value="">All</option>';
  [...makeSet].sort((a, b) => a.localeCompare(b)).forEach(make => {
    const opt = document.createElement("option");
    opt.value = make.toLowerCase();
    opt.textContent = formatMake(make);
    if (make.toLowerCase() === makeVal) opt.selected = true;
    makeSelect.appendChild(opt);
  });

  // --- Populate Fuels ---
  fuelSelect.innerHTML = '<option value="">All</option>';
  [...fuelSet].sort((a, b) => a.localeCompare(b)).forEach(fuel => {
    const opt = document.createElement("option");
    opt.value = fuel.toLowerCase();
    opt.textContent = formatFuelType(fuel);
    if (fuel.toLowerCase() === fuelVal) opt.selected = true;
    fuelSelect.appendChild(opt);
  });
}

// -------- Apply filters --------
function applyFilters() {
  let make = selectedMake || "";
  let fuel = selectedFuel || "";
  const priceRange = document.getElementById("filter-budget").value.trim();

  // Validate combo → if invalid, reset the clashing filter
  const validCombo = cars.some(car => {
    const carMake = (car.makeName || "").toLowerCase();
    const carFuel = (car.fuelType || "").toLowerCase();
    return (!make || carMake === make) && (!fuel || carFuel === fuel);
  });

  if (!validCombo) {
    console.warn("⚠️ Invalid make/fuel combo. Resetting one filter.");
    if (make && fuel) {
      // Reset fuel by default
      fuel = "";
      selectedFuel = "";
    }
  }

  // Price parsing
  let minPrice = 0, maxPrice = Infinity;
  if (priceRange.includes("-")) {
    const [min, max] = priceRange.split("-").map(v => parseInt(v.replace(/,/g, ""), 10));
    if (!isNaN(min)) minPrice = min;
    if (!isNaN(max)) maxPrice = max;
  } else if (priceRange) {
    maxPrice = parseInt(priceRange.replace(/,/g, ""), 10);
  }

  // Filter cars
  filteredCars = cars.filter(car => {
    let match = true;
    const carMake = (car.makeName || "").toLowerCase();
    const carFuel = (car.fuelType || "").toLowerCase();

    if (make && carMake !== make) match = false;
    if (fuel && carFuel !== fuel) match = false;
    if (car.price && (car.price < minPrice || car.price > maxPrice)) match = false;
    return match;
  });

  // Reset grid + repopulate dropdowns
  currentIndex = 0;
  document.getElementById("car-holder").innerHTML = "";
  renderCars();
  populateDropdowns(make, fuel);
}

// -------- Render cars --------
function renderCars() {
  if (currentIndex >= filteredCars.length) return;
  const container = document.getElementById("car-holder");
  const nextChunk = filteredCars.slice(currentIndex, currentIndex + PAGE_SIZE);

  nextChunk.forEach(car => {
    const item = document.createElement("div");
    item.className = "new-car-item";
    item.innerHTML = `
      <div class="relative">
        <div class="new-car-image">
          <div class="height-full">
            <div class="new-car-image-bg" style="background-image:url('${car.image || ""}')"></div>
          </div>
        </div>
        <div class="absolute-full padding-left-2 padding-top-1">
          ${car.transmission ? `<p class="pill">${car.transmission}</p>` : ""}
          ${car.fuelType ? `<p class="pill">${formatFuelType(car.fuelType)}</p>` : ""}
        </div>
      </div>
      <div class="new-car-bottom-bg">
        <div class="flex-row padding-top-2 padding-bottom-1 padding-x-3">
          <div class="new-car-title-wrapper">
            <p class="new-car-title margin-bottom-0">${car.name || ""}</p>
          </div>
          <p class="new-car-price margin-left-4 margin-bottom-0">
            ${car.price ? "£" + Number(car.price).toLocaleString("en-GB") : ""}
          </p>
        </div>
      </div>
    `;
    container.appendChild(item);
  });

  currentIndex += PAGE_SIZE;
}

// -------- Infinite scroll --------
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    renderCars();
  }
});

// -------- Hook up events --------
document.getElementById("filter-button").addEventListener("click", e => {
  e.preventDefault();
  applyFilters();
});

// Just update stored values on dropdown change
document.getElementById("filter-make").addEventListener("change", e => {
  selectedMake = e.target.value;
});
document.getElementById("filter-type").addEventListener("change", e => {
  selectedFuel = e.target.value;
});

// -------- Init --------
fetchCars();
