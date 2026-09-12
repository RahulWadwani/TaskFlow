// index.js — typewriter effect for the landing page hero heading

document.addEventListener("DOMContentLoaded", function () {

  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const line1 = document.getElementById("typeLine1");
  const line2 = document.getElementById("typeLine2");
  const cursor = document.querySelector(".typing-cursor");

  const text1 = "Your work.";
  const text2 = "Finally under control.";

  if (!line1 || !line2) {
    return;
  }

  // Respect users who've asked for reduced motion — show final text instantly.
  if (prefersReducedMotion) {
    line1.textContent = text1;
    line2.textContent = text2;
    if (cursor) cursor.style.display = "none";
    return;
  }

  typeText(line1, text1, 55, function () {
    typeText(line2, text2, 55, function () {
      // Stop the cursor blinking once typing is fully done
      if (cursor) {
        cursor.style.animation = "none";
        cursor.style.opacity = "1";
      }
    });
  });

});


/**
 * Types `text` into `el` one character at a time.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {number} speed - ms per character
 * @param {Function} [onComplete]
 */
function typeText(el, text, speed, onComplete) {

  let i = 0;

  const interval = setInterval(function () {

    el.textContent = text.slice(0, i + 1);
    i++;

    if (i === text.length) {
      clearInterval(interval);
      if (onComplete) {
        onComplete();
      }
    }

  }, speed);

}