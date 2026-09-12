"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const newProjectBtn = document.getElementById("newProjectBtn");


    // =====================================================
    // LOAD CURRENT USER (sidebar)
    // =====================================================

    async function loadSidebarUser() {

        const nameEl = document.getElementById("sidebar-name");
        const emailEl = document.getElementById("sidebar-email");
        const avatarEl = document.getElementById("sidebar-avatar");

        try {

            const userData = await apiRequest("/user/is_auth");

            if (nameEl) {
                nameEl.innerText = userData.name || "";
            }

            if (emailEl) {
                emailEl.innerText = userData.email || "";
            }

            const name = userData.name || "User";

            const initials = name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(word => word.charAt(0))
                .join("")
                .toUpperCase();

            if (avatarEl) {
                avatarEl.innerText = initials;
            }

        } catch (error) {

            console.error(
                "Unable to load user profile:",
                error
            );

            // Only a real auth failure (no/expired/revoked token) should
            // send the user away — a missing DOM element, a network
            // hiccup, or any other error should surface visibly instead
            // of silently bouncing to /index (which can look like the
            // page "hangs" or loops if /index runs the same kind of check).
            if (error && error.status === 401) {
                window.location.replace("/index");
                return;
            }

            if (nameEl) {
                nameEl.innerText = "Unable to load";
            }

            if (emailEl) {
                emailEl.innerText = "";
            }
        }
    }


    // =====================================================
    // NEW PROJECT (disabled — feature not built yet)
    // =====================================================

    if (newProjectBtn) {

        newProjectBtn.addEventListener(
            "click",
            () => {
                alert("Projects are coming soon — you can't create one just yet!");
            }
        );
    }


    // =====================================================
    // BACK-BUTTON / BFCACHE GUARD
    //
    // Re-checks auth when this page is restored from bfcache on a
    // back/forward navigation, so a logged-out session can't leave a
    // stale, "logged in" sidebar showing. See settings.js for the
    // same pattern.
    // =====================================================

    window.addEventListener("pageshow", async (event) => {

        if (event.persisted) {

            try {

                await apiRequest("/user/is_auth");

            } catch (error) {

                console.error(
                    "Session is no longer valid:",
                    error
                );

                if (error && error.status === 401) {
                    localStorage.removeItem("authToken");
                    sessionStorage.clear();
                    window.location.replace("/index");
                }

            }
        }

    });


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    await loadSidebarUser();

});