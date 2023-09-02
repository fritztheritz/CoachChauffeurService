"use strict";

var User = require("../models/user");

var Trip = require("../models/trip");

var Refund = require("../models/refund");

var _require = require("../public/js/sendmail"),
    sendEmail = _require.sendEmail,
    sendContact = _require.sendContact;

var dotenv = require('dotenv');

var axios = require('axios');

var paginate = require('express-paginate');

var shortid = require('shortid');

var _require2 = require('deep-email-validator'),
    validate = _require2.validate;

var _require3 = require('libphonenumber-js'),
    parsePhoneNumberFromString = _require3.parsePhoneNumberFromString;

var trip = require("../models/trip");

dotenv.config(); // gets trip parameters from the request body

var getTripParams = function getTripParams(body) {
  return {
    tripDate: body.tripDate,
    pickUpTime: body.pickUpTime,
    tripUser: body.tripUser,
    tripUserEmail: body.tripUserEmail,
    tripUserName: body.tripUserName,
    tripUserPhone: body.tripUserPhone,
    pickUpAddress: body.pickUpAddress,
    dropOffAddress: body.dropOffAddress,
    travelTime: body.travelTime,
    price: body.price,
    num_of_passengers: body.num_of_passengers,
    specialInstructions: body.specialInstructions,
    tripStatus: body.tripStatus,
    paid: body.paid,
    tripCode: body.tripCode,
    tripType: body.tripType,
    carType: body.carType
  };
};

function calculateTravelTime(pickupAddress, dropOffAddress) {
  var url = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=".concat(encodeURIComponent(pickupAddress), "&destinations=").concat(encodeURIComponent(dropOffAddress), "&units=imperial&key=AIzaSyAV40-7YnOohlzydiiZsT4VN8ZGscHwdno");
  var config = {
    method: 'get',
    url: url,
    headers: {}
  };
  return axios(config).then(function (response) {
    return response.data;
  })["catch"](function (error) {
    console.log(error);
    throw new Error('Failed to calculate travel time');
  });
}

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
  // gets all trips from the database and then passes the trips to the next middleware function
  index: function index(req, res, next) {
    var match, trips, page, limit, items, itemCount, pageCount, offset, paginatedItems, successMessage;
    return regeneratorRuntime.async(function index$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            match = {};

            if (req.query.tripStatus) {
              match.tripStatus = req.query.tripStatus;
            }

            if (req.query.tripCode) {
              match.tripCode = req.query.tripCode;
            }

            if (req.query.payment === "success") {
              req.session.successMessage = "Payment successful!";
            }

            _context2.next = 7;
            return regeneratorRuntime.awrap(Trip.find(match).sort({
              tripDate: "desc"
            }).populate("tripUser").exec());

          case 7:
            trips = _context2.sent;
            // Retrieve the page and limit from the query parameters
            page = req.query.page || 1;
            limit = req.query.limit || 6; // Perform pagination logic on your data source
            // Example: Fetch items from a database

            items = trips;
            itemCount = items.length;
            pageCount = Math.ceil(itemCount / limit); // Calculate the offset for slicing the items array

            offset = limit * (page - 1); // Slice the items array to get the items for the current page

            paginatedItems = items.slice(offset, offset + limit); // Retrieve the flash message from the session and delete it

            successMessage = req.session.successMessage;
            delete req.session.successMessage;
            res.render("trips/index", {
              trips: paginatedItems,
              searchOptions: req.query.tripStatus,
              currentPage: page,
              pageCount: pageCount,
              pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
              limit: limit,
              successMessage: successMessage // Pass the successMessage variable to the view

            });
            _context2.next = 24;
            break;

          case 20:
            _context2.prev = 20;
            _context2.t0 = _context2["catch"](0);
            console.log("Error fetching trips: ".concat(_context2.t0.message));
            next(_context2.t0);

          case 24:
          case "end":
            return _context2.stop();
        }
      }
    }, null, null, [[0, 20]]);
  },
  // renders the trips/index view
  indexView: function indexView(req, res) {
    res.render("trips/index");
  },
  admin: function admin(req, res, next) {
    Trip.find().populate("tripUser").then(function (trips) {
      res.locals.trips = trips;
      next();
    })["catch"](function (error) {
      console.log("Error fetching users: ".concat(error.message));
      next(error);
    });
  },
  // renders the trips/admin view
  adminView: function adminView(req, res, next) {
    var match, trips, page, limit, items, itemCount, pageCount, offset, paginatedItems, refunds, refundCount;
    return regeneratorRuntime.async(function adminView$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            match = {};

            if (req.query.tripStatus) {
              match.tripStatus = req.query.tripStatus;
            }

            _context3.next = 5;
            return regeneratorRuntime.awrap(Trip.find(match).sort({
              tripDate: "desc"
            }).populate("tripUser").exec());

          case 5:
            trips = _context3.sent;
            // Retrieve the page and limit from the query parameters
            page = req.query.page || 1;
            limit = req.query.limit || 6; // Perform pagination logic on your data source
            // Example: Fetch items from a database

            items = trips;
            itemCount = items.length;
            pageCount = Math.ceil(itemCount / limit); // Calculate the offset for slicing the items array

            offset = limit * (page - 1); // Slice the items array to get the items for the current page

            paginatedItems = items.slice(offset, offset + limit); // Get the number of refunds for all trips where refundStatus is pending

            _context3.next = 15;
            return regeneratorRuntime.awrap(Refund.find({
              refundStatus: "Pending"
            }));

          case 15:
            refunds = _context3.sent;
            refundCount = refunds.length;
            res.render("trips/admin", {
              trips: paginatedItems,
              searchOptions: req.query.tripStatus,
              currentPage: page,
              pageCount: pageCount,
              pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
              limit: limit,
              refundCount: refundCount
            });
            _context3.next = 24;
            break;

          case 20:
            _context3.prev = 20;
            _context3.t0 = _context3["catch"](0);
            console.log("Error fetching trips: ".concat(_context3.t0.message));
            next(_context3.t0);

          case 24:
          case "end":
            return _context3.stop();
        }
      }
    }, null, null, [[0, 20]]);
  },
  // renders the trips/new view
  "new": function _new(req, res) {
    if (req.user) {
      res.render("trips/new", {
        autofill: process.env.MPASS,
        askEmailPhone: false
      });
    } else {
      res.render("trips/new", {
        autofill: process.env.MPASS,
        askEmailPhone: true
      });
    }
  },
  showVerifyEditForm: function showVerifyEditForm(req, res, next) {
    var id = req.params.id;

    if (req.user && req.user.isAdmin) {
      // User is an admin, render the edit form directly
      Trip.findById(id).then(function (trip) {
        if (!trip) {
          req.flash('error', 'Trip not found.');
          return res.redirect('/');
        }

        res.render('trips/edit', {
          trip: trip,
          req: req
        });
      })["catch"](function (error) {
        console.error("Error fetching trip for editing: ".concat(error));
        req.flash('error', 'An error occurred while fetching the trip for editing.');
        res.redirect('/');
      });
    } else {
      // User is not an admin, render the verification form
      res.render('trips/verify-edit', {
        id: id
      });
    }
  },
  verifyEdit: function verifyEdit(req, res, next) {
    if (req.user && req.user.isAdmin) {
      // Admins can edit trips without verification
      next();
    } else {
      var id = req.params.id;
      var code = req.body.code;
      Trip.findById(id).then(function (trip) {
        if (trip.tripCode === code) {
          // Verification successful, proceed with editing
          next();
        } else {
          // Incorrect verification code
          req.flash('error', 'Incorrect verification code for editing.');
          res.redirect("/trips/".concat(id, "/verify-edit"));
        }
      })["catch"](function (error) {
        console.error("Error verifying trip for edit: ".concat(error));
        res.redirect('/');
      });
    }
  },
  showVerifyCancelForm: function showVerifyCancelForm(req, res) {
    var id = req.params.id;

    if (req.user && req.user.isAdmin) {
      // Admins can delete trips without verification
      Trip.findById(id).populate("tripUser").then(function (trip) {
        trip.tripStatus = "Cancelled";
        sendEmail(trip.tripUserEmail, 'Reservation Denied', 'cancellation', trip);
        trip.save();
        res.redirect('/trips/admin');
      })["catch"](function (error) {
        console.log("Error fetching trip by ID: ".concat(error.message));
        next(error);
      });
    } else {
      res.render('trips/verify-cancel', {
        id: id
      });
    }
  },
  verifyCancel: function verifyCancel(req, res, next) {
    var id = req.params.id;
    var code = req.body.code;
    Trip.findById(id).then(function (trip) {
      if (trip.tripStatus !== "In-Progress") {
        if (trip.tripCode === code) {
          // Verification successful, proceed with deletion
          sendEmail(trip.tripUserEmail, 'Reservation Cancelled', 'cancel', trip);
          next();
        } else {
          // Incorrect verification code
          req.flash('error', 'Incorrect verification code for cancellation.');
          res.redirect("/trips/".concat(id, "/verify-cancel"));
        }
      } else {
        req.flash('error', 'You cannot cancel a trip that is in progress.');
        res.redirect("/trips/".concat(id, "/verify-cancel"));
      }
    })["catch"](function (error) {
      req.flash('error', 'Error occurred while verifying cancellation.');
      res.redirect("/trips/".concat(id, "/verify-cancel"));
    });
  },
  // Search for a trip by trip code
  search: function search(req, res) {
    var tripCode = req.query.tripCode;
    Trip.findOne({
      tripCode: tripCode
    }).populate('tripUser').then(function (trip) {
      if (trip) {
        // Trip found, render the trip details page
        res.render('trips/show', {
          trip: trip
        });
      } else {
        // Trip not found, display an error message
        req.flash('error', 'Trip not found.');
        res.redirect('/');
      }
    })["catch"](function (error) {
      console.error("Error searching for trip: ".concat(error));
      req.flash('error', 'An error occurred while searching for the trip.');
      res.redirect('/');
    });
  },
  // Inside your route handler
  create: function create(req, res, next) {
    var tripParams, emailValidationResult, phoneNumber, phoneNumberObj, travelTime, verificationCodeLength, diff, hours;
    return regeneratorRuntime.async(function create$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (!req.skip) {
              _context4.next = 3;
              break;
            }

            // If skipping, proceed to the next middleware
            next();
            return _context4.abrupt("return");

          case 3:
            tripParams = getTripParams(req.body);

            if (req.user) {
              tripParams.tripUser = req.user;
              tripParams.tripUserEmail = req.user.email;
              tripParams.tripUserPhone = req.user.phoneNumber;
              tripParams.tripUserName = req.user.fullName;
            } else {
              tripParams.tripUser = undefined;
              tripParams.tripUserEmail = req.body.tripUserEmail;
              tripParams.tripUserPhone = req.body.tripUserPhone;
              tripParams.tripUserName = req.body.tripUserName;
            }

            _context4.prev = 5;
            _context4.next = 8;
            return regeneratorRuntime.awrap(validateEmail(tripParams.tripUserEmail));

          case 8:
            emailValidationResult = _context4.sent;

            if (!(emailValidationResult.score > 70)) {
              _context4.next = 44;
              break;
            }

            // Email is valid, proceed with phone number validation
            // Validate the phone number using libphonenumber-js
            phoneNumber = String(tripParams.tripUserPhone);
            phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code

            if (!(phoneNumberObj && phoneNumberObj.isValid())) {
              _context4.next = 39;
              break;
            }

            _context4.prev = 13;
            _context4.next = 16;
            return regeneratorRuntime.awrap(calculateTravelTime(tripParams.pickUpAddress, tripParams.dropOffAddress));

          case 16:
            travelTime = _context4.sent;
            // Add the travelTime field to tripParams
            tripParams.travelTime = travelTime.rows[0].elements[0].duration.text;
            verificationCodeLength = 10;
            tripParams.tripCode = shortid.generate().substring(0, verificationCodeLength);

            if (!(tripParams.tripType === "Road Trip")) {
              _context4.next = 28;
              break;
            }

            // check if the travel time is at least 4 hours
            diff = tripParams.travelTime.split(" ");
            hours = parseInt(diff[0]); // if the trip is less than 4 hours away, redirect to the new trip page and display an error

            if (!(hours < 4 || hours >= 4 && diff[1] === "mins")) {
              _context4.next = 28;
              break;
            }

            res.locals.redirect = '/trips/new';
            req.flash('error', 'Road trip must be at least 4 hours long.');
            next();
            return _context4.abrupt("return");

          case 28:
            Trip.create(tripParams).then(function (trip) {
              res.locals.redirect = '/trips/' + trip._id;
              res.locals.trip = trip; // Set the trip date to the correct date (time zone issue)

              var modifiedDate = new Date(trip.tripDate);
              modifiedDate.setHours(modifiedDate.getHours() + 4);
              trip.tripDate = modifiedDate;
              trip.save();
              req.flash('success', 'Trip successfully created!');
              sendEmail(tripParams.tripUserEmail, 'Reservation Created', 'reservation', trip, "", req);
              next();
            })["catch"](function (error) {
              console.log("Error saving trip: ".concat(error.message));
              res.locals.redirect = '/trips/new';
              req.flash('error', "Failed to create trip because: ".concat(error.message, "."));
              next();
            });
            _context4.next = 37;
            break;

          case 31:
            _context4.prev = 31;
            _context4.t0 = _context4["catch"](13);
            console.log("Error calculating travel time: ".concat(_context4.t0.message));
            res.locals.redirect = '/trips/new';
            req.flash('error', 'Failed to calculate travel time.');
            next();

          case 37:
            _context4.next = 42;
            break;

          case 39:
            // Phone number is invalid
            res.locals.redirect = '/trips/new';
            req.flash('error', 'Invalid phone number.');
            next();

          case 42:
            _context4.next = 47;
            break;

          case 44:
            // Email is invalid
            res.locals.redirect = '/trips/new';
            req.flash('error', 'Invalid email address.');
            next();

          case 47:
            _context4.next = 55;
            break;

          case 49:
            _context4.prev = 49;
            _context4.t1 = _context4["catch"](5);
            console.error("Error validating email address: ".concat(_context4.t1));
            res.locals.redirect = '/trips/new';
            req.flash('error', 'An error occurred while validating your email address.');
            next();

          case 55:
          case "end":
            return _context4.stop();
        }
      }
    }, null, null, [[5, 49], [13, 31]]);
  },
  // redirects to the proper show view
  redirectView: function redirectView(req, res, next) {
    var redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);else next();
  },
  // gets the trip by ID and then passes the trip to the next middleware function
  show: function show(req, res, next) {
    var tripId = req.params.id;
    Trip.findById(tripId).populate("tripUser").then(function (trip) {
      res.locals.trip = trip;
      next();
    })["catch"](function (error) {
      console.log("Error fetching trip by ID: ".concat(error.message));
      next(error);
    });
  },
  // renders the trips/show view
  showView: function showView(req, res) {
    res.render('trips/show');
  },
  // gets the trip by ID and then renders the trips/edit view with the user data
  // Edit controller action
  edit: function edit(req, res, next) {
    var tripId = req.params.id;
    Trip.findById(tripId).populate("tripUser").then(function (trip) {
      if (trip.tripStatus === "Pending") {
        if (req.user) {
          res.render("trips/edit", {
            trip: trip,
            autofill: process.env.MPASS,
            req: req,
            askEmailPhone: false
          });
        } else {
          res.render("trips/edit", {
            trip: trip,
            autofill: process.env.MPASS,
            req: req,
            askEmailPhone: true
          });
        }
      } else {
        req.flash('error', 'You cannot edit a trip that has already been ' + trip.tripStatus + ".");
        res.redirect("/trips/".concat(tripId));
      }
    })["catch"](function (error) {
      console.log("Error fetching trip by ID: ".concat(error.message));
      next(error);
    });
  },
  update: function update(req, res, next) {
    var tripId, tripParams, updatedTrip, _trip, emailValidationResult, phoneNumber, phoneNumberObj, diff, hours, _updatedTrip;

    return regeneratorRuntime.async(function update$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (!req.skip) {
              _context5.next = 2;
              break;
            }

            return _context5.abrupt("return", next());

          case 2:
            tripId = req.params.id, tripParams = getTripParams(req.body);

            if (!(req.user && req.user.isAdmin)) {
              _context5.next = 34;
              break;
            }

            tripParams.tripStatus = 'Confirmed';
            _context5.prev = 5;
            _context5.next = 8;
            return regeneratorRuntime.awrap(Trip.findByIdAndUpdate(tripId, {
              $set: tripParams
            }).populate("tripUser"));

          case 8:
            updatedTrip = _context5.sent;
            res.locals.redirect = "/trips/admin";
            res.locals.trip = updatedTrip;
            req.flash("success", "Trip successfully approved!");
            _context5.prev = 12;
            _context5.next = 15;
            return regeneratorRuntime.awrap(Trip.findById(tripId).populate("tripUser"));

          case 15:
            _trip = _context5.sent;
            sendEmail(_trip.tripUserEmail, "Reservation Approved!", "approval", _trip, "", req);
            _context5.next = 23;
            break;

          case 19:
            _context5.prev = 19;
            _context5.t0 = _context5["catch"](12);
            console.log("Error fetching trip by ID: ".concat(_context5.t0.message));
            next(_context5.t0);

          case 23:
            next();
            _context5.next = 32;
            break;

          case 26:
            _context5.prev = 26;
            _context5.t1 = _context5["catch"](5);
            console.log("Error updating trip by ID: ".concat(_context5.t1.message));
            res.locals.redirect = "/trips/".concat(tripId, "/verify-edit");
            req.flash("error", "Failed to update trip because: ".concat(_context5.t1.message, "."));
            next();

          case 32:
            _context5.next = 80;
            break;

          case 34:
            _context5.next = 36;
            return regeneratorRuntime.awrap(calculateTravelTime(tripParams.pickUpAddress, tripParams.dropOffAddress));

          case 36:
            travelel = _context5.sent;
            tripParams.travelTime = travelel.rows[0].elements[0].duration.text;
            _context5.next = 40;
            return regeneratorRuntime.awrap(validateEmail(tripParams.tripUserEmail));

          case 40:
            emailValidationResult = _context5.sent;

            if (!(emailValidationResult.score > 90)) {
              _context5.next = 77;
              break;
            }

            // Validate the phone number using libphonenumber-js
            phoneNumber = tripParams.tripUserPhone;
            phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code

            if (!(tripParams.tripType === "Road Trip")) {
              _context5.next = 52;
              break;
            }

            // check if the travel time is at least 4 hours
            diff = tripParams.travelTime.split(" ");
            hours = parseInt(diff[0]); // if the trip is less than 4 hours away, redirect to the new trip page and display an error

            if (!(hours < 4 || hours >= 4 && diff[1] === "mins")) {
              _context5.next = 52;
              break;
            }

            res.locals.redirect = "/trips/".concat(tripId, "/verify-edit");
            req.flash('error', 'Road trip must be at least 4 hours long.');
            next();
            return _context5.abrupt("return");

          case 52:
            if (!(phoneNumberObj && phoneNumberObj.isValid())) {
              _context5.next = 72;
              break;
            }

            _context5.prev = 53;
            _context5.next = 56;
            return regeneratorRuntime.awrap(Trip.findByIdAndUpdate(tripId, {
              $set: tripParams
            }).populate("tripUser"));

          case 56:
            _updatedTrip = _context5.sent;
            res.locals.redirect = "/trips/".concat(tripId);
            res.locals.trip = _updatedTrip;
            req.flash("success", "Trip successfully updated!");
            next();
            _context5.next = 69;
            break;

          case 63:
            _context5.prev = 63;
            _context5.t2 = _context5["catch"](53);
            console.log("Error updating trip by ID: ".concat(_context5.t2.message));
            res.locals.redirect = "/trips/".concat(tripId);
            req.flash("error", "Failed to update trip because: ".concat(_context5.t2.message, "."));
            next();

          case 69:
            try {
              Trip.findById(tripId).populate("tripUser").then(function (trip) {
                sendEmail(trip.tripUserEmail, "Reservation Updated", "update", trip, "", req);
              });
            } catch (error) {
              console.log("Error fetching trip by ID: ".concat(error.message));
              next(error);
            }

            _context5.next = 75;
            break;

          case 72:
            // Phone number is invalid
            res.locals.redirect = "/trips/".concat(tripId, "/verify-edit");
            req.flash('error', 'Invalid phone number.');
            next();

          case 75:
            _context5.next = 80;
            break;

          case 77:
            // Email is invalid
            res.locals.redirect = "/trips/".concat(tripId, "/verify-edit");
            req.flash('error', 'Invalid email address.');
            next();

          case 80:
          case "end":
            return _context5.stop();
        }
      }
    }, null, null, [[5, 26], [12, 19], [53, 63]]);
  },
  // deletes the trip by ID and then redirects to the trips index view
  "delete": function _delete(req, res, next) {
    var tripId = req.params.id;
    Trip.findById(tripId).populate("tripUser").then(function (trip) {
      if (trip.paid && trip.tripStatus === 'Confirmed') {
        // if trip is paid and confirmed, create a refund
        Refund.create({
          trip: tripId,
          refundAmount: trip.price,
          refundReason: "Trip Cancelled By User",
          refundStatus: 'Pending'
        }).then(function (refund) {
          trip.tripStatus = 'Cancelled';
          trip.refunded = true;
          trip.save();
          sendEmail(trip.tripUserEmail, 'Refund Requested', 'refund', trip, "", req, refund);
        })["catch"](function (error) {
          console.log("Error creating refund: ".concat(error.message));
        });
      }

      res.locals.redirect = "/";
      req.flash("success", "Trip successfully cancelled!");
      next();
    })["catch"](function (error) {
      console.log("Error fetching trip by ID: ".concat(error.message));
      next(error);
    });
  },
  displayCancelForm: function displayCancelForm(req, res, next) {
    var _tripId, _trip2;

    return regeneratorRuntime.async(function displayCancelForm$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            if (!(req.user && req.user.isAdmin)) {
              _context6.next = 16;
              break;
            }

            _context6.prev = 1;
            _tripId = req.params.id;
            _context6.next = 5;
            return regeneratorRuntime.awrap(Trip.findById(_tripId));

          case 5:
            _trip2 = _context6.sent;
            res.render("trips/cancel", {
              trip: _trip2
            });
            _context6.next = 14;
            break;

          case 9:
            _context6.prev = 9;
            _context6.t0 = _context6["catch"](1);
            console.log("Error displaying cancellation form: ".concat(_context6.t0.message));
            req.flash("error", "Failed to display cancellation form.");
            res.redirect("/trips");

          case 14:
            _context6.next = 17;
            break;

          case 16:
            res.render("trips/verify-cancel", {
              id: req.params.id
            });

          case 17:
          case "end":
            return _context6.stop();
        }
      }
    }, null, null, [[1, 9]]);
  },
  processCancelForm: function processCancelForm(req, res, next) {
    var _tripId2, cancellationReason;

    return regeneratorRuntime.async(function processCancelForm$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            try {
              _tripId2 = req.params.id;
              cancellationReason = req.body.cancellationReason;
              Trip.findById(_tripId2).populate("tripUser").then(function (trip) {
                sendEmail(trip.tripUserEmail, 'Reservation Denied', 'cancellation', trip, cancellationReason);
              })["catch"](function (error) {
                console.log("Error fetching trip by ID: ".concat(error.message));
                next(error);
              }); // Delete the trip or perform any additional actions based on the cancellation reason  

              req.flash("success", "Trip successfully cancelled.");
              res.redirect("/trips/admin?tripStatus=Pending");
            } catch (error) {
              console.log("Error cancelling trip: ".concat(error.message));
              req.flash("error", "Failed to cancel the trip.");
              res.redirect("/trips/admin?tripStatus=Pending");
            }

          case 1:
          case "end":
            return _context7.stop();
        }
      }
    });
  },
  // validates the trip input for the trip create form
  validate: function validate(req, res, next) {
    req.check("tripDate", "Trip date cannot be empty").notEmpty();
    req.check("pickUpAddress", "Pick up address cannot be empty").notEmpty();
    req.check("dropOffAddress", "Drop off address cannot be empty").notEmpty();
    req.check("num_of_passengers", "Number of passengers cannot be empty").notEmpty();
    req.check("pickUpTime", "Pick up time cannot be empty").notEmpty();
    req.check("tripType", "Trip type cannot be empty").notEmpty(); // check if the address is valid

    if (req.body.tripUserEmail) {
      req.check("tripUserEmail", "Email is not valid").isEmail();
    }

    if (req.body.tripUserPhone) {
      req.check("tripUserPhone", "Phone number is not valid").isMobilePhone();
    }

    req.getValidationResult().then(function (error) {
      if (!error.isEmpty()) {
        var messages = error.array().map(function (e) {
          return e.msg;
        });
        req.skip = true;
        req.flash("error", messages.join(" and "));
        res.locals.redirect = "/trips/new";
        next();
      } else {
        next();
      }
    });
  },
  // validates the user input for the user update form
  validateUpdate: function validateUpdate(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
      req.check("tripDate", "Trip date cannot be empty").notEmpty();
      req.check("pickUpAddress", "Pick up address cannot be empty").notEmpty();
      req.check("dropOffAddress", "Drop off address cannot be empty").notEmpty();
      req.check("num_of_passengers", "Number of passengers cannot be empty").notEmpty();
      req.check("pickUpTime", "Pick up time cannot be empty").notEmpty();
      req.check("tripType", "Trip type cannot be empty").notEmpty();
      req.getValidationResult().then(function (error) {
        if (!error.isEmpty()) {
          var messages = error.array().map(function (e) {
            return e.msg;
          });
          req.skip = true;
          req.flash("error", messages.join(" and "));
          res.locals.redirect = "/trips/".concat(req.params.id, "/edit");
          next();
        } else {
          next();
        }
      });
    } else {
      next();
    }
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
  completeTrip: function completeTrip(req, res, next) {
    var _tripId3, _trip3;

    return regeneratorRuntime.async(function completeTrip$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.prev = 0;
            _tripId3 = req.params.id;
            _context8.next = 4;
            return regeneratorRuntime.awrap(Trip.findByIdAndUpdate(_tripId3, {
              tripStatus: 'Completed'
            }));

          case 4:
            _context8.next = 6;
            return regeneratorRuntime.awrap(Trip.findById(_tripId3));

          case 6:
            _trip3 = _context8.sent;
            _context8.next = 9;
            return regeneratorRuntime.awrap(sendEmail(_trip3.tripUserEmail, 'Reservation Completed', 'complete', _trip3));

          case 9:
            req.flash("success", 'Trip status updated successfully');
            res.redirect('/trips/admin'); // Redirect to the admin view after completing the trip

            _context8.next = 17;
            break;

          case 13:
            _context8.prev = 13;
            _context8.t0 = _context8["catch"](0);
            console.log('Error updating trip status:', _context8.t0);
            res.sendStatus(500);

          case 17:
          case "end":
            return _context8.stop();
        }
      }
    }, null, null, [[0, 13]]);
  },
  updateTripStatusToInProgress: function updateTripStatusToInProgress(req, res, next) {
    var _tripId4, _trip4;

    return regeneratorRuntime.async(function updateTripStatusToInProgress$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.prev = 0;
            _tripId4 = req.params.id; // Find the trip by ID and update the status to "In-Progress"

            _context9.next = 4;
            return regeneratorRuntime.awrap(Trip.findByIdAndUpdate(_tripId4, {
              $set: {
                tripStatus: 'In-Progress'
              }
            }, {
              "new": true
            }));

          case 4:
            _trip4 = _context9.sent;

            if (_trip4) {
              _context9.next = 8;
              break;
            }

            req.flash('error', 'Trip not found.');
            return _context9.abrupt("return", res.redirect("/trips/".concat(_tripId4)));

          case 8:
            req.flash('success', 'Trip status updated to In-Progress.');
            res.redirect("/trips/".concat(_tripId4));
            _context9.next = 17;
            break;

          case 12:
            _context9.prev = 12;
            _context9.t0 = _context9["catch"](0);
            console.log('Error updating trip status:', _context9.t0);
            req.flash('error', 'Failed to update trip status.');
            res.redirect("/trips/".concat(tripId));

          case 17:
          case "end":
            return _context9.stop();
        }
      }
    }, null, null, [[0, 12]]);
  }
};