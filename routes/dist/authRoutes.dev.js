"use strict";

var express = require('express');

var passport = require('passport');

var router = express.Router(); // Google authentication route

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
})); // Google authentication callback route

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/users/new'
}), function (req, res) {
  if (req.user.firstName && req.user.lastName && req.user.email && req.user.phoneNumber) {
    req.flash('success', 'You have been successfully logged in!');
    res.redirect('/');
  } else {
    var _id = req.user._id;
    req.flash('info', 'Please fill out the remaining required information to continue.');
    res.redirect("/users/".concat(_id, "/edit"));
  }
});
module.exports = router;