axios.defaults.withCredentials = true;
let user = null;

document.addEventListener("DOMContentLoaded", () => {
  // تحميل الصفحة الافتراضية
  loadPage("home.html");

  document.querySelectorAll(".sidebar-menu a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");

      if (section === "numbers") {
        loadPage("numbers.html");
      } else if (section === "users") {
        loadPage("users.html");
      } else if (section === "groups" || section === "unread") {
        loadPage("home.html"); // أو ممكن تعمل صفحات خاصة بهم
      }
    });
  });
});

function loadPage(page) {
  fetch(page)
    .then(res => res.text())
    .then(html => {
      const main = document.getElementById("main-content");
      main.innerHTML = html;

      // استدعاء init حسب الصفحة
      if (page === "users.html" && typeof initUsersPage === "function") {
        initUsersPage();
      }
      if (page === "numbers.html" && typeof initNumbersPage === "function") {
        initNumbersPage();
      }
      if (page === "home.html" && typeof loadSessions === "function") {
  loadSessions();

  // بعد تحميل الصفحة، نعيد ربط أزرار الشات (الملفات والإيموجي)
  if (typeof rebindChatButtons === "function") {
    setTimeout(() => rebindChatButtons(), 800);
  }
      } })
    .catch(err => console.error("Error loading page:", err));
}
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
    window.currentUser = res.data;
    user = res.data;
    console.log("currentUser:", user);

    // سوبر أدمن → إظهار زر ربط واتساب
    if (user.role === 'super_admin') {
      const qrLink = document.getElementById('qr-link');
      if (qrLink) qrLink.style.display = 'block';
    }

    // تحميل الجلسات
    loadSessions();

    // تحميل الأرقام إذا سوبر أدمن
 /*   if (user.role === 'super_admin' && typeof loadNumbers === "function") {
      const numbersSection = document.getElementById("numbers-section");
      if (numbersSection) numbersSection.style.display = "block";
      loadNumbers();
    }*/

  } catch (err) {
    console.error("Error fetching user:", err);

    // بدل redirect، نعرض رسالة خطأ في الصفحة
    const main = document.getElementById("main-content");
    if (main) {
      main.innerHTML = `
        <div class="alert alert-danger mt-4">
          ⚠️ You are not logged in or there was an error fetching your session.<br>
          Please check your connection or login again.
        </div>
      `;
    }
  }
}
function applyFilters() {
  const input = document.getElementById("search-input");
  if (!input) return; // 🛡️ حماية: إذا ما وُجد العنصر، لا تكمل تنفيذ الكود
  const search = input.value.toLowerCase();
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

// ✅ وضع ليلي / نهاري
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("darkModeToggle");
  const body = document.body;

  // استرجاع آخر وضع تم حفظه
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    body.classList.add("dark-mode");
    toggleBtn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
  }

  // عند الضغط على الزر
  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");

    if (isDark) {
      toggleBtn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
      localStorage.setItem("theme", "dark");
    } else {
      toggleBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
      localStorage.setItem("theme", "light");
    }
  });
});








