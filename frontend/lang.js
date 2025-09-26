// lang.js
const translations = {
  en: {
    all: "All",
    group: "Group",
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
    numbers: "WhatsApp Numbers",
    addNumber: "+ Add Number",
    searchNumbers: "🔍 Search numbers...",
    translate: "Translate",
    autoTranslate: "Auto-translate"
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
    numbers: "أرقام واتساب",
    addNumber: "+ إضافة رقم",
    searchNumbers: "🔍 بحث عن الأرقام...",
    translate: "ترجمة",
    autoTranslate: "ترجمة تلقائية"
  },
  es: {
    all: "Todos",
    group: "Grupo",
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
    numbers: "Números de WhatsApp",
    addNumber: "+ Agregar número",
    searchNumbers: "🔍 Buscar números...",
    translate: "Traducir",
    autoTranslate: "Traducción automática"
  }
};

let currentLang = "en";

function setLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];

  // RTL if Arabic
  document.body.dir = lang === "ar" ? "rtl" : "ltr";

  // Sidebar
  document.querySelector('[data-tab="all"] p').textContent = t.all;
  document.querySelector('[data-tab="group"] p').textContent = t.group;
  document.querySelector('[data-tab="unread"] p').textContent = t.unread;
  document.querySelector('[data-tab="unreplied"] p').textContent = t.unreplied;
  document.querySelector('#qr-link p').textContent = t.linkWhatsapp;

  // Headers
  document.querySelector(".card-title").textContent = t.clients;
  document.querySelector("#chatHeader strong").textContent = t.conversation;

  // Inputs & buttons
  document.querySelector("#search-clients").placeholder = t.searchClients;
  document.querySelector("#tagFilter option[value='']").textContent = t.allTags;
  document.querySelector("#tag-filter option[value='VIP']").textContent = t.vip;
  document.querySelector("#tag-filter option[value='New']").textContent = t.new;
  

  // Numbers section
  if ( document.querySelector("#numbers-section. card-title")) { document.querySelector("#numbers-section .card-title").textContent = t.numbers;}
  document.querySelector("#addNumberBtn").textContent = t.addNumber;
  document.querySelector("#search").placeholder = t.searchNumbers;
}
