document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
    }

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);
            
            // Store role if provided in token response
            if (data.role) {
                localStorage.setItem('userRole', data.role);
            }
            
            // Store email as username initially
            localStorage.setItem('username', email);
            
            // Try to fetch full user info to get role if not in token response
            try {
                const userResponse = await fetch(`${API_URL}/users/me`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.access_token}`
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    if (userData.role) {
                        localStorage.setItem('userRole', userData.role);
                    }
                    if (userData.email) {
                        localStorage.setItem('username', userData.email);
                    }
                    if (userData.username) {
                        localStorage.setItem('username', userData.username);
                    }
                }
            } catch (userError) {
                console.log('Could not fetch user details, using email as username');
            }
            
            window.location.href = 'index.html';
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(`Login failed: ${errorData.detail || 'Please check your credentials.'}`);
            
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login';
            }
        }
    } catch (error) {
        alert(`Login error: ${error.message}`);
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login';
        }
    }
});