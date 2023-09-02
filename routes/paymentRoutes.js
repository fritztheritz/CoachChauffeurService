const router = require("express").Router();
const paymentController = require("../controllers/paymentController");

router.get("/", paymentController.index);
router.post("/", paymentController.processPayment);

module.exports = router;