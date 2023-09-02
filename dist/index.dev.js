"use strict";

var mongoose = require("mongoose");

var express = require('express');

var methodOverride = require("method-override");

var layouts = require('express-ejs-layouts');

var expressSession = require("express-session");

var expressValidator = require("express-validator");

var cookieParser = require("cookie-parser");

var connectFlash = require("connect-flash");

var passport = require("passport");

var User = require("./models/user");

var Trip = require("./models/trip");

var cors = require('cors');

var paginate = require('express-paginate');

var app = express();

var GoogleStrategy = require('passport-google-oauth20').Strategy;

var router = require("./routes/index");

require("dotenv").config();

app.use(cors());
mongoose.connect("mongodb+srv://".concat(process.env.username, ":").concat(process.env.password, "@wilson.esob13d.mongodb.net/coach_car?retryWrites=true&w=majority"), {
  useNewUrlParser: true,
  // Add useNewUrlParser option
  useUnifiedTopology: true // Add useUnifiedTopology option

}); // need a new database

var db = mongoose.connection;
db.once("open", function () {
  console.log("Successfully connected to mongodb!");
});
app.use(express.json());
app.use(express.urlencoded());
app.set("view engine", "ejs");
app.use(layouts);
app.use(express["static"]('public'));
app.use(expressValidator());
app.use(methodOverride("_method", {
  methods: ["POST", "GET"]
}));
app.use(cookieParser("secret-pascode"));
app.use(expressSession({
  secret: "secret_passcode",
  cookie: {
    maxAge: 4000000
  },
  resave: false,
  saveUninitialized: true // changed from false to true

}));
app.use(connectFlash());
app.use(paginate.middleware(6));
app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());
passport.use(new GoogleStrategy({
  clientID: process.env.clientID,
  clientSecret: process.env.clientSecret,
  callbackURL: '/auth/google/callback',
  scope: ['profile', 'email']
}, function _callee(accessToken, refreshToken, profile, done) {
  var user, phoneNumber;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(User.findOne({
            email: profile.emails[0].value
          }));

        case 3:
          user = _context.sent;

          if (!user) {
            _context.next = 14;
            break;
          }

          if (!(user.googleToken !== accessToken)) {
            _context.next = 10;
            break;
          }

          user.googleId = profile.id;
          user.googleToken = accessToken;
          _context.next = 10;
          return regeneratorRuntime.awrap(user.save());

        case 10:
          // find all trips that have been created using the user's email
          Trip.find({
            tripUserEmail: user.email
          }).then(function (trips) {
            // make the trip user id equal to the user's id
            trips.forEach(function (trip) {
              trip.tripUser = user._id;
              trip.save();
            });
          })["catch"](function (error) {
            console.log("Error fetching trips: ".concat(error.message));
            next(error);
          });
          return _context.abrupt("return", done(null, user));

        case 14:
          phoneNumber = profile.phoneNumbers && profile.phoneNumbers.length > 0 ? profile.phoneNumbers[0].value : ''; // User does not exist, create a new user with Google information

          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            // Access the email directly from the profile object
            phoneNumber: phoneNumber,
            // You can set this field as empty or handle it separately
            isAdmin: false,
            googleId: profile.id,
            googleToken: accessToken
          });
          Trip.find({
            tripUserEmail: user.email
          }).then(function (trips) {
            console.log(trips); // make the trip user id equal to the user's id

            trips.forEach(function (trip) {
              trip.tripUser = user._id;
              trip.save();
            });
          })["catch"](function (error) {
            console.log("Error fetching trips: ".concat(error.message));
            next(error);
          });
          _context.next = 19;
          return regeneratorRuntime.awrap(user.save());

        case 19:
          return _context.abrupt("return", done(null, user));

        case 20:
          _context.next = 25;
          break;

        case 22:
          _context.prev = 22;
          _context.t0 = _context["catch"](0);
          return _context.abrupt("return", done(_context.t0));

        case 25:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 22]]);
}));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function (req, res, next) {
  res.locals.flashMessages = req.flash();
  res.locals.loggedIn = req.isAuthenticated();
  res.locals.currentUser = req.user;
  res.locals.hasAllInfo = req.user && req.user.firstName && req.user.lastName && req.user.email && req.user.phoneNumber;
  next();
});
app.set("port", process.env.PORT || 3000);
app.use("/", router);
app.listen(app.get("port"), function () {
  console.log("Express running \u2192 PORT ".concat(app.get("port")));
});