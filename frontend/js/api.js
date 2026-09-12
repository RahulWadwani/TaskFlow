// api.js
// Central fetch wrapper for all calls to the FastAPI backend.
//
// Load order:
// api.js -> auth.js -> main.js -> page-specific JS
//
// Example:
// apiRequest("/tasks/all_tasks")
//
// apiRequest("/tasks/create", {
//     method: "POST",
//     body: {
//         title: "Test Task",
//         description: "Testing",
//         is_completed: false
//     }
// });

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const API_BASE_URL = "";

const TOKEN_STORAGE_KEY = "taskflow_token";


/* =========================================================
   MAIN API REQUEST FUNCTION
   ========================================================= */

async function apiRequest(path, options = {}) {

    if (!path || typeof path !== "string") {
        throw new ApiError(
            "Invalid API path.",
            0,
            null
        );
    }


    // Make sure path starts with "/"
    const normalizedPath =
        path.startsWith("/")
            ? path
            : "/" + path;


    const url =
        API_BASE_URL + normalizedPath;


    /* -----------------------------------------------------
       HEADERS
       ----------------------------------------------------- */

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };


    /* -----------------------------------------------------
       AUTH TOKEN
       ----------------------------------------------------- */

    const token = getAuthToken();

    if (
        token &&
        !headers["Authorization"]
    ) {
        headers["Authorization"] =
            "Bearer " + token;
    }


    /* -----------------------------------------------------
       REQUEST BODY
       ----------------------------------------------------- */

    let body;


    if (
        options.body !== undefined &&
        options.body !== null
    ) {

        // FormData
        if (options.body instanceof FormData) {

            body = options.body;
        }

        // URL encoded form
        else if (
            options.body instanceof URLSearchParams
        ) {

            headers["Content-Type"] =
                "application/x-www-form-urlencoded";

            body =
                options.body.toString();
        }

        // JSON object
        else if (
            typeof options.body === "object" &&
            !(options.body instanceof Blob)
        ) {

            headers["Content-Type"] =
                "application/json";

            body =
                JSON.stringify(options.body);
        }

        // String / Blob / other
        else {

            body = options.body;
        }
    }


    /* =====================================================
       FETCH
       ===================================================== */

    let response;

    try {

        response = await fetch(url, {
            method: options.method || "GET",
            headers: headers,
            body: body
        });

    } catch (error) {

        console.error(
            "TaskFlow API network error:",
            error
        );

        throw new ApiError(
            "Network error. Make sure the FastAPI server is running.",
            0,
            null
        );
    }


    /* =====================================================
       204 NO CONTENT
       ===================================================== */

    if (response.status === 204) {
        return null;
    }


    /* =====================================================
       PARSE RESPONSE
       ===================================================== */

    let data = null;

    const contentType =
        response.headers.get("content-type") || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        data = await response
            .json()
            .catch(() => null);

    } else {

        const text =
            await response
                .text()
                .catch(() => "");

        if (text) {
            data = {
                detail: text
            };
        }
    }


    /* =====================================================
       ERROR HANDLING
       ===================================================== */

    if (!response.ok) {

        const message =
            getApiErrorMessage(
                data,
                response.status
            );


        if (response.status === 401) {
            handleUnauthorized();
        }


        throw new ApiError(
            message,
            response.status,
            data
        );
    }


    return data;
}


/* =========================================================
   API ERROR MESSAGE
   ========================================================= */

function getApiErrorMessage(
    data,
    status
) {

    const defaultMessage =
        "Request failed with status " + status;


    if (!data) {
        return defaultMessage;
    }


    // Normal FastAPI error
    if (
        typeof data.detail === "string"
    ) {

        return data.detail;
    }


    // FastAPI validation error
    if (
        Array.isArray(data.detail)
    ) {

        const messages =
            data.detail
                .map(function (error) {

                    const location =
                        Array.isArray(error.loc)
                            ? error.loc.join(".")
                            : "";

                    const message =
                        error.msg ||
                        "Invalid value";

                    return location
                        ? location + ": " + message
                        : message;
                })
                .filter(Boolean);


        if (messages.length > 0) {
            return messages.join(" | ");
        }
    }


    // Generic message
    if (
        typeof data.message === "string"
    ) {

        return data.message;
    }


    // Object detail
    if (
        typeof data.detail === "object" &&
        data.detail !== null
    ) {

        try {

            return JSON.stringify(
                data.detail
            );

        } catch (error) {

            return defaultMessage;
        }
    }


    return defaultMessage;
}


/* =========================================================
   API ERROR CLASS
   ========================================================= */

class ApiError extends Error {

    constructor(
        message,
        status,
        data
    ) {

        super(message);

        this.name = "ApiError";
        this.status = status;
        this.data = data;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(
                this,
                ApiError
            );
        }
    }


    toString() {

        return (
            this.name +
            " (" +
            this.status +
            "): " +
            this.message
        );
    }
}


/* =========================================================
   AUTH TOKEN FUNCTIONS
   ========================================================= */

function getAuthToken() {

    return localStorage.getItem(
        TOKEN_STORAGE_KEY
    );
}


function setAuthToken(token) {

    if (!token) {
        console.warn(
            "Cannot store empty authentication token."
        );

        return;
    }

    localStorage.setItem(
        TOKEN_STORAGE_KEY,
        token
    );
}


function clearAuthToken() {

    localStorage.removeItem(
        TOKEN_STORAGE_KEY
    );
}


function isAuthenticated() {

    return Boolean(
        getAuthToken()
    );
}


/* =========================================================
   UNAUTHORIZED HANDLER
   ========================================================= */

function handleUnauthorized() {

    clearAuthToken();


    const currentPath =
        window.location.pathname;


    // Already on login page
    if (
        currentPath === "/login" ||
        currentPath.startsWith("/login/")
    ) {
        return;
    }


    // Remember current page
    try {

        sessionStorage.setItem(
            "taskflow_redirect_after_login",
            currentPath +
            window.location.search
        );

    } catch (error) {

        console.warn(
            "Could not save redirect URL.",
            error
        );
    }


    window.location.href =
        "/login";
}