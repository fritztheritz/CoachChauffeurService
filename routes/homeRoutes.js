const router = require("express").Router();
const homeController = require("../controllers/homeController");

router.get("/", homeController.index);
router.get("/about", homeController.about);
router.get("/contact", homeController.contact);
router.post("/contact", homeController.sendEmail);

module.exports = router;