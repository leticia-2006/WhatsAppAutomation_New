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
 const modal = document.getElementById('addNumberModal');
  if (modal) {
    modal.style.display = 'none';}
}

// جلب بيانات المستخدم عند تحميل الصفحة
async function fetchUser() {
    try {
      const res = await axios.get('/users/me', { withCredentials: true });
    window.currentUser= res.data; user = res.data;
    console.log("currentUser:", user);

    // سوبر أدمن → إظهار زر ربط واتساب
    if (user.role === 'super_admin') {
      const qrLink = document.getElementById('qr-link');
      if (qrLink) qrLink.style.display = 'block';
    }

    // تحميل الجلسات
    loadSessions();

    // تحميل أرقام الواتساب إذا سوبر أدمن
    if (user.role === 'super_admin' && typeof loadNumbers === "function") {
      document.getElementById("numbers-section").style.display = "block";
      loadNumbers();
    }

  } catch (err) {
    console.error("Not logged in", err);
    window.location.href = 'index.html';
   }
}
function applyFilters() {
  const search = document.getElementById("search-input").value.toLowerCase();
  const rows = document.querySelectorAll("#sessions-body tr");
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(search) ? "" : "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSessions(); // نستعمل دالة sessions.js
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("translate-btn")) {
    const msgEl = e.target.closest(".msg-content").querySelector(".bubble");
    const translatedEl = e.target.closest(".msg-content").querySelector(".translated-text");
    
    const originalText = msgEl.innerText;

    try {
      // هنا تستدعي API الترجمة اللي عندك (Google Translate أو سيرفر داخلي)
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText, targetLang: "ar" }) // مثال: ترجم للعربية
      });

      const data = await res.json();
      translatedEl.innerText = data.translated || "⚠️ Translation failed";
      translatedEl.style.display = "block";
    } catch (err) {
      console.error("Translation error:", err);
      translatedEl.innerText = "⚠️ Error";
      translatedEl.style.display = "block";
    }
  }
});
// Load initial data
window.addEventListener("load", fetchUser);


