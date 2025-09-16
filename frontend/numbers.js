const API_BASE = "https://chat.ohgo.site"; // غيّر للرابط الحقيقي

const tableBody = document.querySelector("#numbersTable tbody");
const addNumberBtn = document.getElementById("addNumberBtn");
const searchInput = document.getElementById("search");

// تحميل الأرقام
async function loadNumbers() {
  const res = await fetch(`${API_BASE}/wa-numbers`, {credentials: "include"});
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

// إضافة رقم جديد
addNumberBtn.addEventListener("click", async () => {
  const modal = new 
    bootstrap.Modal(document.getElementById("addNumberModal"));
  modal.show();

 

  // أظهر رسالة تحميل مؤقتة
  document.getElementById("qr-loading").style.display = "block";
  document.getElementById("qr-canvas").style.display = "none";
 
  try {
    //اضف الرقم  الجديد 
    const addRes = await axios.post(`${API_BASE}/wa-numbers`, { number: "new_number" }, { withCredentials: true });
    const numberId = addRes.data.id;
    // اطلب QR من السيرفر (الذي يستخدم Baileys)
    const res = await axios.get(`${API_BASE}/wa-numbers/${numberId}/qr`, {withCredentials: true});
    if (!res.data.qr) throw new Error("Failed to generate QR");
    const qr = res.data.qr;

    // أرسم QR في الـ canvas
   const canvas = document.getElementById("qr-canvas");
    QRCode.toCanvas(canvas, qr, (error) => { 
      if (error) console.error(error);
      console.log("QR generated!");
    });
    
    document.getElementById("qr-loading").style.display = "none";
    canvas.style.display = "block";

  } catch (err) {
    console.error("Error fetching QR:", err);
    document.getElementById("qr-loading").innerText = "Failed to loadQR!";
  }
});



// إغلاق المودال
const qrModal = document.getElementById("addNumberModal");
const closeBtn = qrModal?.querySelector(".btn-close");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    const modal = bootstrap.Modal.getInstance(qrModal);
    modal.hide();
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
