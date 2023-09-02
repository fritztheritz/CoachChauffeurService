"use strict";

var _require = require("ajv/dist/compile/util"),
    toHash = _require.toHash;

var mongoose = require("mongoose");

var passportLocalMongoose = require("passport-local-mongoose");

var uuid = require("uuid");

var userSchema = mongoose.Schema({
  firstName: {
    type: String
  },
  // user first name
  lastName: {
    type: String
  },
  // user last name
  email: {
    type: String
  },
  // user email
  phoneNumber: {
    type: String
  },
  // user phone number
  isAdmin: {
    type: Boolean,
    "default": false
  },
  // user admin status
  googleId: {
    type: String
  },
  // Google ID for users who sign in with Google
  googleToken: {
    type: String
  },
  // Google access token for users who sign in with Google
  resetToken: {
    type: String
  },
  // reset password token
  resetPasswordExpires: {
    type: Date
  } // reset password expiration date

}, {
  timestamps: true
}); // method to get user's full name

userSchema.virtual("fullName").get(function () {
  return "".concat(this.firstName, " ").concat(this.lastName);
});
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email"
});
module.exports = mongoose.model("User", userSchema);