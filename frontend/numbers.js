const API_BASE = "https://chat.ohgo.site"; // غيّر للرابط الحقيقي

const tableBody = document.querySelector("#numbersTable tbody");
const addNumberBtn = document.getElementById("addNumberBtn");
const qrModal = document.getElementById("qrModal");
const qrImage = document.getElementById("qrImage");
const closeModal = document.getElementById("closeModal");
const searchInput = document.getElementById("search");

// تحميل الأرقام
async function loadNumbers() {
  const res = await fetch(`${API_BASE}/wa-numbers`);
  const data = await res.json();

  tableBody.innerHTML = "";
  data.forEach(num => {
    const row = `
      <tr>
        <td>${num.id}</td>
        <td>${num.number}</td>
        <td>${num.status}</td>
        <td>${num.agent_id || "-"}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="showQR(${num.id})" title="Show QR">
          <i class="fas fa-qrcode"></i></button>
          <button class="btn btn-sm btn-warning" onclick="transferAgent(${num.id})" title="Transfer">
          <i class="fas fa-exchange-alt"></i></button>
          <button class="btn btn-sm btn-danger" onclick="removeNumber(${num.id})" title="Remove">
          <i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

// عرض QR
async function showQR(numberId) {
  const res = await fetch(`${API_BASE}/wa-numbers/qr/${numberId}`);
  const data = await res.json();
  qrImage.src = data.qr;
  qrModal.style.display = "block";
}

// إضافة رقم جديد
document.getElementById("addNumberBtn").addEventListener("click", async () => {
  // افتح المودال
  const modal = new bootstrap.Modal(document.getElementById("addNumberModal"));
  modal.show();

  // أظهر رسالة تحميل مؤقتة
  document.getElementById("qr-loading").style.display = "block";
  document.getElementById("qr-canvas").style.display = "none";
 
  try {
    // اطلب QR من السيرفر (الذي يستخدم Baileys)
    const res = await axios.get("/sessions/new");
    if (!res.data.qr) throw new Error("Failed to generate QR");
    const qr = res.data.qr;

    // أرسم QR في الـ canvas
   const canvas = document.getElementById("qr-canvas");
    QRCode.toCanvas(canvas, qr, (error) => { 
      if (error) console.error(error);
      console.log("QR generated!");
    });
    const addNumberModal = new bootstrap.Modal(document.getElementById("addNumberModal"));
    addNumberModal.show();
    document.getElementById("qr-loading").style.display = "none";
    canvas.style.display = "block";

  } catch (err) {
    console.error("Error fetching QR:", err);
    document.getElementById("qr-loading").innerText = "Failed to loadQR!";
  }
});



// إغلاق المودال
if (closeModal) {
  closeModal.addEventListener("click", () => {
    qrModal.style.display = "none";
  });
}

// فلترة البحث
if (searchInput) {
  searchInput.addEventListener("input", e => {
    const filter = e.target.value.toLowerCase();
    Array.from(tableBody.rows).forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(filter)
        ? ""
        : "none";
    });
  });
}
