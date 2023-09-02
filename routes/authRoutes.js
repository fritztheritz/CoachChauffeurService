const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google authentication route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google authentication callback route
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/users/new' }),
  (req, res) => {
	if (req.user.firstName && req.user.lastName && req.user.email && req.user.phoneNumber) {
	  req.flash('success', 'You have been successfully logged in!');
	  res.redirect('/');
	} else {
		const { _id } = req.user;
		req.flash('info', 'Please fill out the remaining required information to continue.');
		res.redirect(`/users/${_id}/edit`);
	}
  }
);

module.exports = router;
