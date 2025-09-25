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
    document.addEventListener("DOMContentLoaded", () => {
    loadUsers(); // ⬅️ هنا يتم استدعاؤها مباشرة عند فتح الصفحة
  });
  
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
