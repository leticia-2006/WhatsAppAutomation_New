// numbers.js

// FIXED: التأكد من تحميل الـ DOM قبل التنفيذ
document.addEventListener("DOMContentLoaded", () => {
  loadNumbers();

  const addBtn = document.getElementById("addNumberBtn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddNumberModal);
  }

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", applyNumberFilter);
  }
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

    tr.innerHTML = `
      <td>${num.id}</td>
      <td>${num.number}</td>
      <td>
        <span class="badge ${num.status === "connected" ? "bg-success" : "bg-danger"}">
          ${num.status}
        </span>
      </td>
      <td>${num.agent || "-"}</td>
      <td>
        <button class="btn btn-sm btn-info" onclick="linkQR(${num.id})">
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

// ====== تصفية الأرقام ======
function applyNumberFilter() {
  const query = document.getElementById("search").value.toLowerCase();
  const rows = document.querySelectorAll("#numbersTable tbody tr");

  rows.forEach((row) => {
    const number = row.cells[1].textContent.toLowerCase();
    row.style.display = number.includes(query) ? "" : "none";
  });
}

// ====== إظهار مودال إضافة رقم جديد ======
function showAddNumberModal() {
  const modal = new bootstrap.Modal(document.getElementById("addNumberModal"));
  modal.show();

  // FIXED: عرض QR جديد عند فتح المودال
  document.getElementById("qr-loading").style.display = "block";
  document.getElementById("qr-canvas").style.display = "none";

  generateQR();
}

// ====== إنشاء QR وربطه ======
async function generateQR() {
  try {
    const res = await axios.post("/wa-numbers/generate-qr");
    const qrData = res.data.qr;

    document.getElementById("qr-loading").style.display = "none";
    const canvas = document.getElementById("qr-canvas");
    canvas.style.display = "block";

    await QRCode.toCanvas(canvas, qrData);
  } catch (err) {
    console.error("Error generating QR:", err);
    document.getElementById("qr-loading").textContent = "Error generating QR";
  }
}

// ====== ربط رقم عبر QR ======
async function linkQR(id) {
  try {
    const res = await axios.post(`/wa-numbers/${id}/link`);
    alert("Number linked successfully!");
    loadNumbers(); // FIXED: إعادة تحميل الجدول بعد الربط
  } catch (err) {
    console.error("Error linking number:", err);
  }
}

// ====== حذف رقم ======
async function deleteNumber(id) {
  if (!confirm("Are you sure you want to delete this number?")) return;

  try {
    await axios.delete(`/wa-numbers/${id}`);
    loadNumbers(); // FIXED: إعادة تحميل الجدول بعد الحذف
  } catch (err) {
    console.error("Error deleting number:", err);
  }
}
