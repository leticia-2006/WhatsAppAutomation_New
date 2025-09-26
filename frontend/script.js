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
    window.currrentUser= res.data; user = res.data;
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
async function loadSessionsByRole(role, userId) {
  try {
    let res;
    if (role === "agent") {
      res = await axios.get(`/users/sessions/agent/${userId}`, { withCredentials: true });
    } else if (role === "admin" || role === "super_admin" || role === "supervisor") {
      res = await axios.get(`/users/sessions`, { withCredentials: true });
    }

    const sessions = res.data;
    const list = document.getElementById("sessions-body");
    list.innerHTML = "";
    sessions.forEach(s => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
  <img src="${s.avatar || 'default.png'}" class="client-avatar">
  <div class="client-info">
    <div class="top">
      <span>${s.client_name || s.number}</span>
      <small>${s.last_seen || ''}</small>
    </div>
    <div class="last-msg">${s.last_message || ''}</div>
    <div class="client-tags">
      ${(s.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
  </div>
`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading sessions", err);
  }
}


// Load initial data
window.addEventListener("load", fetchUser);
































































