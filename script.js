// — MOBILE MENU TOGGLE —
const btnMobileMenu = document.getElementById("btn-mobile-menu");
const navMobile = document.getElementById("nav-mobile");
btnMobileMenu.addEventListener("click", () => {
  navMobile.classList.toggle("hidden");
});

// — HEADER SCROLL SHADOW & BACKDROP —
const header = document.getElementById("header");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    header.classList.replace("bg-transparent", "bg-gray-900/90");
    header.classList.add("backdrop-blur-md", "py-4", "shadow-lg");
  } else {
    header.classList.replace("bg-gray-900/90", "bg-transparent");
    header.classList.remove("backdrop-blur-md", "py-4", "shadow-lg");
  }
});

// — TYPING EFFECT IN HERO —
const fullText = "Software Engineer & UX Designer";
const typingEl = document.getElementById("typed-text");
let idx = 0,
  speed = 100;

function typeChar() {
  if (idx < fullText.length) {
    typingEl.textContent += fullText[idx++];
    setTimeout(typeChar, speed);
  }
}
typeChar();

// — BACK TO TOP BUTTON —
document.getElementById("btn-back-to-top").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// — CONTACT FORM SUBMISSION —
const form = document.getElementById("contact-form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Thank you for your message! I will get back to you soon.");
  form.reset();
});

// — PROJECTS TABS —
// grab all the buttons and panels
const tabs = document.querySelectorAll(".proj-btn");
const panels = document.querySelectorAll(".project-detail");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const idx = tab.dataset.index;

    // 1) hide all panels
    panels.forEach((p) => p.classList.add("hidden"));
    // 2) show the one matching this button's index
    document
      .getElementById(`project-details-${idx}`)
      .classList.remove("hidden");

    // 3) optional: mark this button active
    tabs.forEach((t) => t.classList.remove("border-cyan-500", "bg-gray-800"));
    tab.classList.add("border-cyan-500", "bg-gray-800");
  });
});

// trigger the first tab on load
if (tabs[0]) tabs[0].click();

// — UX DESIGN FILTERS —
document.querySelectorAll("#ux-design [data-cat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    // style active
    document.querySelectorAll("#ux-design [data-cat]").forEach((b) => {
      b.classList.remove(
        "bg-gradient-to-r",
        "from-cyan-500",
        "to-blue-600",
        "text-white",
        "shadow-lg"
      );
    });
    btn.classList.add(
      "bg-gradient-to-r",
      "from-cyan-500",
      "to-blue-600",
      "text-white",
      "shadow-lg"
    );

    // show/hide cards
    const cat = btn.dataset.cat;
    document.querySelectorAll(".ux-card").forEach((card) => {
      card.classList.toggle(
        "hidden",
        cat !== "all" && card.dataset.cat !== cat
      );
    });
  });
});
