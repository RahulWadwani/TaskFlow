// auth.js — login, register, logout, and route protection
// Load order: api.js -> auth.js -> main.js -> (page-specific).js
//
// Relies on api.js for: apiRequest(), setAuthToken(), clearAuthToken(), getAuthToken()
// Exposes a global: logout() — called by main.js's wireLogoutButton()

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

// ⚠️ CONFIRM THESE against your actual FastAPI router setup.
// Your route is: @user_router.post("/login", ...) — the full path
// depends on the prefix you mounted user_router with, e.g.:
//   app.include_router(user_router, prefix="/user")  ->  "/user/login"
//   app.include_router(user_router, prefix="/users")  -> "/users/login"
const LOGIN_ENDPOINT = "/user/login";
const REGISTER_ENDPOINT = "/user/register";

// ⚠️ CONFIRM against your LoginSchema field names (email/password vs
// username/password) and whatever controller.login_user() returns
// (access_token vs token, flat vs nested under "data", etc).
const LOGIN_TOKEN_FIELD = "token"; // matches login_user()'s return { "token": token }


const IS_AUTH_ENDPOINT = "/user/is_auth"; // matches @user_router.get("/is_auth")


document.addEventListener("DOMContentLoaded", function () {

  guardProtectedRoute();
  wireLoginForm();
  wireRegisterForm();

});


/**
 * If the current page is not login/register/forgot-password, verifies
 * the stored token is actually still valid by calling GET /user/is_auth.
 * Bounces to /login if there's no token, or if the backend rejects it
 * (expired, tampered, user deleted, etc.) — not just a local presence check.
 */
async function guardProtectedRoute() {

  const isPublicPath = PUBLIC_PATHS.some(function (path) {
    return window.location.pathname.startsWith(path);
  });

  if (isPublicPath) {
    return;
  }

  const token = getAuthToken();

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {

    // apiRequest() already attaches "Authorization: Bearer <token>" for us.
    await apiRequest(IS_AUTH_ENDPOINT, { method: "GET" });

  } catch (error) {

    // apiRequest() already calls handleUnauthorized() on a 401, which clears
    // the token and redirects — but we redirect here too as a fallback for
    // any other failure (network error, 500, etc.) so a broken session
    // never silently leaves someone stuck on a protected page.
    if (error.status !== 401) {
      clearAuthToken();
      window.location.href = "/login";
    }

  }

}


/**
 * Wires up the login form (expected on login.html):
 *   <form id="loginForm">
 *     <input id="loginEmail">
 *     <input id="loginPassword">
 *     <button type="submit">...</button>
 *   </form>
 *   <div id="authErrorMsg" class="auth-error"></div>
 *
 * Expected backend endpoint: POST /auth/login
 *   body:   { email, password }
 *   returns:{ access_token: "..." }
 */
function wireLoginForm() {

  const form = document.getElementById("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    const errorEl = document.getElementById("authErrorMsg");

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    hideAuthError(errorEl);
    setSubmitting(submitBtn, true);

    try {

      const result = await apiRequest(LOGIN_ENDPOINT, {
        method: "POST",
        body: { username: username, password: password }
      });

      setAuthToken(result[LOGIN_TOKEN_FIELD]);
      window.location.href = "/dashboard";

    } catch (error) {

      showAuthError(errorEl, error.message || "Invalid email or password.");

    } finally {

      setSubmitting(submitBtn, false);

    }

  });

}


/**
 * Wires up the register form (expected on register.html):
 *   <form id="registerForm">
 *     <input id="registerName">
 *     <input id="registerEmail">
 *     <input id="registerPassword">
 *     <button type="submit">...</button>
 *   </form>
 *   <div id="authErrorMsg" class="auth-error"></div>
 *
 * Expected backend endpoint: POST /auth/register
 *   body:   { name, email, password }
 *   returns:{ access_token: "..." }
 */
function wireRegisterForm() {

  const form = document.getElementById("registerForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    const errorEl = document.getElementById("authErrorMsg");

    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    hideAuthError(errorEl);
    setSubmitting(submitBtn, true);

    try {

      await apiRequest(REGISTER_ENDPOINT, {
        method: "POST",
        body: { name: name, username: username, email: email, password: password }
      });

      // register() returns the created user, not a token — send them to
      // log in with their new credentials rather than straight to /dashboard.
      window.location.href = "/login?registered=1";

    } catch (error) {

      showAuthError(errorEl, error.message || "Could not create your account.");

    } finally {

      setSubmitting(submitBtn, false);

    }

  });

}


/**
 * Clears the token and sends the user back to login.
 * Called by main.js's wireLogoutButton() via #logoutBtn.
 */
function logout() {
  clearAuthToken();
  window.location.href = "/login";
}


function showAuthError(el, message) {

  if (!el) {
    return;
  }

  el.textContent = message;
  el.classList.add("active");

}


function hideAuthError(el) {

  if (!el) {
    return;
  }

  el.textContent = "";
  el.classList.remove("active");

}


function setSubmitting(button, isSubmitting) {

  if (!button) {
    return;
  }

  button.disabled = isSubmitting;
  button.dataset.originalText = button.dataset.originalText || button.textContent;
  button.textContent = isSubmitting ? "Please wait..." : button.dataset.originalText;

}