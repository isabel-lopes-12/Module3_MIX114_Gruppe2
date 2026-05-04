// Kjører koden først når hele HTML-siden er lastet inn
document.addEventListener("DOMContentLoaded", () => {

  // Henter filnavnet på siden brukeren er på, for eksempel index.html
  const currentPage = window.location.pathname.split("/").pop();

  // Henter alle lenkene i navigasjonsmenyen
  const navLinks = document.querySelectorAll(".nav-link");

  // Går gjennom hver lenke i menyen
  navLinks.forEach((link) => {

    // Henter adressen lenken peker til, for eksempel om-oss.html
    const linkPage = link.getAttribute("href");

    // Sjekker om lenken samsvarer med siden brukeren er på
    if (
      currentPage === linkPage ||
      (currentPage === "" && linkPage === "index.html")
    ) {
      // Legger til klassen active på riktig lenke
      // Dette gjør at aktiv side kan få egen stil i CSS
      link.classList.add("active");
    }
  });
});
