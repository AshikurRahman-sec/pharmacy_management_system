// Unified navigation and loader functionality
document.addEventListener("DOMContentLoaded", function() {
    console.log("Loader.js loaded - initializing navigation");

    // Show loader immediately if it exists (for page loads)
    const loaderWrapper = document.getElementById("loader-wrapper");
    if (loaderWrapper) {
        console.log("Showing initial loader");
        loaderWrapper.classList.add("visible");
    }

    // Hide loader when page is fully loaded, or after a timeout as a failsafe
    let loadTimeout = setTimeout(() => {
        if (loaderWrapper) {
            console.log("Hiding loader by timeout");
            loaderWrapper.classList.remove("visible");
        }
    }, 2000);

    window.addEventListener("load", () => {
        clearTimeout(loadTimeout);
        if (loaderWrapper) {
            console.log("Hiding loader on window load");
            loaderWrapper.classList.remove("visible");
        }
    });

    // Unified navigation functionality
    function initializeNavigation() {
        // Highlight active link - handle URLs with parameters
        const currentPath = window.location.pathname.split('/').pop();
        const urlParams = new URLSearchParams(window.location.search);
        console.log("Current path:", currentPath, "params:", urlParams.toString());
        
        const navLinks = document.querySelectorAll('.list-group-item');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            }
        });

        // Menu toggle functionality
        const toggleButton = document.getElementById("menu-toggle");
        const wrapper = document.getElementById("wrapper");
        if (toggleButton && wrapper) {
            toggleButton.onclick = function () {
                wrapper.classList.toggle("toggled");
            };
        }

        // Logout functionality
        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener('click', function(event) {
                event.preventDefault();
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = 'login.html';
            });
        }
    }

    // Custom navigation functions
    window.togglePurchaseDropdownAndNavigate = function(e) { window.location.href = 'inventory.html'; };
    window.toggleUsersDropdownAndNavigate = function(e) { window.location.href = 'users.html'; };
    window.toggleSalesDropdownAndNavigate = function(e) { window.location.href = 'sales.html'; };
    window.toggleEmployeesDropdownAndNavigate = function(e) { window.location.href = 'employees.html'; };

    // Initialize navigation
    initializeNavigation();

    // Show loader when navigating to a NEW page
    const navLinks = document.querySelectorAll("a");
    console.log("Found", navLinks.length, "navigation links");

        navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");
                const target = link.getAttribute("data-target");
                
                // Special handling for dropdown toggle links
                if (link.classList.contains('dropdown-toggle') && link.id === 'nav-purchase-toggle') {
                    e.preventDefault();
                    togglePurchaseDropdownAndNavigate(e);
                    return;
                }
                
                if (link.classList.contains('dropdown-toggle') && link.id === 'nav-users-toggle') {
                    e.preventDefault();
                    toggleUsersDropdownAndNavigate(e);
                    return;
                }
                
                if (link.classList.contains('dropdown-toggle') && link.id === 'nav-sales-toggle') {
                    e.preventDefault();
                    toggleSalesDropdownAndNavigate(e);
                    return;
                }

                if (link.classList.contains('dropdown-toggle') && link.id === 'nav-employees-toggle') {
                    e.preventDefault();
                    toggleEmployeesDropdownAndNavigate(e);
                    return;
                }
                
                // Check if this is a navigation link to a different page
                const isNavigationLink = href &&
                                       href !== "#" &&
                                       !href.startsWith("javascript:") &&
                                       !href.startsWith("#");

                if (isNavigationLink) {
                e.preventDefault();
                
                // Create navigation loader
                let loader = document.getElementById("navigation-loader");
                if (!loader) {
                    loader = document.createElement("div");
                    loader.id = "navigation-loader";
                    loader.className = "loader-wrapper";
                    loader.innerHTML = '<div class="loader"></div>';
                    loader.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(255, 255, 255, 0.9);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                        visibility: visible;
                        opacity: 1;
                        transition: opacity 0.3s linear;
                    `;
                    document.body.appendChild(loader);
                }

                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            }
        });
    });
});
