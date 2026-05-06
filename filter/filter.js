//filters 
const filters = [
  { id: "population", label: "Befolkning" },
  { id: "migration", label: "Migrasjon" },
  { id: "income", label: "Inntekt" },
  { id: "housing", label: "Boligpriser" },
  { id: "age", label: "Aldersstruktur" },
  { id: "families", label: "Familier" }
];

let selectedFilter = null;
let activeButton = null;

const filterList = document.getElementById("filterList");
const filterSearch = document.getElementById("filterSearch");

// filter actions and rendering 
function renderFilters(list) {
  filterList.innerHTML = "";

  list.forEach(filter => {
    const item = document.createElement("div");
    item.className = "filter-item";

    if (selectedFilter && filter.id === selectedFilter) {
  item.classList.add("active");
}

    item.textContent = filter.label;

    item.addEventListener("click", () => {
      selectedFilter = filter.id;
      renderFilters(filters);

      console.log("Valgt filter:", selectedFilter);
    });

    filterList.appendChild(item);
  });
}

// search functionality
filterSearch.addEventListener("input", () => {
  const searchText = filterSearch.value.toLowerCase();

  const filteredList = filters.filter(filter =>
    filter.label.toLowerCase().includes(searchText)
  );

  renderFilters(filteredList);
});

document.getElementById("showAboveBtn").addEventListener("click", () => {
  setActiveButton("showAboveBtn");
  console.log("Viser kommuner over snitt for:", selectedFilter);
});

document.getElementById("showBelowBtn").addEventListener("click", () => {
  setActiveButton("showBelowBtn");
  console.log("Viser kommuner under snitt for:", selectedFilter);
});

document.getElementById("resetBtn").addEventListener("click", () => {

  selectedFilter = null;
  activeButton = null;

  document.querySelectorAll(".filter-item").forEach(item => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".filter-buttons button").forEach(button => {
    button.classList.remove("active");
  });

  filterSearch.value = "";

  renderFilters(filters);

  console.log("Filter nullstilt");

});

// active button styling
function setActiveButton(buttonId) {
  activeButton = buttonId;

  document.querySelectorAll(".filter-buttons button").forEach(button => {
    button.classList.remove("active");
  });

  document.getElementById(buttonId).classList.add("active");
}

renderFilters(filters);