let currentSessions = [];
const API_URL = "";

function loadSessions(type) {
  console.log(`Loading sessions of type: ${type}`);
  axios.get(`/sessions/${type}`)
    .then(response => {
      console.log('Response data:',response.data);
      currentSessions = response.data;
      renderSessions(currentSessions);
    })
    .catch(err => console.error('Axios error:', err));
}

function renderSessions(sessions) {
  const list = document.getElementById('sessions-list');
  list.innerHTML = '';
  if (!sessions || sessions.length === 0) {
      list.innerHTML = '<li>No sessions found</li>';
      return;
  }

  sessions.forEach(client => {
    const li = document.createElement('li');

    // عرض الاسم، الهاتف، Repeat، Tags
    li.innerHTML = `
      <strong>${client.name}</strong> - ${client.phone} - Repeat: ${client.repeat || 0} 
      - Tags: ${client.tags || ''} 
      <button onclick="openNoteModal(${client.id})">📝 Add Note</button>
      <button onclick="addTag(${client.id},'VIP')">Add VIP Tag</button>
    `;
    list.appendChild(li);
  });
}
function searchSessions() {
  const input = document.getElementById('search-input').value.toLowerCase();
  const filtered = currentSessions.filter (client => 
    client.name.toLowerCase().includes(input) || client.phone.includes(input)
  );
  renderSessions(filtered);
}
function saveNote() {
    const modal = document.getElementById('note-modal');
    const clientId = modal.dataset.clientId;
    const noteText = document.getElementById('note-text').value;

    axios.post(`/sessions/add-note`, {
        clientId: clientId,
        note: noteText
    })
    .then(() => {
        closeNoteModal();
        loadSessions('all'); // إعادة تحميل الجلسات لتحديث الملاحظات
    })
    .catch(err => console.error(err));
}


function addTag(clientId, tagName) {
  const client = currentSessions.find(c => c.id === parseInt(clientId));
  if (!client) return;

  if (!client.tags) client.tags = '';
  const existingTags = client.tags.split(',').map(t => t.trim());
  if (!existingTags.includes(tagName)) {
      existingTags.push(tagName);
  }
  client.tags = existingTags.join(', ');
  renderSessions(currentSessions);
  axios.post(`/sessions/add-tag`, {
        clientId: clientId,
        tag: tagName
  })
    .then(() => loadSessions('all'))
    .catch(err => console.error(err));
}

function filterByTag() {
  const tag = document.getElementById('tag-filter').value;
  const filtered = currentSessions.filter(client => 
    !tag || (client.tags && client.tags.includes(tag))
  );
  renderSessions(filtered);
}
async function translateText(text, sourceLang, targetLang) {
    const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: "text"
        }),
        headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    return data.translatedText;
}
async function sendMessage(clientId, message) {
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    // ترجمة الرسالة قبل الإرسال
    const translatedMessage = await translateText(message, sourceLang, targetLang);

    axios.post(`/messages/send`, {
        clientId,
        message: translatedMessage
    })
    .then(res => console.log('Message sent:', res.data))
    .catch(err => console.error(err));
}

async function sendMessage(clientId, message) {
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    // ترجمة الرسالة قبل الإرسال
    const translatedMessage = await translateText(message, sourceLang, targetLang);

    axios.post(`/messages/send`, {
        clientId,
        message: translatedMessage
    })
    .then(res => console.log('Message sent:', res.data))
    .catch(err => console.error(err));
}

async function sendMessage(clientId, message) {
    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    // ترجمة الرسالة قبل الإرسال
    const translatedMessage = await translateText(message, sourceLang, targetLang);

    axios.post(`/messages/send`, {
        clientId,
        message: translatedMessage
    })
    .then(res => console.log('Message sent:', res.data))
    .catch(err => console.error(err));
}
async function onReceiveMessage(clientId, message) {
    const targetLang = document.getElementById('source-lang').value; // ترجمة للغة العرض
    const translatedMessage = await translateText(message, 'auto', targetLang);

    displayMessage(clientId, translatedMessage); // عرض الرسالة المترجمة في UI
}
/*const socket = io(); // ضع دومين السيرفر إذا تم النشر
socket.on('new_message', (data) => {
    console.log('New message notification:', data);
    // يمكنك عرضها في Dashboard
    alert(`New message from client ${data.clientId}: ${data.message}`);
});*/

