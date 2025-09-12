axios.defaults.withCredentials = true;
let user = null;

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}

// QR Modal
function closeQRModal() {
  document.getElementById('qr-modal').style.display = 'none';
}

// جلب بيانات المستخدم عند تحميل الصفحة
async function fetchUser() {
  try {
    const res = await axios.get('/users/me', { withCredentials: true });
    user = res.data;
    console.log("Current user:", user);

    // سوبر أدمن → إظهار زر ربط واتساب
    if (user.role === 'super_admin') {
      const qrLink = document.getElementById('qr-link');
      if (qrLink) qrLink.style.display = 'block';
    }

    // تحميل الجلسات
    loadSessions();

    // تحميل أرقام الواتساب إذا سوبر أدمن
    if (user.role === 'super_admin' && typeof loadNumbers === "function") {
      loadNumbers();
    }

  } catch (err) {
    console.error("Not logged in", err);
    window.location.href = 'index.html';
    document.getElementById("numbers-section").style.display = "block";
  }
}

// Load initial data
window.addEventListener("load", fetchUser);






















































