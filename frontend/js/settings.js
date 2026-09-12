"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const profileForm = document.getElementById("profile-form");
    const securityForm = document.getElementById("security-form");
    const logoutBtn = document.getElementById("logout-btn");

    const profileSubmitBtn =
        document.getElementById("profile-submit-btn");

    const securitySubmitBtn =
        document.getElementById("security-submit-btn");


    // =====================================================
    // LOAD CURRENT USER
    // =====================================================

    async function loadUserProfile() {

        try {

            const userData = await apiRequest("/user/is_auth");

            console.log("Authenticated user:", userData);


            // Profile
            document.getElementById("full-name").value =
                userData.name || "";

            document.getElementById("email").value =
                userData.email || "";

            document.getElementById("username").value =
                userData.username || "";


            // Sidebar
            document.getElementById("sidebar-name").innerText =
                userData.name || "";

            document.getElementById("sidebar-email").innerText =
                userData.email || "";


            // Avatar
            const name = userData.name || "User";

            const initials = name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(word => word.charAt(0))
                .join("")
                .toUpperCase();

            document.getElementById("sidebar-avatar").innerText =
                initials;

            document.getElementById("main-avatar").innerText =
                initials;


        } catch (error) {

            console.error(
                "Unable to load user profile:",
                error
            );

            // If the token is missing/invalid/revoked, this page has no
            // business being shown — send the user back to the index page.
            window.location.replace("/index");

        }
    }


    // =====================================================
    // UPDATE PROFILE
    // =====================================================

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                profileSubmitBtn.innerText = "Saving...";
                profileSubmitBtn.disabled = true;


                const payload = {
                    name:
                        document.getElementById("full-name")
                            .value
                            .trim(),

                    email:
                        document.getElementById("email")
                            .value
                            .trim(),

                    username:
                        document.getElementById("username")
                            .value
                            .trim()
                };


                try {

                    await apiRequest(
                        "/user/profile",
                        {
                            method: "PUT",
                            body: payload
                        }
                    );


                    alert(
                        "Profile updated successfully!"
                    );

                    await loadUserProfile();


                } catch (error) {

                    console.error(
                        "Profile update failed:",
                        error
                    );

                    alert(
                        error.message ||
                        "Error updating profile."
                    );


                } finally {

                    profileSubmitBtn.innerText =
                        "Save changes";

                    profileSubmitBtn.disabled = false;

                }
            }
        );
    }


    // =====================================================
    // UPDATE PASSWORD
    // =====================================================

    if (securityForm) {

        securityForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const currentPassword =
                    document.getElementById(
                        "current-password"
                    ).value;

                const newPassword =
                    document.getElementById(
                        "new-password"
                    ).value;

                const confirmPassword =
                    document.getElementById(
                        "confirm-password"
                    ).value;


                if (newPassword !== confirmPassword) {

                    alert(
                        "New passwords do not match!"
                    );

                    return;
                }


                if (newPassword.length < 6) {

                    alert(
                        "New password must be at least 6 characters."
                    );

                    return;
                }


                securitySubmitBtn.innerText =
                    "Updating...";

                securitySubmitBtn.disabled = true;


                try {

                    await apiRequest(
                        "/user/password",
                        {
                            method: "PUT",

                            body: {
                                current_password:
                                    currentPassword,

                                new_password:
                                    newPassword
                            }
                        }
                    );


                    alert(
                        "Password updated successfully!"
                    );

                    securityForm.reset();


                } catch (error) {

                    console.error(
                        "Password update failed:",
                        error
                    );

                    alert(
                        error.message ||
                        "Error updating password."
                    );


                } finally {

                    securitySubmitBtn.innerText =
                        "Update password";

                    securitySubmitBtn.disabled = false;

                }
            }
        );
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async () => {

                logoutBtn.innerText = "Logging out...";
                logoutBtn.disabled = true;

                try {

                    // Goes through apiRequest so the Authorization header is
                    // attached — the backend needs the token's jti to revoke it.
                    await apiRequest(
                        "/user/logout",
                        { method: "POST" }
                    );

                } catch (error) {

                    console.error(
                        "Logout request failed:",
                        error
                    );

                    // Even if the request failed, the token is being treated
                    // as dead client-side — still clear state and redirect.

                } finally {

                    localStorage.removeItem("authToken");
                    sessionStorage.clear();

                    window.location.href = "/login";

                }
            }
        );
    }


    // =====================================================
    // BACK-BUTTON / BFCACHE GUARD
    //
    // Browsers can restore this page from cache (bfcache) on a back/forward
    // navigation without re-running DOMContentLoaded, which would show a
    // stale, "logged in" settings page even after the token was revoked.
    // pageshow fires on every render of the page, including bfcache
    // restores, so re-check auth there and boot the user out if the
    // token no longer verifies against the backend.
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

                localStorage.removeItem("authToken");
                sessionStorage.clear();

                window.location.replace("/index");

            }
        }

    });


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    await loadUserProfile();

});