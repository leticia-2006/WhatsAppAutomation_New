function initNumbersPage() {
  const numbersSection = document.getElementById("numbers-section");
  if (!numbersSection) return;
  numbersSection.style.display = "block";
  const addBtn = document.getElementById("addNumberBtn");
  if (addBtn) addBtn.addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("addNumberModal")).show();
  });

  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.addEventListener("input", applyNumberFilter);
  loadNumbers();
}

// ====== جلب الأرقام من السيرفر ======
async function loadNumbers() {
  try {
    const res = await axios.get("/wa-numbers");
    renderNumbers(res.data);
  } catch (err) {
    if (err.response) {
      // الخطأ من السيرفر (status, data)
      console.error("Server responded with error:", err.response.status, err.response.data);
    } else if (err.request) {
      // لم يصل الرد من السيرفر
      console.error("No response received:", err.request);
    } else {
      // خطأ في الجافاسكربت نفسه
      console.error("Error setting up request:", err.message, err.stack);
    }
  }
}

// ====== عرض الأرقام في الجدول ======
function renderNumbers(numbers) {
  const tbody = document.querySelector("#numbersTable tbody");
  if (!tbody) return;
  if (!Array.isArray(numbers) || numbers.length === 0) {
  tbody.innerHTML = "<tr><td colspan='5'>No numbers found</td></tr>";
  return;
 }
  tbody.innerHTML = "";
  numbers.forEach((num) => {
    const id = num.id ?? "-";
    const number = num.number ?? "-";
    const status = num.status ?? "Unknown";
    const assigned = num.assigned_agent_id ?? "-";

    const statusClass =
      status === "Active" ? "bg-success" :
      status === "Blocked" ? "bg-secondary" : "bg-danger";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${id}</td>
      <td>${number}</td>
      <td><span class="badge ${statusClass}">${status}</span></td>
      <td>${assigned}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="showQR('${id}')">
          <i class="fas fa-qrcode"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteNumber('${id}')">
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
    console.error("Error in openTransferModal():", err.stack);
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
    console.error("Error in confirmTransfer():", err.stack);
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
    console.error("Error in saveNewNumber():", err.stack);
    alert("Error adding number");
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
    console.error("Error in showQR():", err.stack);
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
    console.error("Error in DeleteNumber():", err.stack);
    alert("Error deleting number");
  }
}
document.addEventListener("DOMContentLoaded", initNumbersPage);
