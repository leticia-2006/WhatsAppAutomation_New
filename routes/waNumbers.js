const express = require("express");
const router = express.Router();
const { addWANumber, getWANumbers, assignNumber, transferNumber, removeNumber, updateStatus, getQR, confirmNumber } = require("../controllers/waNumbersController");
const { requireLogin, checkRole } = require("../middleware");


//جلب الارقام 
router.get("/", requireLogin, checkRole(['admin']), getWANumbers);

//اضافة رقم 
router.post("/", requireLogin, checkRole(['super_admin']), addWANumbers );

//ربط الرقم بوكيل
router.post("/:id/assign", requireLogin, checkRole(['admin']), assignNumber);

//حذف رقم
router.delete("/:id", requireLogin, checkRole(['super_admin']), removeNumber );

// إرجاع كل الأرقام مع بحث وفلترة
router.get("/", getWANumbers);

// code qr ارجاع 
router.get("/:id/qr", getQR);

// إضافة رقم جديد → يعرض QR
router.post("/", addWANumber);

// ربط الرقم بوكيل
router.post("/:id/assign", assignNumber);

// نقل الرقم لوكيل آخر
router.post("/:id/transfer", transferNumber);

//تاكيد/اعادة تفعيل الرقم 
router.post("/:id/confirm", requireLogin, checkRole(['super_admin']), confirmNumber);

// تغيير الحالة (Active, Blocked, Disconnected)
router.patch("/:id/status", updateStatus);

// حذف رقم
router.delete("/:id", removeNumber);

module.exports = router;
