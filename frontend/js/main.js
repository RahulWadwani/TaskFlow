// main.js — shared logic loaded on every page
// Load order: api.js -> auth.js -> main.js -> (page-specific).js

document.addEventListener("DOMContentLoaded", function () {

  highlightActiveNavLink();
  wireLogoutButton();

});


/**
 * Adds/keeps the "active" class on the nav item matching the
 * current URL path, so pages don't have to hardcode it manually.
 */
function highlightActiveNavLink() {

  const currentPath = window.location.pathname;

  const navLinks = document.querySelectorAll(
    ".nav-item, .navbar-links a"
  );

  navLinks.forEach(function (link) {

    const linkPath = link.getAttribute("href");

    if (!linkPath || linkPath === "#") {
      return;
    }

    const isMatch =
      linkPath === currentPath ||
      (currentPath === "/" && linkPath === "/");

    link.classList.toggle("active", isMatch);

  });

}


/**
 * Wires up any logout button on the page (id="logoutBtn").
 * Relies on auth.js exposing a global `logout()` function.
 */
function wireLogoutButton() {

  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", function (event) {
    event.preventDefault();

    if (typeof logout === "function") {
      logout();
    } else {
      console.warn("logout() is not defined — check that auth.js loaded before main.js.");
    }

  });

}


/**
 * Small reusable helper to show a temporary status message
 * inside any element (e.g. #profileStatusMsg).
 *
 * @param {HTMLElement} el
 * @param {string} message
 * @param {"success"|"error"} type
 */
function showStatusMessage(el, message, type) {

  if (!el) {
    return;
  }

  el.textContent = message;
  el.className = "status-msg " + (type === "error" ? "status-error" : "status-success");

  setTimeout(function () {
    el.textContent = "";
    el.className = "status-msg";
  }, 3000);

}