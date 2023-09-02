"use strict";

var router = require("express").Router();

var userController = require("../controllers/userController");

router.get("/", userController.index, userController.indexView);
router.get("/new", userController["new"]);
router.post("/create", userController.validate, userController.create, userController.redirectView);
router.get("/login", userController.login);
router.post("/login", userController.authenticate, userController.redirectView);
router.get("/logout", userController.logout, userController.redirectView);
router.get("/forgot-password", userController.displayForgotPassword);
router.post("/forgot-password", userController.sendResetToken, userController.redirectView);
router.get("/reset-password/:token", userController.displayResetPassword);
router.post("/reset-password/:token", userController.resetPassword, userController.redirectView);
router.get("/:id/edit", userController.edit);
router.put("/:id/update", userController.validateUpdate, userController.update, userController.redirectView);
router.get("/:id", userController.show, userController.showView);
router.route("/:id/delete").get(userController.displayVerifyDelete).post(userController.verifyDelete, userController["delete"], userController.redirectView)["delete"](userController["delete"], userController.redirectView);
module.exports = router;