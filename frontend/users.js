async function loadUsers() {
  try {
    const res = await axios.get("/users", { withCredentials: true });
    const users = res.data;
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    users.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.phone}</td>
        <td>${u.role}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button>
          ${u.role === "supervisor"
            ? `<button class="btn btn-sm btn-info" onclick="openPermModal(${u.id})">Manage Permissions</button>`
            : ""}
        </td>
      `;
      tbody.appendChild(tr);
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

    // 🔹 نحدد الراوت المناسب حسب الدور
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

    await axios.post(endpoint, { name, phone, role }, { withCredentials: true });

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

    await axios.put(endpoint, { name, phone, role }, { withCredentials: true });

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
