const API_URL = "/api";

async function fetchData(url, method = "GET", body = null) {
    console.log(`fetchData: Initiating request to ${url} with method ${method}`);
    try {
        let response = await fetchWithAuth(url, method, body);
        console.log(`fetchData: Received response status ${response.status} from ${url}`);

        if (response.status === 401) {
            console.log("fetchData: 401 Unauthorized, attempting token refresh.");
            const newAccessToken = await refreshToken();
            if (newAccessToken) {
                console.log("fetchData: Token refreshed, retrying original request.");
                response = await fetchWithAuth(url, method, body);
            } else {
                console.error("fetchData: Token refresh failed, redirecting to login.");
                window.location.href = "login.html";
                return;
            }
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`fetchData: HTTP error ${response.status} for ${url}`, errorData);
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        console.log(`fetchData: Request to ${url} successful.`);
        return response.json();
    } catch (error) {
        console.error(`fetchData: Error during request to ${url}:`, error);
        throw error;
    }
}

async function fetchWithAuth(url, method, body) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
        },
    };

    const token = localStorage.getItem("accessToken");
    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
        console.log("fetchWithAuth: Access token found and added to headers.");
    } else {
        console.warn("fetchWithAuth: No access token found in localStorage.");
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    // Prepend API_URL if url doesn't start with http
    const fullUrl = url.startsWith('http') ? url : `${API_URL}/${url}`;
    return await fetch(fullUrl, options);
}

async function refreshToken() {
    console.log("refreshToken: Attempting to refresh token.");
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        console.error("refreshToken: No refresh token found.");
        return null;
    }

    const response = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${refreshToken}`
        },
    });

    if (response.ok) {
        const data = await response.json();
        console.log("refreshToken: Token refresh successful.", data);
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        return data.access_token;
    } else {
        console.error("refreshToken: Token refresh failed.", response);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return null;
    }
}

function logout() {
    console.log("Logout function called.");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "login.html";
}

function checkAuth() {
    const accessToken = localStorage.getItem('accessToken');
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    if (!accessToken && !isLoginPage) {
        // Only redirect if we are not already on the login page
        // and not on a root path that might be serving the login page (though usually root is index)
        window.location.href = 'login.html';
    } else if (accessToken && isLoginPage) {
        window.location.href = 'index.html';
    }
}

// Run checkAuth immediately
// checkAuth(); // Disabled in favor of inline scripts in HTML files

document.addEventListener("DOMContentLoaded", function() {
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
});

window.fetchData = fetchData;
// window.checkAuth = checkAuth;
window.logout = logout;