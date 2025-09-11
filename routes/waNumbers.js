const express = require("express");
const router = express.Router();
const { addWANumber, getWANumbers, assignNumber, transferNumber, removeNumber, updateStatus, getQR, confirmNumber } = require("../controllers/waNumbersController");
const { requireLogin, checkRole } = require("../middleware");


//جلب الارقام 
router.get("/", requireLogin, (req, res) => {
  const { role, id } = req.session.user;
  
  if (role === "super_admin") {
     return getAllWANumbers(res);
  }
   if (role === "admin") {
     return getAdminWANumbers(res);
   }
   if (role === "agent") {
     return getAgentWANumbers(id, res)
   }
return res.status(403).json({ error: "You are not allowed to access" });
});

//اضافة رقم 
router.post("/", requireLogin, checkRole(['super_admin']), addWANumber);

//ربط الرقم بوكيل
router.post("/:id/assign", requireLogin, checkRole(['admin, 'super_admin']), assignNumber);

//حذف رقم
router.delete("/:id", requireLogin, checkRole(['super_admin']), removeNumber );

// code qr ارجاع 
router.get("/:id/qr", getQR);

// نقل الرقم لوكيل آخر
router.post("/:id/transfer", transferNumber);

//تاكيد/اعادة تفعيل الرقم 
router.post("/:id/confirm", requireLogin, checkRole(['super_admin']), confirmNumber);

// تغيير الحالة (Active, Blocked, Disconnected)
router.patch("/:id/status", updateStatus);


module.exports = router;
