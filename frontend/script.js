// ========================
// QR Code Page
// ========================
async function fetchQRCode() {
  try {
    const response = await axios.get('https://chat.ohgo.site/sessions/qr');
    const qrCode = response.data.qr;
    if (qrCode) {
        const canvas = document.getElementById('qr-canvas');
        QRCode.toCanvas(canvas, qrCode, function (error) {
            if (error) console.error(error);
            else console.log('QR Code displayed on frontend');
        });

        // الانتقال للـ Dashboard بعد 10 ثوانٍ (يمكن تغييره حسب التأكيد الفعلي)
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 10000);
    }
  } catch (err) {
    console.error('Error fetching QR:', err);
  }
}

// فقط نفذ fetchQRCode إذا كانت الصفحة بها canvas QR
if(document.getElementById('qr-canvas')) {
    fetchQRCode();
    setInterval(fetchQRCode, 5000);
}

// ========================
// Dashboard Page
// ========================
let currentSessions = [];

function loadSessions(type) {
  console.log(`Loading sessions of type: ${type}`);
  axios.get(`/sessions/${type}`)
    .then(response => {
      console.log('Response data:', response.data);
      currentSessions = response.data;
      renderSessions(currentSessions);
    })
    .catch(err => console.error('Axios error:', err));
}

function renderSessions(sessions) {
  const tbody = document.getElementById('sessions-body');
  tbody.innerHTML = '';

  if (!sessions || sessions.length === 0) {
      tbody.innerHTML = '<div class="row">No sessions found</div>';
      return;
  }

  sessions.forEach((client, idx) => {
    const row = document.createElement('div');
    row.classList.add('row');
    if(idx === 0) row.classList.add('highlight'); // تمييز أول صف اختياري

    row.innerHTML = `
      <div>${client.id || '-'}</div>
      <div>
        <div><strong>${client.name}</strong></div>
        <div style="font-size:12px; color:#777">${client.phone}</div>
      </div>
      <div>${client.repeat || 0}</div>
      <div>${client.tags || ''}</div>
      <div>
        <button onclick="openNoteModal(${client.id})">📝 Add Note</button>
        <button onclick="addTag(${client.id},'VIP')">Add VIP Tag</button>
      </div>
    `;
    tbody.appendChild(row);
  });
}

// ========================
// البحث والفلاتر
// ========================
function searchSessions() {
  const input = document.getElementById('search-input').value.toLowerCase();
  const filtered = currentSessions.filter(client =>
    client.name.toLowerCase().includes(input) || client.phone.includes(input)
  );
  renderSessions(filtered);
}

function filterByTag() {
  const tag = document.getElementById('tag-filter').value;
  const filtered = currentSessions.filter(client =>
    !tag || (client.tags && client.tags.includes(tag))
  );
  renderSessions(filtered);
}

// ========================
// Notes Modal
// ========================
function openNoteModal(clientId) {
  const modal = document.getElementById('note-modal');
  modal.style.display = 'block';
  modal.dataset.clientId = clientId;
}

function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  modal.style.display = 'none';
  modal.dataset.clientId = '';
}

function saveNote() {
  const modal = document.getElementById('note-modal');
  const clientId = modal.dataset.clientId;
  const noteText = document.getElementById('note-text').value;

  axios.post(`/sessions/add-note`, { clientId, note: noteText })
    .then(() => {
        closeNoteModal();
        loadSessions('all'); // تحديث الجلسات بعد الحفظ
    })
    .catch(err => console.error(err));
}

// ========================
// Tags
// ========================
function addTag(clientId, tagName) {
  const client = currentSessions.find(c => c.id === parseInt(clientId));
  if (!client) return;

  if (!client.tags) client.tags = '';
  const existingTags = client.tags.split(',').map(t => t.trim());
  if (!existingTags.includes(tagName)) existingTags.push(tagName);
  client.tags = existingTags.join(', ');

  renderSessions(currentSessions);

  axios.post(`/sessions/add-tag`, { clientId, tag: tagName })
    .then(() => loadSessions('all'))
    .catch(err => console.error(err));
}

// ========================
// Translation & Messaging
// ========================
async function translateText(text, sourceLang, targetLang) {
  const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: "text" }),
      headers: { "Content-Type": "application/json" }
  });
  const data = await response.json();
  return data.translatedText;
}

async function sendMessage(clientId, message) {
  const sourceLang = document.getElementById('source-lang').value;
  const targetLang = document.getElementById('target-lang').value;

  const translatedMessage = await translateText(message, sourceLang, targetLang);

  axios.post(`/messages/send`, { clientId, message: translatedMessage })
    .then(res => console.log('Message sent:', res.data))
    .catch(err => console.error(err));
}

async function onReceiveMessage(clientId, message) {
  const targetLang = document.getElementById('source-lang').value;
  const translatedMessage = await translateText(message, 'auto', targetLang);
  displayMessage(clientId, translatedMessage); // عرض الرسالة في واجهة المستخدم
}



