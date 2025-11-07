// sessions.js
let sessions = [];
let currentTab = "all";
let currentSession = null;

// ====== تغيير التبويبات ======
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar-menu a");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      currentTab = link.dataset.section;
      loadSessions();
    });
  });
});

let selectedGroupId = "all"; // أو قيمة افتراضية مناسبة

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/users/me");
    const user = await res.json();

    const usernameEl = document.getElementById("username");
    const avatarEl = document.querySelector(".avatar-wrapper");

    usernameEl.textContent = user.name || "My Account";

    // إذا لم يكن لديه صورة، أنشئ Avatar حرفي بنفس منطق العملاء
    if (!user.avatar_url || user.avatar_url === "") {
      const firstChar = user.name ? user.name.charAt(0).toUpperCase() : "?";
      const { bg, text } = getAvatarColor(firstChar);

      avatarEl.innerHTML = `
        <div class="avatar-placeholder" 
             style="background:${bg}; color:${text}; width:50px; height:50px; 
             border-radius:50%; display:flex; align-items:center; 
             justify-content:center; font-weight:bold; font-size:22px;">
          ${firstChar}
        </div>`;
    } else {
      avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="User" class="avatar"/>`;
    }

  } catch (err) {
    console.error("❌ Error loading user profile:", err);
  }
});
const wrapper = document.getElementById("userAvatarWrapper");
const fileInput = document.getElementById("userAvatarInput");
const overlay = document.getElementById("userAvatarOverlay");

wrapper.onclick = () => {
  wrapper.classList.add("active");
  setTimeout(() => wrapper.classList.remove("active"), 2500);
};

overlay.onclick = (e) => {
  e.stopPropagation();
  fileInput.click();
};

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("userAvatar").innerHTML =
      `<img src="${ev.target.result}" class="avatar" alt="User">`;
  };
  reader.readAsDataURL(file);

  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch("/users/upload-avatar", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await res.json();
  if (data.success && data.avatar_url) {
    document.getElementById("userAvatar").innerHTML =
      `<img src="${data.avatar_url}" class="avatar" alt="User">`;
  } else {
    alert("فشل رفع الصورة");
  }
};
// ====== تحميل الجلسات من API ======
async function loadSessions() {
  try {
    let url = `/sessions/all`;
    if (currentTab === "unread") { url = `/sessions/unread`;
    } else if (currentTab === "unreplied") { url = `/sessions/unreplied`;
    } else if (currentTab === "groups") { 
    const groupId = selectedGroupId || "all"; // أو أي قيمة افتراضية
    url= `/sessions/group/${groupId}`;
    } 
    // FIXED: placeholder groupId
    const res = await axios.get(url, { withCredentials: true });
    
    // FIXED: دعم صلاحية الوكيل (Agent)
    sessions = res.data;
    let filtered = sessions;
    if (window.currentUser?.role === "agent") {
  filtered = sessions.filter((s) => s.assigned_agent_id === window.currentUser.id);
} else if (window.currentUser?.role === "admin") {
  filtered = sessions; // ✅ المشرف يرى جميع الجلسات
    }
    renderSessions(filtered, currentTab);
    updateSidebarCounts(sessions);
  } catch (err) {
    console.error("Error loading sessions:", err);
  }
}

// 🔹 Search bar
document.addEventListener("DOMContentLoaded", () => { 
  const searchBar = document.getElementById("search-clients");
  const tagFilter = document.getElementById("filter-tag");

  // 🔍 البحث
  if (searchBar) {
    searchBar.addEventListener("input", () => {
      const value = searchBar.value.toLowerCase();
      const filtered = sessions.filter((s) =>
        (s.name || "").toLowerCase().includes(value) ||
        (s.phone || "").includes(value) ||
        (s.tags?.join(" ") || "").toLowerCase().includes(value) ||
        (s.last_message || "").toLowerCase().includes(value)
      );
      renderSessions(filtered);
    });
  }

  // 🏷️ الفلترة بالوسوم
  if (tagFilter) {
    tagFilter.addEventListener("change", async () => {
      const tag = tagFilter.value;

      try {
        let res;
        if (tag === "all") {
         res = await axios.get(`/sessions?filter=all`, { withCredentials: true }); 
        } else {
         res = await axios.get(`/sessions?filter=${tag}`, { withCredentials: true });
        }

        sessions = res.data;
        renderSessions(sessions, tag);
        updateSidebarCounts(sessions);
      } catch (err) {
        console.error("Error filtering by tag:", err);
      }
    });
  }
});
function getAvatarColor(char) {
  if (!char) return { bg: "#444", text: "#ddd" };

  const c = char.toUpperCase();
  const colorMap = {
    A: "#3b82f6", B: "#2563eb", C: "#1d4ed8", // أزرقات
    D: "#16a34a", E: "#15803d", F: "#22c55e", // خضر
    G: "#9333ea", H: "#7e22ce", I: "#8b5cf6", // بنفسجيات
    J: "#c2410c", K: "#ea580c", L: "#f97316", // برتقالي
    M: "#b91c1c", N: "#dc2626", O: "#ef4444", // أحمر
    P: "#78350f", Q: "#92400e", R: "#b45309", // بني ذهبي
    S: "#0f766e", T: "#115e59", U: "#14b8a6", // فيروزي
    V: "#1e40af", W: "#312e81", X: "#4c1d95", // أزرق بنفسجي
    Y: "#52525b", Z: "#3f3f46" // رمادي غامق
  };

  const bg = colorMap[c] || "#475569";
  const text = lightenColor(bg, 40); // أفتح بنسبة 40%
  return { bg, text };
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? R : 255) * 0x10000 +
    (G < 255 ? G : 255) * 0x100 +
    (B < 255 ? B : 255)
  ).toString(16).slice(1);
}
// بعد التعديل (نسخة محسّنة)
function renderSessions(list = [], filterType = "all") {
  const container = document.getElementById("sessions-body");
  if (!container) return;
  container.innerHTML = "";

  const ul = document.createElement("ul");
  ul.className = "clients-list";

  list.forEach((session) => {
    // فلترة حسب التبويب
    if (filterType === "unread" && session.status !== "unread") return;
    if (filterType === "unreplied" && session.status !== "unreplied") return;
    if (filterType === "group" && !session.group_id) return;
    
    if (session.avatar_url === "" || session.avatar_url === undefined) {
  session.avatar_url = null;
}
    // إنشاء العنصر
    const card = document.createElement("div");
    card.className = `client-card ${session.status === "unread" ? "unread" : ""}`;

    // المحتوى النصي
    const info = document.createElement("div");
    info.className = "client-info";
   card.innerHTML = `
  <div class="list-avatar-wrapper">
    ${
      session.avatar_url
        ? `<img src="${session.avatar_url}" class="list-client-avatar" alt="avatar">`
        : session.name
        ? (() => {
            const { bg, text } = getAvatarColor(session.name.charAt(0));
            return `<div class="avatar-placeholder" style="--avatar-bg:${bg}; --avatar-text:${text}; background:${bg}; color:${text};">
                      ${session.name.charAt(0).toUpperCase()}
                    </div>`;
          })()
        : `<img src="/default-avatar.png" class="list-client-avatar" alt="avatar">`
    }
    <span class="list-status-dot ${session.is_online ? "online" : "offline"}"></span>
  </div>

  <div class="client-info">
    <div class="client-top">
      <div class="client-name">${session.name || session.client_name || session.phone}</div>
      <div class="client-message">${session.last_message ? session.last_message.slice(0, 30) + "…" : "No messages yet"}</div>
    </div>
    <div class="client-status ${session.is_online ? "online" : "offline"}"></div>
    <div class="client-labels">
      ${(session.labels || []).map(l => `<span class="label">${l}</span>`).join("")}
    </div>
  </div>

  <div class="client-tags">
    ${session.is_repeat ? '<span class="tag">Repeat</span>' : ""}
    ${(
      Array.isArray(session.tags)
        ? session.tags
        : typeof session.tags === "string" && session.tags.trim() !== ""
        ? session.tags.split(",").map(t => t.trim())
        : []
    )
      .map(t => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`)
      .join("")}
  </div>

  <small class="client-time">${timeAgoEN(session.updated_at || session.last_active)}</small>
`;
    
  // حدث النقر لفتح الدردشة
    card.onclick = () => {
      openChat(session);
      selectClient(session);
    };

  // حدث النقر باليمين
    card.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, session);
    };

    container.appendChild(card);

  const counter = document.getElementById("session-count");
  if (counter)
    counter.innerText = `${list.length} clients (${filterType})`;
});
};
 function timeAgoEN(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return "Active now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Active ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days} day${days > 1 ? "s" : ""} ago`;
}

     

// ====== فتح المحادثة ======
async function openChat(session) {
  currentSession = session;
  selectedSessionId = session.id;
  selectedClientId = session.client_id;
  document.getElementById("chatClient").innerText = session.name || session.phone;
  
  await loadMessages(session.id);
  await loadNotes(session.client_id); //
   // ✅ ربط زر الإرسال
  const sendBtn = document.getElementById("send-btn");
  if (sendBtn) {
    sendBtn.replaceWith(sendBtn.cloneNode(true));
document.getElementById("send-btn").onclick = () => sendMessage(selectedSessionId);
      } else {
        alert("⚠️ اختر محادثة أولاً");
      }
}

// ====== تحميل الرسائل ======
async function loadMessages(sessionId) {
  try {
    const res = await axios.get(`/messages/${sessionId}`, { withCredentials: true });
    const messages = res.data;
    if (window.autoTranslateEnabled) {
  messages.forEach(m => {
    if (m.sender_type === "client") translateMessage(m.id);
  });
    }
    const chatBox = document.getElementById("chatMessages");
    if (!chatBox) return;

    chatBox.innerHTML = "";

    messages.forEach((msg) => {
      let content = msg.content
     
    if (msg.is_deleted) {
    content = `
      <div class="deleted-msg">
  <strong>🗑 Deleted by ${msg.deleted_by || "system"}</strong>
  <div class="deleted-content">${msg.content || "(no content)"}</div>
      </div>
    `;
  }
// FIXED: دعم أنواع الميديا
if (
  (msg.content_type === "image" && msg.media_url) ||
  (msg.content && msg.content.match(/\.(jpg|jpeg|png|gif|webp)$/i))
) {
  const fullUrl = msg.media_url
    ? (msg.media_url.startsWith("http") ? msg.media_url : `${window.location.origin}${msg.media_url}`)
    : msg.content;

  content = `
  <div class="msg-media">
    <img src="${fullUrl}" alt="Image">
  </div>
`;
}
   if (msg.content_type === "video" && msg.media_url) {
        content = `<video controls style="max-width:250px; border-radius:8px;">
                     <source src="${msg.media_url}" type="video/mp4">
                   </video>`;
  }
  if (msg.content_type === "audio" && msg.media_url) {
        content = `<audio controls>
                     <source src="${msg.media_url}" type="audio/mpeg">
                   </audio>`;
  }

      const time = new Date(msg.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const div = `
  <div class="message ${msg.sender_type === "client" ? "other" : "me"}" data-id="${msg.id}">
    <img src="${msg.sender_avatar || msg.agent_avatar || 'assets/avatar.png'}" class="avatar" />
    <div class="msg-content">
      <div class="meta">${msg.sender_name || 'User'}, ${time}</div>
      <div class="bubble">${content}</div>
      <button class="translate-btn" onclick="translateMessage(${msg.id})">Translate</button>
      ${
        msg.translated_content
          ? `<em class="translated-text">🌐 ${msg.translated_content}</em>`
          : `<em class="translated-text" style="display:none"></em>`
      }
    </div>
  </div>
`;

      chatBox.innerHTML += div;
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// ====== إرسال رسالة ======
async function sendMessage(sessionId) {
  const textInput = document.getElementById("msgInput");
  const fileInput = document.getElementById("mediaInput");

  try {
    // إذا المستخدم أرفق ملف
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // إنشاء FormData لإرسال الملف
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", file.type.split("/")[0]); // image/video/audio

      await axios.post(`/messages/${sessionId}/sendMedia`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      // مسح الملف بعد الإرسال
      fileInput.value = "";
    } else {
      // إرسال رسالة نصية
      const text = textInput.value.trim();
      if (!text) return; // لا ترسل رسالة فارغة

      const payload = { content : text };

      await axios.post(`/messages/${sessionId}/send`, payload, {
        withCredentials: true,
      });

      // مسح مربع النص بعد الإرسال
      textInput.value = "";
    }

    // تحديث المحادثة بعد الإرسال
  loadMessages(sessionId);
  loadSessions(); // لتحديث قائمة الجلسات بآخر رسالة

  } catch (err) {
    console.error("Error sending message", err);
    alert("Failed to send message");
  }
}


    
// ====== ترجمة رسالة ======
// ✅ التحكم في اللغة المختارة
window.currentLang = localStorage.getItem("chat_lang") || "en";

document.addEventListener("DOMContentLoaded", () => {
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = window.currentLang;
  }
});

// عند تغيير اللغة
function setUserLanguage(lang) {
  window.currentLang = lang;
  localStorage.setItem("chat_lang", lang);

  // تحديث اتجاه الصفحة إذا كانت عربية
  document.documentElement.setAttribute("lang", lang);
  document.body.style.direction = (lang === "ar") ? "rtl" : "ltr";

  console.log("✅ Language set to:", lang);
}

window.translateMessage = async function(messageId) {
  try {
    const res = await axios.post(
      `/messages/${messageId}/translate`,
      { lang: window.currentLang || "en" },
      { withCredentials: true }
    );

    const messageEl = document.querySelector(`.message[data-id="${messageId}"]`);
    if (!messageEl) return;

    const translatedText = res.data.translated;
    if (translatedText) {
      let translatedEl = messageEl.querySelector(".translated-text");
      if (!translatedEl) {
        translatedEl = document.createElement("div");
        translatedEl.className = "translated-text";
        messageEl.querySelector(".msg-content").appendChild(translatedEl);
      }
      translatedEl.style.display = "block";
      translatedEl.innerHTML = `🌐 ${translatedText}`;
    }
  } catch (err) {
    console.error("Error translating message:", err);
  }
};

// ====== ملاحظات ======
async function loadNotes(clientId) {
  try {
    const res = await axios.get(`/clients/${clientId}/notes`, { withCredentials: true });
    const notes = Array.isArray(res.data) ? res.data : res.data.notes || [];

    const listContainer = document.getElementById("notes-list");
    const textarea = document.getElementById("detail-notes");

    if (!listContainer || !textarea) return;

    // تنظيف القديم
    listContainer.innerHTML = "";

    if (notes.length === 0) {
      listContainer.innerHTML = `<div class="note-item">No notes yet...</div>`;
    } else {
      notes.forEach(n => {
        const noteEl = document.createElement("div");
        noteEl.className = "note-item";
        noteEl.innerHTML = `
          <div class="note-time">🕓 ${new Date(n.created_at).toLocaleString()}</div>
          <div class="note-text">${n.note}</div>
        `;
        listContainer.prepend(noteEl);
      });
    }

    textarea.value = ""; // فقط لكتابة ملاحظة جديدة
    textarea.dataset.clientId = clientId;

  } catch (err) {
    console.error("Error loading notes:", err);
  }
}

// ✅ حفظ الملاحظة الجديدة وإضافتها للقائمة مباشرة
async function saveNoteDirect() {
  const textarea = document.getElementById("detail-notes");
  if (!textarea) return;

  const clientId = textarea.dataset.clientId;
  const noteText = textarea.value.trim();
  if (!noteText) return; // لا ترسل ملاحظة فارغة

  try {
    const res = await axios.post(`/clients/${clientId}/notes`, { note: noteText }, { withCredentials: true });

    // إنشاء عنصر جديد وإضافته للأعلى
    const newNote = document.createElement("div");
    newNote.className = "note-item";
    newNote.innerHTML = `
      <div class="note-time">🕓 ${new Date().toLocaleString()}</div>
      <div class="note-text">${noteText}</div>
    `;
    const listContainer = document.getElementById("notes-list");
    listContainer.prepend(newNote);

    // مسح مربع الإدخال
    textarea.value = "";

  } catch (err) {
    console.error("Error saving note:", err);
    alert("❌ Failed to save note.");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("detail-notes");
  if (textarea) {
    textarea.addEventListener("blur", saveNoteDirect);
  }

  const saveBtn = document.getElementById("save-notes");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveNoteDirect);
  }
const blockBtn = document.getElementById("block-client");
if (blockBtn) blockBtn.onclick = () => blockCustomer(selectedClientId);
});


let selectedSession = null;
let selectedSessionId = null;
let selectedClientId = null;

function showContextMenu(e, session) {
  e.preventDefault();
  selectedSession = session;
  selectedSessionId = session.id;
  selectedClientId = session.client_id;

  // إزالة التحديد السابق
  document.querySelectorAll("#sessions-body li")
    .forEach(li => li.classList.remove("context-selected"));

  // إضافة تحديد للجلسة الحالية
  e.currentTarget.classList.add("context-selected");

  const menu = document.getElementById("contextMenu");
  const { innerWidth, innerHeight } = window;

  let x = e.pageX;
  let y = e.pageY;

  // لو القائمة قربت من اليمين
  if (x + menu.offsetWidth > innerWidth) {
    x = innerWidth - menu.offsetWidth - 10;
  }
  // لو القائمة قربت من الأسفل
  if (y + menu.offsetHeight > innerHeight) {
    y = innerHeight - menu.offsetHeight - 10;
  }

  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.style.display = "block";
}
// إخفاء القائمة عند أي كليك
document.addEventListener("click", () => {
  document.getElementById("contextMenu").style.display = "none";
});

// أمثلة على العمليات
function setupGroups() {
  alert("Setup groups for: " + selectedSession?.name);
}
function deleteTag() {
  alert("Delete tag from: " + selectedSession?.name);
}
function blockMessaging() {
  alert("Blocked messaging for: " + selectedSession?.name);
}
function unpinSession() {
  alert("Unpinned: " + selectedSession?.name);
}
function doNotDisturb() {
  alert("DND mode enabled for: " + selectedSession?.name);
}
function syncMessages() {
  alert("Syncing messages...");
}
function batchOperation() {
  alert("Batch operation...");
}
function applyTagFilter(tag) {
  const items = document.querySelectorAll("#sessions-body li, #sessionsTable tbody tr");

  items.forEach(item => {
    if (tag === "all" || item.classList.contains(tag)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // حفظ الخيار في localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}
async function transferSession() {
  const agentId = prompt("🔄 Enter Agent ID to transfer:");
  if (!agentId) return;
await axios.post(`/sessions/transfer`, {
    sessionId: selectedSessionId,
    agentId
  });
alert("✅ Session transferred!");
  hideContextMenu();
}
// إضافة Tag
async function setTag() {
  const tag = prompt("🏷️ Enter Tag:");
  if (!tag) return;

  await axios.post(`/clients/${selectedClientId}/tags`, { tag });
  alert("✅ Tag added!");
  hideContextMenu();
}
// إضافة Label
async function setLabel() {
  const label = prompt("📌 Enter Label:");
  if (!label) return;

  await axios.post(`/sessions/${selectedSessionId}/label`, { label });
  alert("✅ Label set!");
  hideContextMenu();
}
// تحديث Avatar
async function refreshAvatar() {
  await axios.post(`/clients/${selectedClientId}/refresh-avatar`);
  alert("🔄 Avatar refreshed!");
  hideContextMenu();
}
// Pin/Unpin
async function pinSession() {
  await axios.post(`/sessions/${selectedSessionId}/pin`);
  alert("📌 Session pinned/unpinned!");
  hideContextMenu();
}
// Mark Unread
async function markUnread() {
  await axios.post(`/sessions/${selectedSessionId}/unread`);
  alert("📩 Session marked as unread!");
  hideContextMenu();
}
// Block Customer
async function blockCustomer() {
  if (!confirm("🚫 Block this customer?")) return;

  await axios.post(`/clients/${selectedClientId}/block`);
  alert("🚫 Customer blocked!");
  hideContextMenu();
}
// عند التحميل استرجاع الإعداد
window.addEventListener("load", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.checked = true;
  }
});
function selectClient(session) {      
  console.log("🔹 selectClient called for:", session.name);      

  const tagIconsEl = document.getElementById("tagIcons");      
  const extraTagsEl = document.getElementById("extraTags");      
  const avatarContainer = document.getElementById("detailAvatar"); 

  if (!tagIconsEl || !extraTagsEl || !avatarContainer) {      
    console.warn("⏳ عناصر التاغات أو الصورة غير موجودة بعد، إعادة المحاولة...");      
    setTimeout(() => selectClient(session), 300);      
    return;      
  }      

  // ====== الاسم والرقم ======
  document.getElementById("detailName").innerText = session.name || "";
  document.getElementById("detailPhone").innerText = session.phone || "";

  // ====== عرض الـ avatar بنفس منطق القائمة ======
  if (session.avatar_url) {
    avatarContainer.innerHTML = `<img src="${session.avatar_url}" class="detail-avatar-img" alt="avatar">`;
  } else if (session.name) {
    const { bg, text } = getAvatarColor(session.name.charAt(0));
    avatarContainer.innerHTML = `
      <div class="avatar-placeholder detail-avatar" 
           style="--avatar-bg:${bg}; --avatar-text:${text}; background:${bg}; color:${text};">
        ${session.name.charAt(0).toUpperCase()}
      </div>`;
  }
  else {
    avatarContainer.innerHTML = `<img src="/default-avatar.png" class="detail-avatar-img" alt="avatar">`;
  }
// ====== تفعيل التفاعل مع الصورة ======
const wrapper = document.querySelector(".details-avatar-wrapper");
const overlay = document.getElementById("changeAvatarOverlay");
const fileInput = document.getElementById("avatarInput");

wrapper.onclick = () => {
  wrapper.classList.add("active");
  setTimeout(() => wrapper.classList.remove("active"), 2500);
};

overlay.onclick = (e) => {
  e.stopPropagation();
  fileInput.click();
};

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ عرض الصورة فوراً في الواجهة
  const reader = new FileReader();
  reader.onload = (ev) => {
    const imgURL = ev.target.result;
    avatarContainer.innerHTML = `<img src="${imgURL}" class="detail-avatar-img" alt="avatar">`;
  };
  reader.readAsDataURL(file);

  // ✅ رفع الصورة للسيرفر
  await uploadAvatarToServer(session, file);
};

// دالة رفع الصورة للسيرفر
async function uploadAvatarToServer(session, file) {
  try {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`/clients/${session.client_id}/upload-avatar`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) throw new Error("فشل رفع الصورة إلى السيرفر");

    const data = await response.json();
    console.log("✅ avatar uploaded:", data);

    if (data.success && data.avatar_url) {
      // 🟢 تحديث الصورة فوراً في الجهة الأمامية
      session.avatar_url = data.avatar_url;

      // تحديث الواجهة بالنتيجة الجديدة
      const avatarContainer = document.getElementById("detailAvatar");
      if (avatarContainer) {
        avatarContainer.innerHTML = `<img src="${data.avatar_url}" class="detail-avatar-img" alt="avatar">`;
      }

      // ✅ تحديث الـ sessions في الذاكرة
      const sIndex = sessions.findIndex(s => s.id === session.id);
      if (sIndex !== -1) {
        sessions[sIndex].avatar_url = data.avatar_url;
      }

      console.log("🟢 تم حفظ الرابط الجديد في الواجهة:", data.avatar_url);
    }
  } catch (err) {
    console.error("❌ خطأ أثناء رفع الصورة:", err);
    alert("حدث خطأ أثناء رفع الصورة");
  }
}
// ====== الحالة والوقت ======
  const statusEl = document.getElementById("detailStatus");
  const lastActiveEl = document.getElementById("lastActive");
  if (statusEl) statusEl.innerText = session.is_online ? "🟢 Online" : "⚫ Offline";
  if (lastActiveEl) lastActiveEl.innerText = timeAgoEN(session.updated_at || session.last_active);

  // ====== إعداد التاغات ======
  let tags = [];
  if (Array.isArray(session.tags)) tags = session.tags;
  else if (typeof session.tags === "string" && session.tags.trim() !== "") 
    tags = session.tags.split(",").map(t => t.trim());

  if (session.is_repeat) tags.push("Repeat");
  if (session.is_invalid) tags.push("Invalid");
  if (session.is_blacklisted) tags.push("Blacklist");

  const uniqueTags = [...new Set(tags)];

  const iconMap = {      
    VIP: "👑", Deal: "💼", New: "🆕", Old: "📞", 
    Repeat: "🔁", Blacklist: "🚫", Invalid: "❌",
  };      

  tagIconsEl.innerHTML = uniqueTags
    .map(t => `<span class="tag-icon" title="${t}">${iconMap[t] || "🏷️"}</span>`)
    .join("");

  extraTagsEl.innerHTML = uniqueTags
    .map(t => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`)
    .join("");

  console.log("✅ Rendered uniqueTags:", uniqueTags);
  loadMessages(session.id);
// === تعديل اسم العميل ===
const editBtn = document.getElementById("editClientNameBtn");
const saveBtn = document.getElementById("saveClientNameBtn");
const nameInput = document.getElementById("editClientNameInput");
const nameLabel = document.getElementById("detailName");

if (editBtn && saveBtn && nameInput) {
  editBtn.onclick = () => {
    nameInput.style.display = "inline-block";
    saveBtn.style.display = "inline-block";
    editBtn.style.display = "none";
    nameInput.value = session.name || "";
    nameInput.focus();
  };

  saveBtn.onclick = async () => {
    const newName = nameInput.value.trim();
    if (!newName) return alert("الرجاء إدخال اسم العميل");

    const res = await fetch(`/clients/${session.client_id}/update-name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
      credentials: "include",
    });

    const data = await res.json();
    if (data.success) {
      nameLabel.innerText = newName;
      nameInput.style.display = "none";
      saveBtn.style.display = "none";
      editBtn.style.display = "inline-block";
      session.name = newName;
      alert("✅ تم تحديث الاسم بنجاح");
    } else {
      alert("❌ فشل تحديث الاسم");
    }
  };
}
}  

function initChatButtons() {
  const fileBtn = document.getElementById("file-btn");
  const emojiBtn = document.getElementById("emoji-btn");
  const fileInput = document.getElementById("mediaInput");

  if (fileBtn && fileInput) {
    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const preview = document.getElementById("file-preview");
      if (!preview) return;
      preview.innerHTML = "";
      if (fileInput.files.length > 0) {
        [...fileInput.files].forEach(file => {
          const div = document.createElement("div");
          div.className = "file-item";
          div.innerHTML = `📎 ${file.name}`;
          preview.appendChild(div);
        });
      }
    });
  }

  if (emojiBtn) {
    emojiBtn.addEventListener("click", () => {
      const existing = document.getElementById("emoji-picker");
      if (existing) existing.remove();

      const pickerContainer = document.createElement("div");
      pickerContainer.id = "emoji-picker";
      pickerContainer.style.position = "absolute";
      pickerContainer.style.bottom = "60px";
      pickerContainer.style.right = "100px";
      pickerContainer.style.zIndex = "9999";
      pickerContainer.style.background = "#fff";
      pickerContainer.style.border = "1px solid #ccc";
      pickerContainer.style.borderRadius = "8px";
      pickerContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

      const picker = new EmojiMart.Picker({
        onEmojiSelect: (emoji) => {
          const input = document.getElementById("msgInput");
          if (input) input.value += emoji.native;
          pickerContainer.remove();
        }
      });

      pickerContainer.appendChild(picker);
      document.body.appendChild(pickerContainer);
    });
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const groupSelect = document.getElementById("groupSelect");
  if (groupSelect) {
    groupSelect.addEventListener("change", () => {
      selectedGroupId = groupSelect.value;
      loadSessions();
    });
  }
});
function updateSidebarCounts(sessions) {
  const unread = sessions.filter(s => s.status === "unread").length;
  const unreplied = sessions.filter(s => s.status === "unreplied").length;
  document.querySelector('[data-section="unread"] .count').innerText = unread;
  document.querySelector('[data-section="unreplied"] .count').innerText = unreplied;
}
function rebindChatButtons() {
  // تأكد أن العناصر موجودة فعلاً في DOM
  if (document.getElementById("file-btn") && document.getElementById("emoji-btn")) {
    initChatButtons();
  } else {
    // انتظر قليلاً حتى تُحمّل الصفحة بالكامل
    setTimeout(rebindChatButtons, 500);
  }
}
rebindChatButtons();
async function loadTagSuggestions() {
  try {
    const res = await fetch("/clients/tags/suggestions", { credentials: "include" });
    const tags = await res.json();
    const list = document.getElementById("tagSuggestions");
    list.innerHTML = tags.map(t => `<option value="${t}">`).join("");
  } catch (err) {
    console.error("Error loading tag suggestions:", err);
  }
}
window.addEventListener("DOMContentLoaded", () => {
  const setTagItem = document.getElementById("setTagItem");
  const tagOptions = document.getElementById("tagOptions");
  const contextMenu = document.getElementById("contextMenu");

  if (!setTagItem || !tagOptions || !contextMenu) {
    console.error("❌ عناصر القائمة الجانبية غير موجودة في الصفحة بعد التحميل");
    return;
  }

  let lastMenuX = 0;
  let lastMenuY = 0;

  // احفظ آخر موقع فتح فيه الـ context menu
  document.addEventListener("contextmenu", (e) => {
    lastMenuX = e.clientX;
    lastMenuY = e.clientY;
  });

  // عند الضغط على Set Tag
  setTagItem.addEventListener("click", (e) => {
  e.stopPropagation();

  const contextMenu = document.getElementById("contextMenu");

  // أخفِ القائمة الأصلية
  contextMenu.style.display = "none";

  // الحصول على إحداثيات العنصر الذي ضغطنا عليه (القائمة نفسها)
  const rect = setTagItem.getBoundingClientRect();

  // ضع القائمة بجانب العنصر
  tagOptions.style.position = "absolute";
  tagOptions.style.left = `${rect.right + 10}px`;
  tagOptions.style.top = `${rect.top}px`;
  tagOptions.style.display = "block";
});
  // عند اختيار تاغ
  tagOptions.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", async () => {
      const tag = li.dataset.tag;
      tagOptions.style.display = "none";
      if (!selectedClientId) return;

      try {
        await axios.post(`/clients/${selectedClientId}/tags`, { tags: tag });
        alert(`✅ Tag "${tag}" added!`);
      } catch (err) {
        alert("❌ Error adding tag");
        console.error(err);
      }
    });
  });

  // إخفاء عند الضغط بالخارج
  document.addEventListener("click", (e) => {
    if (!tagOptions.contains(e.target)) {
      tagOptions.style.display = "none";
    }
  });
});
setInterval(loadSessions, 60000);
