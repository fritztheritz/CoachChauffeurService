"use strict";

var User = require("../models/user");

var Trip = require("../models/trip");

var passport = require("passport");

var _require = require("../public/js/sendmail"),
    sendEmail = _require.sendEmail,
    sendContact = _require.sendContact,
    sendReset = _require.sendReset;

var paginate = require('express-paginate');

var _require2 = require('deep-email-validator'),
    validate = _require2.validate;

var _require3 = require('libphonenumber-js'),
    parsePhoneNumberFromString = _require3.parsePhoneNumberFromString;

var uuid = require("uuid");

var axios = require('axios');

var dotenv = require('dotenv');

dotenv.config(); // gets user parameters from the request body

var getUserParams = function getUserParams(body) {
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    confirmPassword: body.confirmPassword,
    phoneNumber: body.phoneNumber,
    oldPassword: body.oldPassword
  };
};

var validateEmail = function validateEmail(email) {
  var apiKey, response;
  return regeneratorRuntime.async(function validateEmail$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          apiKey = process.env.EMAILPASS;
          _context.next = 4;
          return regeneratorRuntime.awrap(axios.get("https://api.sendbridge.com/v1/validate/".concat(apiKey, "/").concat(email)));

        case 4:
          response = _context.sent;
          return _context.abrupt("return", response.data);

        case 8:
          _context.prev = 8;
          _context.t0 = _context["catch"](0);
          console.error('Email validation API error:', _context.t0);
          throw _context.t0;

        case 12:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 8]]);
};

module.exports = {
  // gets all users from the database and then passes the users to the next middleware function
  index: function index(req, res, next) {
    User.find().then(function (users) {
      res.locals.users = users;
      next();
    })["catch"](function (error) {
      console.log("Error fetching users: ".concat(error.message));
      next(error);
    });
  },
  // renders the users/index view
  indexView: function indexView(req, res) {
    if (req.user && req.user.isAdmin) {
      // Retrieve the page and limit from the query parameters
      var page = req.query.page || 1;
      var limit = req.query.limit || 6; // Perform pagination logic on your data source
      // Example: Fetch items from a database

      var items = res.locals.users;
      var itemCount = items.length;
      var pageCount = Math.ceil(itemCount / limit); // Calculate the offset for slicing the items array

      var offset = limit * (page - 1); // Slice the items array to get the items for the current page

      var paginatedItems = items.slice(offset, offset + limit);
      res.render("users/index", {
        users: paginatedItems,
        currentPage: page,
        pageCount: pageCount,
        pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
        limit: limit
      });
    } else {
      req.flash('error', 'You must be an admin to view this page!');
      res.redirect('/');
    }
  },
  // renders the users/index view
  dashboardView: function dashboardView(req, res) {
    if (req.user && req.user.isAdmin) {
      res.render("users/dashboard");
    } else {
      req.flash('error', 'You must be an admin to view this page!');
      res.redirect('/');
    }
  },
  // renders the users/new view
  "new": function _new(req, res) {
    var _req$query = req.query,
        firstName = _req$query.firstName,
        lastName = _req$query.lastName,
        email = _req$query.email,
        phoneNumber = _req$query.phoneNumber;
    res.render("users/new", {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phoneNumber: phoneNumber
    });
  },
  create: function create(req, res, next) {
    var userParams, emailValidationResult, phoneNumber, phoneNumberObj, newUser;
    return regeneratorRuntime.async(function create$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!req.skip) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt("return", next());

          case 2:
            userParams = getUserParams(req.body); // console.log(userParams.email);

            _context2.prev = 3;
            _context2.next = 6;
            return regeneratorRuntime.awrap(validateEmail(userParams.email));

          case 6:
            emailValidationResult = _context2.sent;

            //   console.log(emailValidationResult);
            if (emailValidationResult.score > 70) {
              // Validate the phone number using libphonenumber-js
              phoneNumber = userParams.phoneNumber;
              phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code

              if (phoneNumberObj && phoneNumberObj.isValid()) {
                newUser = new User(userParams);
                User.register(newUser, req.body.password, function (error, user) {
                  if (user) {
                    req.login(user, function (err) {
                      if (err) return next(err);
                      res.locals.redirect = "/";
                      res.locals.user = user;
                      req.flash("success", "User successfully created and logged in!");
                      sendEmail(user.email, "Welcome To Coach Chauffeur!", 'signup', null, "", req, null, user); // find all trips that have been created using the user's email

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
                      next();
                    });
                  } else {
                    console.log("Error saving user: ".concat(error.message));
                    res.locals.redirect = "/users/new";
                    req.flash("error", "Failed to create user because: ".concat(error.message, "."));
                    next();
                  }
                });
              } else {
                console.log('Invalid phone number');
                res.locals.redirect = "/users/new";
                req.flash("error", "Invalid phone number.");
                next();
              }
            } else {
              console.log('Invalid email');
              res.locals.redirect = "/users/new";
              req.flash("error", "Invalid email.");
              next();
            }

            _context2.next = 16;
            break;

          case 10:
            _context2.prev = 10;
            _context2.t0 = _context2["catch"](3);
            console.error("Error validating email address: ".concat(_context2.t0));
            res.locals.redirect = "/users/new";
            req.flash("error", "An error occurred while validating your email address.");
            next();

          case 16:
          case "end":
            return _context2.stop();
        }
      }
    }, null, null, [[3, 10]]);
  },
  // redirects to the proper show view
  redirectView: function redirectView(req, res, next) {
    var redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);else next();
  },
  // gets the user by ID and then passes the user to the next middleware function
  show: function show(req, res, next) {
    var userId = req.params.id;
    User.findById(userId).then(function (user) {
      res.locals.user = user; // Find all trips that the user has created based on the tripStatus query parameter

      var tripStatus = req.query.tripStatus || 'Pending';
      Trip.find({
        tripUser: userId,
        tripStatus: tripStatus
      }).then(function (trips) {
        res.locals.trips = trips;
        next(); // Call next() here
      })["catch"](function (error) {
        console.log("Error fetching trips by user ID: ".concat(error.message));
        next(error);
      });
    })["catch"](function (error) {
      console.log("Error fetching user by ID: ".concat(error.message));
      next(error);
    });
  },
  // renders the users/show view
  showView: function showView(req, res) {
    if (req.user && req.user._id == req.params.id) {
      var userId = req.params.id;
      var tripStatus = req.query.tripStatus;
      var query = {
        tripUser: userId
      };

      if (tripStatus && tripStatus !== "All") {
        query.tripStatus = tripStatus;
      }

      Trip.find(query).then(function (trips) {
        // Retrieve the page and limit from the query parameters
        var page = req.query.page || 1;
        var limit = req.query.limit || 6; // Perform pagination logic on your data source
        // Example: Fetch items from a database

        var items = trips;
        var itemCount = items.length;
        var pageCount = Math.ceil(itemCount / limit); // Calculate the offset for slicing the items array

        var offset = limit * (page - 1); // Slice the items array to get the items for the current page

        var paginatedItems = items.slice(offset, offset + limit);
        res.render("users/show", {
          user: req.user,
          searchOptions: req.query.tripStatus,
          trips: paginatedItems,
          pageCount: pageCount,
          currentPage: page,
          pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
          limit: limit
        });
      })["catch"](function (error) {
        console.log("Error fetching trips for user ID: ".concat(userId, ", Error: ").concat(error));
        req.flash("error", "An error occurred while fetching the trips.");
        res.redirect("/users/".concat(userId));
      });
    } else {
      req.flash("error", "You are not authorized to view this page.");
      res.redirect("/");
    }
  },
  // gets the user by ID and then renders the users/edit view with the user data
  edit: function edit(req, res, next) {
    var userId = req.params.id; // it's an account that needs to get all information filled out

    if (res.locals.flashMessages && res.locals.flashMessages.info) {
      res.locals.hasAllInfo = false;
    }

    if (req.user && req.user._id == req.params.id) {
      User.findById(userId).then(function (user) {
        res.render("users/edit", {
          user: user,
          hasAllInfo: res.locals.hasAllInfo
        });
      })["catch"](function (error) {
        console.log("Error fetching user by ID: ".concat(error.message));
        req.flash("error", "Failed to edit user because: ".concat(error.message, "."));
        next();
      });
    }
  },
  update: function update(req, res, next) {
    var userId, userParams, user, emailValidationResult, phoneNumber, phoneNumberObj, _user;

    return regeneratorRuntime.async(function update$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!req.skip) {
              _context3.next = 4;
              break;
            }

            return _context3.abrupt("return", next());

          case 4:
            userId = req.params.id, userParams = getUserParams(req.body); // if the user did not enter a new password, do not update the password

            if (userParams.password) {
              _context3.next = 9;
              break;
            }

            delete userParams.password;
            _context3.next = 20;
            break;

          case 9:
            _context3.prev = 9;
            _context3.next = 12;
            return regeneratorRuntime.awrap(User.findById(userId));

          case 12:
            user = _context3.sent;
            user.setPassword(userParams.password, function () {
              user.save();
            });
            _context3.next = 20;
            break;

          case 16:
            _context3.prev = 16;
            _context3.t0 = _context3["catch"](9);
            console.log("Error saving user password: ".concat(_context3.t0.message));
            next();

          case 20:
            _context3.prev = 20;
            _context3.next = 23;
            return regeneratorRuntime.awrap(validateEmail(userParams.email));

          case 23:
            emailValidationResult = _context3.sent;

            if (!(emailValidationResult.score > 70)) {
              _context3.next = 52;
              break;
            }

            // Validate the phone number using libphonenumber-js
            //   const phoneNumber = userParams.phoneNumber;
            phoneNumber = String(userParams.phoneNumber); //   console.log(userParams.phoneNumber)

            phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code
            //   console.log(phoneNumberObj)

            if (!(phoneNumberObj && phoneNumberObj.isValid())) {
              _context3.next = 47;
              break;
            }

            _context3.prev = 28;
            _context3.next = 31;
            return regeneratorRuntime.awrap(User.findByIdAndUpdate(userId, {
              $set: userParams
            }));

          case 31:
            _user = _context3.sent;
            res.locals.redirect = "/users/".concat(userId);
            res.locals.user = _user;
            res.locals.hasAllInfo = true;
            req.flash("success", "User successfully updated!"); //   console.log("checkmark 2")

            next();
            _context3.next = 45;
            break;

          case 39:
            _context3.prev = 39;
            _context3.t1 = _context3["catch"](28);
            console.log("Error updating user by ID: ".concat(_context3.t1.message));
            res.locals.redirect = "/users/".concat(userId, "/edit");
            req.flash("error", "Failed to update user because: ".concat(_context3.t1.message, "."));
            next();

          case 45:
            _context3.next = 50;
            break;

          case 47:
            // Phone number is invalid
            res.locals.redirect = "/users/".concat(userId, "/edit");
            req.flash('error', 'Invalid phone number.');
            next();

          case 50:
            _context3.next = 56;
            break;

          case 52:
            console.log('Invalid email');
            res.locals.redirect = "/users/".concat(userId, "/edit");
            req.flash("error", "Invalid email.");
            next();

          case 56:
            _context3.next = 64;
            break;

          case 58:
            _context3.prev = 58;
            _context3.t2 = _context3["catch"](20);
            console.error("Error validating email address: ".concat(_context3.t2));
            res.locals.redirect = "/users/".concat(userId, "/edit");
            req.flash('error', 'An error occurred while validating your email address.');
            next();

          case 64:
          case "end":
            return _context3.stop();
        }
      }
    }, null, null, [[9, 16], [20, 58], [28, 39]]);
  },
  // deletes the user by ID and then redirects to the users index view
  "delete": function _delete(req, res, next) {
    if (req.skip) {
      return next();
    } else {
      var userId = req.params.id;

      if (req.user && req.user._id == req.params.id) {
        User.findByIdAndRemove(userId).then(function () {
          res.locals.redirect = "/";
          req.flash("success", "User successfully deleted!");
          next();

          if (res.locals.googleUser) {
            res.locals.googleUser = false;
            module.exports.redirectView(req, res, next);
          }
        })["catch"](function (error) {
          console.log("Error deleting user by ID: ".concat(error.message));
          req.flash("error", "Failed to delete user because: ".concat(error.message, "."));
          next();
        });
      }
    }
  },
  // displays the users/login view
  login: function login(req, res) {
    res.render("users/login");
  },
  // authenticates the user, logs them in, and redirects to the home page
  authenticate: function authenticate(req, res, next) {
    passport.authenticate("local", function (err, user, info) {
      if (err) return next(err);

      if (!user) {
        req.flash("error", "Failed to login. Please try again.");
        return res.redirect("/users/login");
      }

      req.logIn(user, function (err) {
        if (err) return next(err);
        req.flash("success", "You have been successfully logged in!"); // find all trips that have been created using the user's email

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
        return res.redirect("/");
      });
    })(req, res, next);
  },
  // validates the user input for the user create form
  validate: function validate(req, res, next) {
    req.sanitizeBody("email").trim();
    req.check("firstName", "First name cannot be empty").notEmpty();
    req.check("lastName", "Last name cannot be empty").notEmpty();
    req.check("email", "Email is invalid").isEmail();
    req.check("phoneNumber", "Phone number cannot be empty").notEmpty();
    req.check("password", "Password cannot be empty").notEmpty();
    req.getValidationResult().then(function (error) {
      if (!error.isEmpty()) {
        var messages = error.array().map(function (e) {
          return e.msg;
        });

        if (req.body.password !== req.body.confirmPassword) {
          messages.push("Passwords do not match");
        }

        req.skip = true;
        req.flash("error", messages.join(" and "));
        res.locals.redirect = "/users/new";
        next();
      } else {
        if (req.body.password !== req.body.confirmPassword) {
          req.skip = true;
          req.flash("error", "Passwords do not match");
          res.locals.redirect = "/users/new";
        }

        next();
      }
    });
  },
  // validates the user input for the user update form
  validateUpdate: function validateUpdate(req, res, next) {
    req.sanitizeBody("email").trim();
    req.check("firstName", "First name cannot be empty").notEmpty();
    req.check("lastName", "Last name cannot be empty").notEmpty();
    req.check("email", "Email is invalid").isEmail();
    req.check("phoneNumber", "Phone number cannot be empty").notEmpty();
    req.getValidationResult().then(function (error) {
      if (!error.isEmpty()) {
        var messages = error.array().map(function (e) {
          return e.msg;
        });

        if (res.locals.hasAllInfo && req.user.googleId == null) {
          if (req.body.oldPassword && !req.body.password) {
            messages.push("Old password provided but no new password");
          } else if (req.body.password && !req.body.oldPassword) {
            messages.push("New password provided but no old password");
          } else {
            // Compare old password to password in database
            req.user.changePassword(req.body.oldPassword, req.body.password, function (err) {
              if (err) {
                messages.push("Old password is incorrect");
              }
            });
          }
        }

        req.skip = true;
        req.flash("error", messages.join(" and "));
        res.locals.redirect = "/users/".concat(req.params.id, "/edit");
        res.locals.hasAllInfo = false;
        next();
      } else {
        if (res.locals.hasAllInfo && req.user.googleId == null) {
          if (req.body.oldPassword && !req.body.password) {
            req.skip = true;
            req.flash("error", "Old password provided but no new password");
            res.locals.redirect = "/users/".concat(req.params.id, "/edit");
          } else if (req.body.password && !req.body.oldPassword) {
            req.skip = true;
            req.flash("error", "New password provided but no old password");
            res.locals.redirect = "/users/".concat(req.params.id, "/edit");
          } else {
            // Compare old password to password in database
            var userId = req.params.id;
            req.user.changePassword(req.body.oldPassword, req.body.password, function (err) {
              if (err) {
                req.skip = true;
                req.flash("error", "Old password is incorrect");
                res.locals.redirect = "/users/".concat(userId, "/edit");
              }
            });
          }
        }

        next();
      }
    });
  },
  // logs the user out and redirects to the home page
  logout: function logout(req, res, next) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }

      req.flash("success", "You have been logged out!");
      res.locals.redirect = "/";
      next();
    });
  },
  displayVerifyDelete: function displayVerifyDelete(req, res, next) {
    User.findById(req.params.id).then(function (user) {
      if (!user) {
        // Handle case when user is not found
        return next(new Error('User not found'));
      }

      if (user.googleId && user.googleToken) {
        // Google user
        res.locals.googleUser = true;
        module.exports["delete"](req, res, next);
      } else {
        // Regular user
        res.render("users/delete", {
          user: user
        });
      }
    })["catch"](function (error) {
      console.log("Error fetching user by ID: ".concat(error.message));
      req.flash("error", "Failed to delete user because: ".concat(error.message, "."));
      next(error);
    });
  },
  verifyDelete: function verifyDelete(req, res, next) {
    // Compare passwords
    if (req.body.password && req.body.password2 && req.body.password == req.body.password2) {
      // Change password allows the password to be compared to the one in the database
      req.user.changePassword(req.body.password, req.body.password2, function (err) {
        // Passwords didn't match	
        if (err) {
          req.skip = true;
          req.flash("error", "Incorrect password");
          res.locals.redirect = "/users/".concat(req.params.id, "/delete");
        }

        next();
      });
    } else if (req.body.password && req.body.password2 && req.body.password != req.body.password2) {
      req.skip = true;
      req.flash("error", "Passwords do not match");
      res.locals.redirect = "/users/".concat(req.params.id, "/delete");
      next();
    } else if (req.body.password && !req.body.password2) {
      req.skip = true;
      req.flash("error", "Confirm password is empty");
      res.locals.redirect = "/users/".concat(req.params.id, "/delete");
      next();
    } else if (!req.body.password && req.body.password2) {
      req.skip = true;
      req.flash("error", "Password is empty");
      res.locals.redirect = "/users/".concat(req.params.id, "/delete");
      next();
    } else {
      next();
    }
  },
  displayForgotPassword: function displayForgotPassword(req, res, next) {
    res.render("users/forgotPassword");
  },
  sendResetToken: function sendResetToken(req, res, next) {
    var email = req.body.email;
    User.findOne({
      email: email
    }).then(function (user) {
      if (!user) {
        req.skip = true;
        req.flash("error", "User not found");
        res.locals.redirect = "/users/forgot-password";
        next();
      } else {
        // Generate token
        user.resetToken = uuid.v4();
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour (3600000 milliseconds)

        var resetLink = "http://" + req.headers.host + "/users/reset-password/" + user.resetToken;
        user.save().then(function (user) {
          // Send email
          sendReset(user.email, 'Reset Password', 'reset', resetLink);
          req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
          res.locals.redirect = "/users/login";
          next();
        })["catch"](function (error) {
          console.log("Error saving user: ".concat(error.message));
          req.flash("error", "Failed to save user account because: ".concat(error.message, "."));
          next(error);
        });
      }
    })["catch"](function (error) {
      console.log("Error finding user: ".concat(error.message));
      req.flash("error", "Failed to find user account because: ".concat(error.message, "."));
      next(error);
    });
  },
  displayResetPassword: function displayResetPassword(req, res, next) {
    var token = req.params.token;
    User.findOne({
      resetToken: token,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    }).then(function (user) {
      if (!user) {
        req.flash("error", "The password reset link has expired or is invalid.");
        return res.redirect("/users/forgot-password");
      }

      res.render("users/resetPassword", {
        token: req.params.token
      });
    })["catch"](function (error) {
      console.log("Error finding user: ".concat(error.message));
      req.flash("error", "Failed to find user account because: ".concat(error.message, "."));
      return res.redirect("/users/forgot-password");
    });
  },
  resetPassword: function resetPassword(req, res, next) {
    if (req.body.password && !req.body.confirmPassword) {
      req.skip = true;
      req.flash("error", "Confirm password is empty");
      res.locals.redirect = "/users/reset-password/".concat(req.params.token);
      next();
    } else if (!req.body.password && req.body.confirmPassword) {
      req.skip = true;
      req.flash("error", "Password is empty");
      res.locals.redirect = "/users/reset-password/".concat(req.params.token);
      next();
    } else if (req.body.password && req.body.confirmPassword && req.body.password != req.body.confirmPassword) {
      req.skip = true;
      req.flash("error", "Passwords do not match");
      res.locals.redirect = "/users/reset-password/".concat(req.params.token);
      next();
    } else {
      User.findOne({
        resetToken: req.params.token
      }).then(function (user) {
        user.setPassword(req.body.password, function () {
          user.save();
        });
        user.resetToken = undefined;
        user.resetPasswordExpires = undefined;
        user.save().then(function (user) {
          req.flash("success", "Password has been reset");
          res.locals.redirect = "/users/login";
          next();
        })["catch"](function (error) {
          console.log("Error saving user: ".concat(error.message));
          req.flash("error", "Failed to save user account because: ".concat(error.message, "."));
          next(error);
        });
      })["catch"](function (error) {
        console.log("Error finding user: ".concat(error.message));
        req.flash("error", "Failed to find user account because: ".concat(error.message, "."));
        next(error);
      });
    }
  }
};