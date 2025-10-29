// lang.js
const translations = {
  en: {
    all: "All",
    group: "Groups",
    unread: "Unread",
    unreplied: "Unreplied",
    linkWhatsapp: "Link WhatsApp",
    clients: "Clients",
    conversation: "Conversation",
    searchClients: "🔍 Search clients...",
    allTags: "All tags",
    vip: "VIP",
    new: "New",
    logout: "Logout",
    numbers: "Numbers",
    addNumber: "+ Add Number",
    searchNumbers: "🔍 Search numbers...",
    translate: "Translate",
    autoTranslate: "Auto-translate",
    users: "Users",
    status: "Status",
    tags: "Tags",
    notes: "Notes",
    save: "Save",
    writeNote: "Write a note...",
    offline: "Offline",
    blacklist: "Blacklist",
    transfer: "Transfer",
    refresh: "Refresh Avatar"
  },
  ar: {
    all: "الكل",
    group: "المجموعات",
    unread: "غير المقروء",
    unreplied: "غير المردود",
    linkWhatsapp: "ربط واتساب",
    clients: "العملاء",
    conversation: "المحادثة",
    searchClients: "🔍 بحث عن العملاء...",
    allTags: "كل الوسوم",
    vip: "هام",
    new: "جديد",
    logout: "تسجيل خروج",
    numbers: "الأرقام",
    addNumber: "+ إضافة رقم",
    searchNumbers: "🔍 بحث عن الأرقام...",
    translate: "ترجمة",
    autoTranslate: "ترجمة تلقائية",
    users: "المستخدمون",
    status: "الحالة",
    tags: "الوسوم",
    notes: "الملاحظات",
    save: "حفظ",
    writeNote: "أضف ملاحظة...",
    offline: "غير متصل",
    blacklist: "حظر",
    transfer: "نقل",
    refresh: "تحديث الصورة"
  },
  es: {
    all: "Todos",
    group: "Grupos",
    unread: "No leído",
    unreplied: "Sin respuesta",
    linkWhatsapp: "Vincular WhatsApp",
    clients: "Clientes",
    conversation: "Conversación",
    searchClients: "🔍 Buscar clientes...",
    allTags: "Todas las etiquetas",
    vip: "VIP",
    new: "Nuevo",
    logout: "Cerrar sesión",
    numbers: "Números",
    addNumber: "+ Agregar número",
    searchNumbers: "🔍 Buscar números...",
    translate: "Traducir",
    autoTranslate: "Traducción automática",
    users: "Usuarios",
    status: "Estado",
    tags: "Etiquetas",
    notes: "Notas",
    save: "Guardar",
    writeNote: "Escribe una nota...",
    offline: "Desconectado",
    blacklist: "Lista negra",
    transfer: "Transferir",
    refresh: "Actualizar avatar"
  }
};

let currentLang = "en";

function setLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];
  document.body.dir = lang === "ar" ? "rtl" : "ltr";

  // ===== Sidebar =====
  document.querySelector('[data-section="groups"] .label')?.textContent = t.groups;
  document.querySelector('[data-section="unread"] .label')?.textContent = t.unread;
  document.querySelector('[data-section="numbers"] .label')?.textContent = t.numbers;
  document.querySelector('[data-section="users"] .label')?.textContent = t.users;
  document.getElementById("logout-btn")?.setAttribute("title", t.logout);
  document.getElementById("lang-switch")?.setAttribute("title", t.translate);

  // ===== Chat Section =====
  document.getElementById("chatClient")?.textContent = t.conversation;
  document.getElementById("chatStatus")?.textContent = t.offline;
  const msgInput = document.getElementById("msgInput");
  if (msgInput) msgInput.placeholder = "Type a message...";

  // ===== Clients List =====
  const searchClients = document.getElementById("search-clients");
  if (searchClients) searchClients.placeholder = t.searchClients;
  const filter = document.getElementById("filter-tag");
  if (filter) {
    filter.querySelector('option[value="all"]')?.textContent = t.all;
    filter.querySelector('option[value="vip"]')?.textContent = t.vip;
    filter.querySelector('option[value="new"]')?.textContent = t.new;
  }

  // ===== Client Details =====
  document.querySelector('.client-label')?.textContent = t.status;
  document.querySelector('.client-card-item:nth-child(2) .client-label')?.textContent = t.tags;
  document.querySelector('.notes-header h4')?.textContent = t.notes;
  document.getElementById("save-notes")?.setAttribute("title", t.save);
  document.getElementById("detail-notes")?.setAttribute("placeholder", t.writeNote);

  // ===== Buttons in details =====
  document.getElementById("block-client")?.setAttribute("title", t.blacklist);
  document.getElementById("transfer-client")?.setAttribute("title", t.transfer);
  document.getElementById("refresh-avatar")?.setAttribute("title", t.refresh);
}

// 🌍 Language Switch
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("language") || "en";
  setLanguage(savedLang);

  const langSwitch = document.getElementById("lang-switch");
  if (langSwitch) {
    langSwitch.addEventListener("click", () => {
      const langs = ["en", "ar", "es"];
      const current = localStorage.getItem("language") || "en";
      const next = langs[(langs.indexOf(current) + 1) % langs.length];
      localStorage.setItem("language", next);
      setLanguage(next);
    });
  }
});
