const API_URL = "/api";

async function fetchData(url, method = "GET", body = null) {
    try {
        let response = await fetchWithAuth(url, method, body);

        if (response.status === 401) {
            const newAccessToken = await refreshToken();
            if (newAccessToken) {
                response = await fetchWithAuth(url, method, body);
            } else {
                window.location.href = "login.html";
                return;
            }
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`fetchData: HTTP error ${response.status} for ${url}`, errorData);
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
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
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const fullUrl = url.startsWith('http') ? url : `${API_URL}/${url}`;
    return await fetch(fullUrl, options);
}

async function refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
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
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        return data.access_token;
    } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return null;
    }
}

function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", function() {
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
});

function renderPagination(currentPage, totalPages, elementId, onPageClick) {
    const paginationEl = document.getElementById(elementId);
    if (!paginationEl) return;

    paginationEl.innerHTML = "";

    if (totalPages <= 1) return;

    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    prevLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageClick(currentPage - 1);
    };
    paginationEl.appendChild(prevLi);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
         const firstLi = document.createElement("li");
         firstLi.className = "page-item";
         firstLi.innerHTML = `<a class="page-link" href="#">1</a>`;
         firstLi.onclick = (e) => { e.preventDefault(); onPageClick(1); };
         paginationEl.appendChild(firstLi);
         
         if (startPage > 2) {
             const dots = document.createElement("li");
             dots.className = "page-item disabled";
             dots.innerHTML = `<span class="page-link">...</span>`;
             paginationEl.appendChild(dots);
         }
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement("li");
        li.className = `page-item ${i === currentPage ? "active" : ""}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = (e) => {
            e.preventDefault();
            onPageClick(i);
        };
        paginationEl.appendChild(li);
    }
    
    if (endPage < totalPages) {
         if (endPage < totalPages - 1) {
             const dots = document.createElement("li");
             dots.className = "page-item disabled";
             dots.innerHTML = `<span class="page-link">...</span>`;
             paginationEl.appendChild(dots);
         }
         
         const lastLi = document.createElement("li");
         lastLi.className = "page-item";
         lastLi.innerHTML = `<a class="page-link" href="#">${totalPages}</a>`;
         lastLi.onclick = (e) => { e.preventDefault(); onPageClick(totalPages); };
         paginationEl.appendChild(lastLi);
    }

    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    nextLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageClick(currentPage + 1);
    };
    paginationEl.appendChild(nextLi);
}

window.fetchData = fetchData;
window.logout = logout;
window.renderPagination = renderPagination;