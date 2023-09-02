const router = require("express").Router();
const homeRoutes = require("./homeRoutes"),
  errorRoutes = require("./errorRoutes"),
  userRoutes = require("./userRoutes"),
  authRoutes = require("./authRoutes"),
  tripRoutes = require("./tripRoutes");


// Index routes 
router.use("/", homeRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/trips", tripRoutes);
// router.use("/payment", paymentRoutes);
router.use("/", errorRoutes);


module.exports = router;