// The portfolio content and project disclosures work without JavaScript.
// Enhance the mobile navigation only when its controls are available.
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");
const mobileViewport = window.matchMedia("(max-width: 800px)");

if (menuButton && navigation) {
  document.documentElement.classList.add("menu-enabled");
  menuButton.hidden = false;

  function setMenuOpen(open, restoreFocus = false) {
    navigation.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuOpen(false);
      // Keep keyboard focus on visible content after the mobile menu closes.
      if (wasOpen && mobileViewport.matches) {
        const target = document.querySelector(event.target.closest("a").getAttribute("href"));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
        }
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, true);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) setMenuOpen(false);
  });

  mobileViewport.addEventListener("change", () => setMenuOpen(false));
}
