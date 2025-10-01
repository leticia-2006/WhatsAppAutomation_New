document.addEventListener("DOMContentLoaded", () => {
  loadNumbers();

  const addBtn = document.getElementById("addNumberBtn");
  if (addBtn) addBtn.addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("addNumberModal")).show();
  });

  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.addEventListener("input", applyNumberFilter);
});

// ====== جلب الأرقام من السيرفر ======
async function loadNumbers() {
  try {
    const res = await axios.get("/wa-numbers");
    renderNumbers(res.data);
  } catch (err) {
    console.error("Error loading numbers:", err);
  }
}

// ====== عرض الأرقام في الجدول ======
function renderNumbers(numbers) {
  const tbody = document.querySelector("#numbersTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  numbers.forEach((num) => {
    const tr = document.createElement("tr");

    const statusClass =
      num.status === "Active" ? "bg-success" :
      num.status === "Blocked" ? "bg-secondary" : "bg-danger";

    tr.innerHTML = `
      <td>${num.id}</td>
      <td>${num.number}</td>
      <td><span class="badge ${statusClass}">${num.status}</span></td>
      <td>${num.assigned_agent_id || "-"}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="showQR(${num.id})">
          <i class="fas fa-qrcode"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteNumber(${num.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
// ====== فتح مودال التحويل ======
async function openTransferModal(id) {
  document.getElementById("transferNumberId").value = id;

  try {
    // جلب قائمة الوكلاء
    const res = await axios.get("/users?role=agent");
    const agents = res.data;

    const select = document.getElementById("agentSelect");
    select.innerHTML = `<option value="">Select Agent</option>`;
    agents.forEach(agent => {
      const option = document.createElement("option");
      option.value = agent.id;
      option.textContent = agent.username;
      select.appendChild(option);
    });

    new bootstrap.Modal(document.getElementById("transferModal")).show();
  } catch (err) {
    console.error("Error loading agents:", err);
    alert("Error loading agents");
  }
}

// ====== تأكيد التحويل ======
async function confirmTransfer() {
  const numberId = document.getElementById("transferNumberId").value;
  const agentId = document.getElementById("agentSelect").value;

  if (!agentId) return alert("Please select an agent");

  try {
    await axios.post(`/wa-numbers/${numberId}/transfer`, { agentId });
    bootstrap.Modal.getInstance(document.getElementById("transferModal")).hide();
    loadNumbers();
  } catch (err) {
    console.error("Error transferring number:", err);
    alert("Error transferring number");
  }
}

// ====== تصفية الأرقام ======
function applyNumberFilter() {
  const query = document.getElementById("search").value.toLowerCase();
  const rows = document.querySelectorAll("#numbersTable tbody tr");

  rows.forEach((row) => {
    const number = row.cells[1].textContent.toLowerCase();
    row.style.display = number.includes(query) ? "" : "none";
  });
}

// ====== إضافة رقم جديد ======
async function saveNewNumber() {
  const number = document.getElementById("newNumber").value.trim();
  if (!number) return alert("Enter a number");

  try {
    const res = await axios.post("/wa-numbers", { number });
    const id = res.data.id;

    // إخفاء المودال بالطريقة الصحيحة
    const modalEl = document.getElementById("addNumberModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.hide();

    // مباشرة بعد الحفظ نعرض QR
    showQR(id);

    loadNumbers();
  } catch (err) {
    console.error("Error adding number:", err);
    alert("Error adding number");
  }
}
}

// ====== إظهار QR ======
async function showQR(id) {
  const modal = new bootstrap.Modal(document.getElementById("qrModal"));
  modal.show();

  document.getElementById("qr-loading").style.display = "block";
  document.getElementById("qr-canvas").style.display = "none";

  try {
    const res = await axios.get(`/wa-numbers/${id}/qr`);
    const qrData = res.data.qr;

    if (!qrData) {
      document.getElementById("qr-loading").innerText = res.data.message || "No QR available";
      return;
    }

    const canvas = document.getElementById("qr-canvas");
    await QRCode.toCanvas(canvas, qrData);

    document.getElementById("qr-loading").style.display = "none";
    canvas.style.display = "block";
  } catch (err) {
    console.error("Error showing QR:", err);
    document.getElementById("qr-loading").innerText = "Error loading QR";
  }
}

// ====== حذف رقم ======
async function deleteNumber(id) {
  if (!confirm("Are you sure you want to delete this number?")) return;

  try {
    await axios.delete(`/wa-numbers/${id}`);
    loadNumbers();
  } catch (err) {
    console.error("Error deleting number:", err);
    alert("Error deleting number");
  }
}
