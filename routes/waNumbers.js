
const express = require("express");
const router = express.Router();
const { addWANumber, getWANumbers, assignNumber, transferNumber, removeNumber, updateStatus, getQR } = require("../controllers/waNumbersController");

// إرجاع كل الأرقام مع بحث وفلترة
router.get("/", getWANumbers);


router.get("/:id/qr", getQR);

// إضافة رقم جديد → يعرض QR
router.post("/", addWANumber);

// ربط الرقم بوكيل
router.post("/:id/assign", assignNumber);

// نقل الرقم لوكيل آخر
router.post("/:id/transfer", transferNumber);

// تغيير الحالة (Active, Blocked, Disconnected)
router.patch("/:id/status", updateStatus);

// حذف رقم
router.delete("/:id", removeNumber);

module.exports = router;
