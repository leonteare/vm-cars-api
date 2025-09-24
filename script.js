// ---------- script-dev.js v3 ----------
// Smart dropdown syncing (but only filter on Search)

const API_URL = "https://leonteare.github.io/vm-cars-api/cars.json";
const PAGE_SIZE = 40;
const VERSION = "v3";

let cars = [];
let makes = [];
let filteredCars = [];
let currentIndex = 0;

// Lookup maps
let makeToFuels = {};
let fuelToMakes = {};

// -------- Helpers --------
function toTitleCase(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatMake(str) {
  if (!str) return "";
  const upperCaseMakes = ["bmw", "fiat", "dfsk"];
  const lower = str.toLowerCase();
  if (upperCaseMakes.includes(lower)) return lower.toUpperCase();
  return toTitleCase(str);
}

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

    // Attach makeName
    cars = cars.map(car => {
      const foundMake = makes.find(m => m.id === car.make);
      return {
        ...car,
        makeName: foundMake ? formatMake(foundMake.name) : car.make
      };
    });

    filteredCars = [...cars];

    buildLookupMaps();
    populateDropdowns(); // initial all options
    renderCars();

    console.log(`✅ script-dev.js ${VERSION} loaded! Cars: ${cars.length}, Makes: ${makes.length}`);
  } catch (err) {
    console.error("❌ Failed to fetch cars:", err);
  }
}

// -------- Lookup maps --------
function buildLookupMaps() {
  makeToFuels = {};
  fuelToMakes = {};

  cars.forEach(car => {
    const make = (car.makeName || "").toLowerCase();
    const fuel = (car.fuelType || "").toLowerCase();

    if (!make || !fuel) return;

    if (!makeToFuels[make]) makeToFuels[make] = new Set();
    if (!fuelToMakes[fuel]) fuelToMakes[fuel] = new Set();

    makeToFuels[make].add(fuel);
    fuelToMakes[fuel].add(make);
  });
}

// -------- Dropdown population --------
function populateDropdowns(selectedMake = "", selectedFuel = "") {
  const makeSelect = document.getElementById("filter-make");
  const fuelSelect = document.getElementById("filter-type");

  if (!makeSelect || !fuelSelect) return;

  let makesList = new Set(makes.map(m => formatMake(m.name)));
  let fuelsList = new Set(cars.map(c => c.fuelType).filter(Boolean));

  if (selectedMake && makeToFuels[selectedMake]) {
    fuelsList = makeToFuels[selectedMake];
  }

  if (selectedFuel && fuelToMakes[selectedFuel]) {
    makesList = fuelToMakes[selectedFuel];
  }

  // Repopulate makes
  makeSelect.innerHTML = '<option value="">All</option>';
  [...makesList].sort((a, b) => a.localeCompare(b)).forEach(make => {
    const opt = document.createElement("option");
    opt.value = make.toLowerCase();
    opt.textContent = formatMake(make);
    if (make.toLowerCase() === selectedMake) opt.selected = true;
    makeSelect.appendChild(opt);
  });

  // Repopulate fuels
  fuelSelect.innerHTML = '<option value="">All</option>';
  [...fuelsList].sort((a, b) => a.localeCompare(b)).forEach(fuel => {
    const opt = document.createElement("option");
    opt.value = fuel.toLowerCase();
    opt.textContent = formatFuelType(fuel);
    if (fuel.toLowerCase() === selectedFuel) opt.selected = true;
    fuelSelect.appendChild(opt);
  });
}

// -------- Apply filters --------
function applyFilters() {
  const make = document.getElementById("filter-make").value || "";
  const fuel = document.getElementById("filter-type").value || "";
  const priceRange = document.getElementById("filter-budget").value.trim();

  let minPrice = 0, maxPrice = Infinity;
  if (priceRange.includes("-")) {
    const [min, max] = priceRange.split("-").map(v => parseInt(v.replace(/,/g, ""), 10));
    if (!isNaN(min)) minPrice = min;
    if (!isNaN(max)) maxPrice = max;
  } else if (priceRange) {
    maxPrice = parseInt(priceRange.replace(/,/g, ""), 10);
  }

  filteredCars = cars.filter(car => {
    let match = true;
    const carMake = (car.makeName || "").toLowerCase();
    const carFuel = (car.fuelType || "").toLowerCase();

    if (make && carMake !== make) match = false;
    if (fuel && carFuel !== fuel) match = false;
    if (car.price && (car.price < minPrice || car.price > maxPrice)) match = false;
    return match;
  });

  // Reset grid
  currentIndex = 0;
  document.getElementById("car-holder").innerHTML = "";
  renderCars();

  console.log(`🔎 Search applied — Make: ${make || "All"}, Fuel: ${fuel || "All"}, Cars: ${filteredCars.length}`);
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
document.getElementById("filter-make").addEventListener("change", e => {
  const selectedMake = e.target.value;
  populateDropdowns(selectedMake, document.getElementById("filter-type").value);
});

document.getElementById("filter-type").addEventListener("change", e => {
  const selectedFuel = e.target.value;
  populateDropdowns(document.getElementById("filter-make").value, selectedFuel);
});

document.getElementById("filter-button").addEventListener("click", e => {
  e.preventDefault();
  applyFilters();
});

// -------- Init --------
fetchCars();
