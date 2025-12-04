function getAvatarColor(char) {
  if (!char) return { bg: "#444", text: "#ddd" };

  const c = char.toUpperCase();
  const colorMap = {
    A: "#3b82f6", B: "#2563eb", C: "#1d4ed8", // أزرقات
    D: "#16a34a", E: "#15803d", F: "#22c55e", // خضر
    G: "#9333ea", H: "#7e22ce", I: "#8b5cf6", // بنفسجيات
    J: "#c2410c", K: "#ea580c", L: "#f97316", // برتقالي
    M: "#b91c1c", N: "#dc2626", O: "#ef4444", // أحمر
    P: "#78350f", Q: "#92400e", R: "#b45309", // بني ذهبي
    S: "#0f766e", T: "#115e59", U: "#14b8a6", // فيروزي
    V: "#1e40af", W: "#312e81", X: "#4c1d95", // أزرق بنفسجي
    Y: "#52525b", Z: "#3f3f46" // رمادي غامق
  };

  const bg = colorMap[c] || "#475569";
  const text = lightenColor(bg, 40); // أفتح بنسبة 40%
  return { bg, text };
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? R : 255) * 0x10000 +
    (G < 255 ? G : 255) * 0x100 +
    (B < 255 ? B : 255)
  ).toString(16).slice(1);
}

function initUsersPage() {
  const user = window.currentUser;

  if (!user) {
    console.warn("⚠️ No user loaded yet, waiting...");
    return;
  }

  const usersSection = document.getElementById("users-section");

  // 👑 Super Admin → وصول كامل
  if (user.role === "super_admin") {
    if (usersSection) usersSection.style.display = "block";
    loadUsers();
    return;
  }

  // 🧑‍💼 Supervisor → يتحقق من صلاحية إدارة المستخدمين
  if (user.role === "supervisor" && user.permissions?.manage_users === true) {
    if (usersSection) usersSection.style.display = "block";
    loadUsers();
    return;
  }

  // 👨‍💻 Admin أو Agent → لا صلاحية
  console.log("🚫 لا تملك صلاحيات عرض المستخدمين");
  if (usersSection) usersSection.style.display = "none";
}
async function loadUsers() {
  try {
    const res = await axios.get("/users", { withCredentials: true });
    const users = res.data;
    const grid = document.getElementById("usersGrid");
    if (!grid) return; 
    grid.innerHTML = "";
    if (!Array.isArray(users) || users.length === 0) {
      grid.innerHTML = "<p class='text-center text-muted'>No users found</p>";
      return;
    }

    users.forEach(u => {
      const id = u.id ?? "-";
      const name = u.name ?? "-";
      const phone = u.phone ?? "-";
      const role = u.role ?? "-";
      const avatarUrl = u.avatar_url ?? null;

      // 🔹 إنشاء avatar بنفس أسلوب sessions
      let avatarHTML;
      if (avatarUrl) {
        avatarHTML = `<img src="${avatarUrl}" alt="avatar" class="number-avatar">`;
      } else {
        const firstChar = name.charAt(0).toUpperCase();
        const { bg, text } = getAvatarColor(firstChar); // استخدم نفس الدالة من sessions.js
        avatarHTML = `<div class="avatar-placeholder number-avatar" style="background:${bg}; color:${text}">${firstChar}</div>`;
      }

      const card = document.createElement("div");
      card.className = "number-card";
      card.innerHTML = `
        <div class="number-info">
          ${avatarHTML}
          <div class="number-details">
            <div class="number-name">${name}</div>
            <div class="number-role text-muted">${role}</div>
          </div>
        </div>

        <div class="number-contact">${phone}</div>
        <div class="number-agent">${id}</div>

        <div class="number-status ${
          role === "super_admin"
            ? "status-active"
            : role === "admin"
            ? "status-pending"
            : "status-blocked"
        }">${role}</div>

        <div class="number-actions">
          <button onclick="editUser(${id})" title="Edit"><i class="fas fa-edit"></i></button>
          <button onclick="deleteUser(${id})" title="Delete"><i class="fas fa-trash"></i></button>
          ${
            role === "supervisor"
              ? `<button onclick="openPermModal(${id})" title="Permissions"><i class="fas fa-key"></i></button>`
              : ""
          }
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading users", err);
  }
}

let currentUserId = null;
async function editUser(userId) {
  currentUserId = userId;
  try {
    const res = await axios.get(`/users/${userId}`, { withCredentials: true });
    const u = res.data;
    document.getElementById("editName").value = u.name;
    document.getElementById("editPhone").value = u.phone;
    document.getElementById ("editPassword").value = "";
    document.getElementById("editRole").value = u.role;
    new bootstrap.Modal(document.getElementById("editUserModal")).show();
  } catch (err) {
    console.error("Error fetching user", err);
  }
}

async function createUser() {
  try {
    const role = document.getElementById("newRole").value;
    const name = document.getElementById("newName").value;
    const phone = document.getElementById("newPhone").value;
    const password = document.getElementById("newPassword").value;   // 🔹 نحدد الراوت المناسب حسب الدور
    let endpoint = "";
    switch (role) {
      case "agent":
        endpoint = "/users/add-agent";
        break;
      case "supervisor":
        endpoint = "/users/add-supervisor";
        break;
      case "admin":
        endpoint = "/users/add-admin";
        break;
      case "super_admin":
        endpoint = "/users/add-super-admin";
        break;
      default:
        throw new Error("دور غير معروف");
    }

    await axios.post(endpoint, { name, phone, role, password }, { withCredentials: true });

    alert("✅ User created!");
    bootstrap.Modal.getInstance(document.getElementById("addUserModal")).hide();
    loadUsers();
  } catch (err) {
    console.error("Error creating user", err);
    alert("❌ Failed to create user");
  }
}

async function saveUserEdits() {
  try {
    const role = document.getElementById("editRole").value;
    const name = document.getElementById("editName").value;
    const phone = document.getElementById("editPhone").value;
    const password = document.getElementById("editPassword").value;

    // 🔹 نحدد الراوت المناسب حسب الدور للتحديث
    let endpoint = "";
    switch (role) {
      case "agent":
        endpoint = `/users/update-agent/${currentUserId}`;
        break;
      case "supervisor":
        endpoint = `/users/update-supervisor/${currentUserId}`;
        break;
      case "admin":
        endpoint = `/users/update-admin/${currentUserId}`;
        break;
      case "super_admin":
        endpoint = `/users/update-super-admin/${currentUserId}`;
        break;
      default:
        throw new Error("دور غير معروف");
    }

    await axios.put(endpoint, { name, phone, role, password }, { withCredentials: true });

    alert("✅ User updated!");
    bootstrap.Modal.getInstance(document.getElementById("editUserModal")).hide();
    loadUsers();
  } catch (err) {
    console.error("Error updating user", err);
    alert("❌ Failed to update user");
  }
}

async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  try {
    await axios.delete(`/users/${userId}`, { withCredentials: true });
    alert("User deleted!");
    loadUsers();
  } catch (err) {
    console.error("Error deleting user", err);
    alert("Failed to delete user");
  }
}

// 🔹 كود صلاحيات Supervisor
let currentSupervisorId = null;
function openPermModal(supervisorId) {
    currentSupervisorId = supervisorId;
    axios.get(`/users/${supervisorId}`, { withCredentials: true })
      .then(res => {
        const perms = res.data.permissions || {};
        document.getElementById("permUsers").checked = perms.can_manage_users;
        document.getElementById("permNumbers").checked = perms.can_manage_numbers;
        new bootstrap.Modal(document.getElementById("permModal")).show();
      });
  }

function savePermissions() {
    if (!currentSupervisorId) return;
    axios.put(`/users/permissions/${currentSupervisorId}`, {
      can_manage_users: document.getElementById("permUsers").checked,
      can_manage_numbers: document.getElementById("permNumbers").checked
    }, { withCredentials: true })
      .then(() => {
        alert("Permissions updated!");
        bootstrap.Modal.getInstance(document.getElementById("permModal")).hide();
      })
      .catch(err => {
        console.error(err);
        alert("Error updating permissions");
      });
  }

document.addEventListener("DOMContentLoaded", () => {
    loadUsers(); 
  const addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {addUserBtn.addEventListener("click", () => {
  new bootstrap.Modal(document.getElementById("addUserModal")).show();
  });
  }
});

function applyFilters() {
  const search = document.getElementById("search-users").value.toLowerCase();
  const roleFilter = document.getElementById("tagFilterUsers").value;
  const cards = document.querySelectorAll("#usersGrid .number-card");

  cards.forEach(card => {
    const name = card.querySelector(".number-name").textContent.toLowerCase();
    const role = card.querySelector(".number-role").textContent;
    let match = true;

    if (search && !name.includes(search)) match = false;
    if (roleFilter && role !== roleFilter) match = false;

    card.style.display = match ? "" : "none";
  });
}
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});
