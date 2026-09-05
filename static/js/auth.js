/**
 * Quản lý xác thực người dùng
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeEventListeners();
        this.checkLoginStatus();
    }

    initializeEventListeners() {
        // Nút đăng nhập
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Nút đăng ký
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }

        // Nút đăng xuất
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Chỉ gắn sự kiện biểu mẫu sau khi DOM đã tải hoàn tất
        document.addEventListener('DOMContentLoaded', () => {
            // Biểu mẫu đăng nhập
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
                console.log('✅ Đã gắn trình lắng nghe sự kiện cho biểu mẫu đăng nhập');
            } else {
                console.warn('❌ Không tìm thấy biểu mẫu đăng nhập (login-form)');
            }

            // Biểu mẫu đăng ký
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => this.handleRegister(e));
                console.log('✅ Đã gắn trình lắng nghe sự kiện cho biểu mẫu đăng ký');
            } else {
                console.warn('❌ Không tìm thấy biểu mẫu đăng ký (register-form)');
            }
        });
        
        // Nhấp vào nền để đóng hộp thoại
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/user/info', { credentials: 'include' });
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.currentUser = data.user;
                console.log('✅ Người dùng đã đăng nhập:', this.currentUser);
                this.updateUserInterface();
                this.enableAllPredictionButtons();
                return;
            } else {
                console.log('ℹ️ Người dùng chưa đăng nhập:', data.message);
            }
        } catch (error) {
            console.log('⚠️ Không thể kiểm tra trạng thái đăng nhập:', error);
        }
        
        // Khi chưa đăng nhập, vô hiệu hóa tất cả nút dự đoán và cập nhật giao diện
        this.currentUser = null;
        this.updateUserInterface();
        this.disableAllPredictionButtons();
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('login-username').focus();
        }
    }

    showRegisterModal() {
        const modal = document.getElementById('register-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('register-username').focus();
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
            submitBtn.disabled = true;

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.showMessage('Đăng nhập thành công!', 'success');
                this.closeModal('login-modal');
                this.updateUserInterface();
                this.enableAllPredictionButtons();
                
                // Tải lại trang để đồng bộ trạng thái phía máy chủ
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showMessage(data.message || 'Đăng nhập thất bại', 'error');
            }

        } catch (error) {
            console.error('Đăng nhập thất bại:', error);
            this.showMessage('Lỗi mạng, vui lòng thử lại sau', 'error');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
            submitBtn.disabled = false;
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        // Kiểm tra hai mật khẩu có khớp nhau hay không
        if (password !== confirmPassword) {
            this.showMessage('Hai mật khẩu đã nhập không khớp nhau', 'error');
            return;
        }

        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: password
        };

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
            submitBtn.disabled = true;

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(registerData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('Đăng ký thành công! Vui lòng đăng nhập', 'success');
                this.closeModal('register-modal');
                
                // Tự động chuyển sang hộp thoại đăng nhập
                setTimeout(() => {
                    this.showLoginModal();
                    document.getElementById('login-username').value = registerData.username;
                }, 1000);
            } else {
                this.showMessage(data.message || 'Đăng ký thất bại', 'error');
            }

        } catch (error) {
            console.error('Đăng ký thất bại:', error);
            this.showMessage('Lỗi mạng, vui lòng thử lại sau', 'error');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng ký';
            submitBtn.disabled = false;
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.showMessage('Đã đăng xuất an toàn', 'success');
                
                // Tải lại trang
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('Đăng xuất thất bại:', error);
            this.showMessage('Đăng xuất thất bại, vui lòng thử lại sau', 'error');
        }
    }

    updateUserInterface() {
        // Khi tải lại trang, giao diện được cập nhật bởi template phía máy chủ
        // Phía máy khách chủ yếu cập nhật số lượt dự đoán còn lại
        this.updatePredictionCount();
    }

    async updatePredictionCount() {
        try {
            const response = await fetch('/api/user/can-predict', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const remainingElement = document.getElementById('predictions-remaining');
                    if (remainingElement && data.user_type === 'free') {
                        remainingElement.textContent = data.remaining;
                    }
                }
            }
        } catch (error) {
            console.log('Không thể cập nhật số lượt dự đoán:', error);
        }
    }

    async checkCanPredict() {
        try {
            const response = await fetch('/api/user/can-predict', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                return data.can_predict;
            }
            return false;
        } catch (error) {
            console.error('Không thể kiểm tra quyền dự đoán:', error);
            return false;
        }
    }

    async requireLogin() {
        if (!this.currentUser) {
            this.showMessage('Vui lòng đăng nhập để sử dụng chức năng dự đoán', 'warning');
            this.showLoginModal();
            return false;
        }
        return true;
    }

    async checkPredictionLimit() {
        // Kiểm tra trạng thái đăng nhập
        if (!this.currentUser) {
            this.showMessage('Vui lòng đăng nhập trước khi sử dụng chức năng dự đoán', 'warning');
            this.showLoginModal();
            return false;
        }
        
        const canPredict = await this.checkCanPredict();
        if (!canPredict) {
            this.showMessage('Bạn đã dùng hết lượt dự đoán miễn phí hôm nay, vui lòng nâng cấp lên gói thành viên', 'warning');
            return false;
        }
        return true;
    }

    // Vô hiệu hóa tất cả nút dự đoán
    disableAllPredictionButtons() {
        const buttons = [
            'classic-predict-btn',
            'lottery-ai-predict-btn', 
            'ai-prediction-btn',
            'generate-parlay-btn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.add('disabled');
                btn.title = 'Vui lòng đăng nhập trước';
                btn.dataset.loginRequired = 'true';
            }
        });
    }

    // Kích hoạt lại tất cả nút dự đoán
    enableAllPredictionButtons() {
        const buttons = [
            'classic-predict-btn',
            'lottery-ai-predict-btn',
            'ai-prediction-btn', 
            'generate-parlay-btn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.remove('disabled');
                btn.title = '';
                btn.dataset.loginRequired = 'false';
            }
        });
    }

    showMessage(message, type = 'info') {
        // Tạo thông báo
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas ${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Thêm vào trang
        document.body.appendChild(messageDiv);

        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-times-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
}

// Các hàm toàn cục liên quan đến hộp thoại
function closeModal(modalId) {
    authManager.closeModal(modalId);
}

function switchToRegister() {
    authManager.closeModal('login-modal');
    authManager.showRegisterModal();
}

function switchToLogin() {
    authManager.closeModal('register-modal');
    authManager.showLoginModal();
}

// Tạo phiên bản quản lý xác thực toàn cục
const authManager = new AuthManager();

// Xuất ra phạm vi toàn cục
window.authManager = authManager;