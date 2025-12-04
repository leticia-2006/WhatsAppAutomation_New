// ====== التأكد من تحميل المستخدم قبل تشغيل الصفحة ======
async function waitForUser() {
  return new Promise((resolve) => {
    const checkUser = setInterval(() => {
      if (window.currentUser && window.currentUser.role) {
        clearInterval(checkUser);
        resolve(window.currentUser);
      }
    }, 100); // يفحص كل 100ms
  });
}

(async () => {
  const user = await waitForUser();
  window.userRole = (user.role || localStorage.getItem("role") || "").toLowerCase();
  localStorage.setItem("role", window.userRole);
  console.log("✅ userRole loaded:", window.userRole);
  initNumbersPage(); // بعد التأكد من تحميل الدور
})();
async function initNumbersPage() {
  // الآن numbers-section موجود في DOM
  const numbersSection = document.getElementById("numbers-section");
  if (!numbersSection) return;
  numbersSection.style.display = "block"; 
  loadNumbers(); 

  const addBtn = document.getElementById("addNumberBtn");
  if (addBtn && window.userRole === "super_admin") {
    addBtn.style.display = "inline-block";
    addBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("addNumberModal"));
      modal.show();
    });
  }
  // ربط زر الحفظ في المودال
  const saveBtn = document.querySelector("#addNumberModal .btn-success");
  if (saveBtn) saveBtn.addEventListener("click", saveNewNumber);
  // ربط البحث للتصفية
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", applyNumberFilter);
  }
}

// ====== جلب الأرقام من السيرفر ======
async function loadNumbers() {
  console.log("📌 Calling /wa-numbers API...");
  try {
    const res = await axios.get("/wa-numbers");
    console.log("✅ API responded:", res.data);
    renderNumbers(res.data);
  } catch (err) {
    console.error("❌ Axios error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else if (err.request) {
      console.error("No response received:", err.request);
    } else {
      console.error("Error message:", err.message);
    }
  }
}

// ====== عرض الأرقام في الجدول ======
function renderNumbers(numbers) {
 const canTransfer = ["super_admin", "admin", "supervisor"].includes(window.userRole);
 const canDelete = window.userRole === "super_admin";
 const canAdd = window.userRole === "super_admin";
  const grid = document.getElementById("numbersGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!Array.isArray(numbers) || numbers.length === 0) {
    grid.innerHTML = "<p class='text-center text-muted'>No numbers found</p>";
    return;
  }

  numbers.forEach((num) => {
    const id = num.id ?? "-";
    const phoneNumber = num.number ?? "-";
    const status = num.status ?? "Unknown";
    const agentId = num.assigned_to ?? "-";
    const clientName = num.client_name ?? `Unknown User`;
    const avatar = num.client_avatar ?? "/images/default-avatar.png";
    const statusClass =
      status === "Active"
        ? "status-active"
        : status === "Pending"
        ? "status-pending"
        : "status-blocked";

    const card = document.createElement("div");
card.className = "number-card";
card.innerHTML = `
  <div class="number-info">
    <img src="${avatar}" alt="avatar" class="number-avatar">
    <div class="number-details">
      <div class="number-name">${clientName}</div>
      </div>
      </div>

  <div class="number-contact">${phoneNumber}</div>
  <div class="number-agent">${agentId}</div>
  <div class="number-status ${statusClass}">${status}</div>

  <div class="number-actions">
    <button onclick="showQR('${id}')" title="Show QR"><i class="fas fa-qrcode"></i></button>
    ${canTransfer ? `<button onclick="openTransferModal('${id}')" title="Transfer"><i class="fas fa-exchange-alt"></i></button>` : ""}
    ${canDelete ? `<button onclick="deleteNumber('${id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ""}
  </div>
`;
grid.appendChild(card);
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
      option.textContent = agent.name;
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
