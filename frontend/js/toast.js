// Toast Notification System
const Toast = {
    container: null,

    init() {
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    },

    show(message, type = 'info') {
        if (!this.container) this.init();

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${icons[type]}"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }
};

// Global shorthand
window.showToast = (message, type) => Toast.show(message, type);
