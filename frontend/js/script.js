// --- Role-based UI Restrictions (Immediate) ---
async function applyRoleRestrictions() {
    let userRole = localStorage.getItem('userRole');
    let username = localStorage.getItem('username');
    
    // If role is missing or invalid but we are logged in, fetch it from backend
    if ((!userRole || userRole === 'undefined' || userRole === 'null') && localStorage.getItem('accessToken')) {
        try {
            console.log("Role missing or invalid, fetching from backend...");
            const user = await fetchData('users/me');
            if (user) {
                if (user.role) {
                    userRole = user.role;
                    localStorage.setItem('userRole', userRole);
                }
                if (user.email) {
                    username = user.email;
                    localStorage.setItem('username', username);
                }
                console.log("Fetched and saved user info:", username, userRole);
            }
        } catch (error) {
            console.error("Failed to fetch user role:", error);
        }
    }

    // Always update the profile section if we have username
    updateProfileSection(username, userRole);

    if (userRole && userRole !== 'undefined' && userRole !== 'null') {
        document.body.setAttribute('data-user-role', userRole.toLowerCase());

        if (userRole.toLowerCase() === 'employee') {
            const restrictedIds = ['nav-employees', 'nav-salaries', 'nav-reports', 'nav-users', 'nav-activity-logs'];
            restrictedIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.add('restricted-item');
                }
            });

            // Redirect if on a restricted page
            const currentPath = window.location.pathname.split('/').pop();
            const restrictedPages = ['employees.html', 'payroll.html', 'reports.html', 'users.html', 'activity_logs.html'];
            if (restrictedPages.includes(currentPath)) {
                window.location.href = 'index.html';
            }
        }
        
        // Hide Activity Logs for standard Admins too (Superadmin only feature)
        if (userRole.toLowerCase() === 'admin') {
             const actLog = document.getElementById('nav-activity-logs');
             if (actLog) actLog.classList.add('restricted-item');
             
             if (window.location.pathname.includes('activity_logs.html')) {
                 window.location.href = 'index.html';
             }
        }
    }
}

// Helper function to update profile section in sidebar
function updateProfileSection(username, userRole) {
    const displayUsername = document.getElementById('display-username');
    const displayRole = document.getElementById('display-role');
    const userInitials = document.getElementById('user-initials');

    if (displayUsername) {
        if (username && username !== 'undefined' && username !== 'null') {
            displayUsername.textContent = username;
        } else {
            displayUsername.textContent = 'User';
        }
    }
    
    if (displayRole) {
        if (userRole && userRole !== 'undefined' && userRole !== 'null') {
            displayRole.textContent = userRole;
        } else {
            displayRole.textContent = '';
        }
    }
    
    if (userInitials) {
        if (username && username !== 'undefined' && username !== 'null' && username !== 'User') {
            // Get first 2 characters of username (before @ if email)
            const namepart = username.split('@')[0];
            userInitials.textContent = namepart.substring(0, 2).toUpperCase();
        } else {
            userInitials.textContent = '?';
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("Global script.js: DOMContentLoaded fired.");
    
    // Apply role restrictions and update profile (async)
    applyRoleRestrictions();

    // --- Create Mobile Sidebar Overlay ---
    const wrapper = document.getElementById("wrapper");
    if (wrapper && !document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        wrapper.appendChild(overlay);
        
        // Close sidebar when overlay is clicked
        overlay.addEventListener('click', function() {
            wrapper.classList.remove('toggled');
        });
    }

    // --- Menu Toggle Functionality ---
    const menuToggleButton = document.getElementById("menu-toggle");
    if (menuToggleButton) {
        menuToggleButton.onclick = function () {
            if (wrapper) {
                wrapper.classList.toggle("toggled");
            }
        };
    }
    
    // --- Close sidebar when clicking a nav link on mobile ---
    const sidebarNavLinks = document.querySelectorAll('#sidebar-wrapper .list-group-item-action');
    sidebarNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768 && wrapper) {
                wrapper.classList.remove('toggled');
            }
        });
    });

    // --- Logout Functionality ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
        });
    }

    // --- Active Link and Submenu Highlighting ---
    const currentPath = window.location.pathname.split('/').pop();
    const allNavLinks = document.querySelectorAll('.list-group-item-action');

    // First, remove 'active' from all links and collapse all submenus that are not parents of the active link
    allNavLinks.forEach(link => {
        link.classList.remove('active');
    });

    document.querySelectorAll('.collapse').forEach(submenu => {
        // Don't close a submenu if it contains the active link
        if (!submenu.querySelector('.list-group-item-action.active')) {
            submenu.classList.remove('show');
            const submenuToggle = document.querySelector(`[aria-controls="${submenu.id}"]`);
            if (submenuToggle) {
                submenuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Now, activate the correct link and expand its parent submenu
    allNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;
        
        const linkPath = linkHref.split('?')[0]; // Ignore URL parameters for matching

        // Check if the current path matches the link's href
        if (linkPath === currentPath) {
            link.classList.add('active'); // Activate the direct link

            // If the link is inside a submenu, expand the submenu
            const submenu = link.closest('.collapse');
            if (submenu) {
                submenu.classList.add('show');
                const submenuToggle = document.querySelector(`[aria-controls="${submenu.id}"]`);
                if (submenuToggle) {
                    submenuToggle.setAttribute('aria-expanded', 'true');
                }
            }
        }
    });
});