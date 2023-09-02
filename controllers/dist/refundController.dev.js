"use strict";

var Refund = require("../models/refund");

var trip = require("../models/trip");

var Trip = require("../models/trip");

var User = require("../models/user");

var _require = require("../public/js/sendmail"),
    sendEmail = _require.sendEmail;

var _require2 = require('uuid'),
    uuidv4 = _require2.v4;

var _require3 = require('../public/js/squareClient'),
    square = _require3.squareClient,
    ApiError = _require3.ApiError;

var paginate = require('express-paginate');

var refundsApi = square.refundsApi;

var getRefundParams = function getRefundParams(body) {
  return {
    trip: body.trip,
    refundAmount: body.refundAmount,
    refundReason: body.refundReason,
    refundStatus: body.refundStatus,
    refundNotes: body.refundNotes
  };
};

module.exports = {
  index: function index(req, res, next) {
    Refund.find().populate("trip").then(function (refunds) {
      res.locals.refunds = refunds;
      next();
    })["catch"](function (error) {
      console.log("Error fetching refunds: ".concat(error.message));
      next(error);
    });
  },
  indexView: function indexView(req, res) {
    var refundStatus, query, refunds, page, limit, items, itemCount, pageCount, offset, paginatedItems;
    return regeneratorRuntime.async(function indexView$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(req.user && req.user.isAdmin)) {
              _context.next = 17;
              break;
            }

            refundStatus = req.query.refundStatus;
            query = {}; // Handle the refundStatus filter

            if (refundStatus) {
              query.refundStatus = refundStatus;
            } // try {


            _context.next = 6;
            return regeneratorRuntime.awrap(Refund.find(query).populate('trip'));

          case 6:
            refunds = _context.sent;
            page = req.query.page || 1;
            limit = req.query.limit || 6; // Perform pagination logic on your data source
            // Example: Fetch items from a database

            items = refunds;
            itemCount = items.length;
            pageCount = Math.ceil(itemCount / limit); // Calculate the offset for slicing the items array

            offset = limit * (page - 1); // Slice the items array to get the items for the current page

            paginatedItems = items.slice(offset, offset + limit);
            res.render('refunds/index', {
              refunds: refunds.slice(offset, offset + limit),
              searchOptions: refundStatus,
              currentPage: page,
              pageCount: pageCount,
              pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
              limit: limit
            }); // } catch (error) {
            // 	req.flash('error', 'An error occurred while fetching refunds.');
            // 	res.redirect('/trips/refund-requests');
            // }

            _context.next = 19;
            break;

          case 17:
            req.flash('error', 'You are not authorized to view this page.');
            res.redirect('/');

          case 19:
          case "end":
            return _context.stop();
        }
      }
    });
  },
  "new": function _new(req, res) {
    Trip.findById(req.params.id).then(function (trip) {
      res.locals.trip = trip;
      res.render("refunds/new", {
        trip: trip
      });
    })["catch"](function (error) {
      console.log("Error fetching trip by ID: ".concat(error.message));
      next(error);
    });
  },
  // store the refund request in the database
  create: function create(req, res, next) {
    var refundParams = getRefundParams(req.body);
    Refund.create(refundParams).then(function (refund) {
      res.locals.redirect = "/";
      res.locals.refund = refund;
      req.flash("success", "Refund request submitted successfully!");
      Trip.findById(refundParams.trip).then(function (trip) {
        sendEmail(trip.tripUserEmail, 'Refund Requested', 'refund', trip, null, req, refund);
      })["catch"](function (error) {
        console.log("Error fetching trip by ID: ".concat(error.message));
        next(error);
      });
      next();
    })["catch"](function (error) {
      console.log("Error saving refund: ".concat(error.message));
      next(error);
    });
  },
  redirectView: function redirectView(req, res, next) {
    var redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);else next();
  },
  show: function show(req, res, next) {
    var refundId = req.params.refundId;
    Refund.findById(refundId).populate("trip").then(function (refund) {
      res.locals.refund = refund;
      next();
    })["catch"](function (error) {
      console.log("Error fetching refund by ID: ".concat(error.message));
      next(error);
    });
  },
  showView: function showView(req, res) {
    if (req.user && req.user.isAdmin) {
      res.render("refunds/show");
    } else {
      req.flash("error", "You are not authorized to view this page.");
      res.redirect("/");
    }
  },
  edit: function edit(req, res, next) {
    if (req.user && req.user.isAdmin) {
      var refundId = req.params.refundId;
      Refund.findById(refundId).populate("trip").then(function (refund) {
        res.render("refunds/edit", {
          refund: refund
        });
      })["catch"](function (error) {
        console.log("Error fetching refund by ID: ".concat(error.message));
        next(error);
      });
    } else {
      req.flash("error", "You are not authorized to view this page.");
      res.redirect("/");
    }
  },
  update: function update(req, res, next) {
    var refundId = req.params.refundId;
    var tripId = req.params.id;
    var userEmail = null;
    var tripHolder = null;
    var paymentId = null; // Added this line

    var refundParams = getRefundParams(req.body);
    Refund.findByIdAndUpdate(refundId, {
      $set: refundParams
    }).then(function (refund) {
      console.log("refund", refund);

      if (refund.refundStatus == "Approved") {
        res.locals.redirect = "/trips/".concat(tripId, "/refund/").concat(refundId);
        res.locals.refund = refund;
        req.flash("success", "Refund request updated successfully!"); // get the user who created the trip and the payment ID

        Trip.findById(tripId).then(function (trip) {
          userEmail = trip.tripUserEmail;
          tripHolder = trip;
          paymentId = trip.paymentId; // Added this line

          console.log("Payment ID: ".concat(paymentId)); // Before calling the refund function, check if the paymentId exists

          if (paymentId) {
            square.refundsApi.refundPayment({
              idempotencyKey: uuidv4(),
              paymentId: paymentId,
              // Use the paymentId here
              amountMoney: {
                amount: parseInt(refundParams.refundAmount) * 100,
                // Square API expects the amount in smallest currency unit. In case of USD, it's cents.
                currency: 'USD'
              },
              reason: refundParams.refundReason || 'Refund Issued'
            }).then(function (response) {
              console.log("Refund successful, response: ".concat(response));
            })["catch"](function (error) {
              console.log("Error occurred while refunding: ".concat(error));
            });
          } else {
            console.log("No payment ID found for this trip");
          }
        });
      } else {
        Trip.findById(tripId).then(function (trip) {
          userEmail = trip.tripUserEmail;
          sendEmail(userEmail, 'Refund Request Update', 'refund-denied');
          tripHolder = trip;
          trip.refunded = false;
          trip.save();
        })["catch"](function (error) {
          console.log("Error fetching trip by ID: ".concat(error.message));
          next(error);
        });
      }
    })["catch"](function (error) {
      console.log("Error updating refund by ID: ".concat(error.message));
      next(error);
    });
  },
  "delete": function _delete(req, res, next) {
    if (req.user && req.user.isAdmin) {
      var refundId = req.params.refundId;
      Refund.findByIdAndRemove(refundId).then(function () {
        res.locals.redirect = "/trips/refund-requests";
        req.flash("success", "Refund request deleted successfully!");
        next();
      })["catch"](function (error) {
        console.log("Error deleting refund by ID: ".concat(error.message));
        next(error);
      });
    } else {
      req.flash("error", "You are not authorized to view this page.");
      res.redirect("/");
    }
  },
  denyRefund: function denyRefund(req, res, next) {
    var refundId, refund;
    return regeneratorRuntime.async(function denyRefund$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            refundId = req.params.id;
            _context2.next = 4;
            return regeneratorRuntime.awrap(Refund.findByIdAndUpdate(refundId, {
              $set: {
                refundStatus: 'Denied'
              }
            }, {
              "new": true
            }).populate('trip'));

          case 4:
            refund = _context2.sent;

            if (refund) {
              _context2.next = 8;
              break;
            }

            req.flash('error', 'Refund not found.');
            return _context2.abrupt("return", res.redirect('/trips/refund-requests?refundStatus=Pending'));

          case 8:
            sendEmail(refund.trip.tripUserEmail, 'Refund Denied', 'refund-denied', refund.trip, null, req, refund);
            res.redirect('/trips/refund-requests?refundStatus=Pending');
            _context2.next = 17;
            break;

          case 12:
            _context2.prev = 12;
            _context2.t0 = _context2["catch"](0);
            console.log('Error denying refund:', _context2.t0);
            req.flash('error', 'Failed to deny refund.');
            res.redirect('/trips/refund-requests?refundStatus=Pending');

          case 17:
          case "end":
            return _context2.stop();
        }
      }
    }, null, null, [[0, 12]]);
  },
  approveRefund: function approveRefund(req, res, next) {
    var refundId, refund;
    return regeneratorRuntime.async(function approveRefund$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            refundId = req.params.id;
            _context3.next = 4;
            return regeneratorRuntime.awrap(Refund.findByIdAndUpdate(refundId, {
              $set: {
                refundStatus: 'Approved'
              }
            }, {
              "new": true
            }).populate('trip'));

          case 4:
            refund = _context3.sent;

            if (refund) {
              _context3.next = 8;
              break;
            }

            req.flash('error', 'Refund not found.');
            return _context3.abrupt("return", res.redirect('trips/refund-requests?refundStatus=Pending'));

          case 8:
            // Before calling the refund function, check if the paymentId exists
            if (refund.trip.paymentId) {
              square.refundsApi.refundPayment({
                idempotencyKey: uuidv4(),
                paymentId: refund.trip.paymentId,
                // Use the paymentId here
                amountMoney: {
                  amount: refund.refundAmount * 100,
                  // Square API expects the amount in smallest currency unit. In case of USD, it's cents.
                  currency: 'USD'
                },
                reason: refund.refundReason || 'Refund Issued'
              }).then(function (response) {
                console.log("Refund successful, response: ".concat(response));
              })["catch"](function (error) {
                console.log("Error occurred while refunding: ".concat(error));
              });
            } else {
              console.log("No payment ID found for this trip");
            }

            sendEmail(refund.trip.tripUserEmail, 'Refund Approved', 'refund-approved', refund.trip, null, req, refund);
            res.redirect('/trips/refund-requests?refundStatus=Pending');
            _context3.next = 18;
            break;

          case 13:
            _context3.prev = 13;
            _context3.t0 = _context3["catch"](0);
            console.log('Error approving refund:', _context3.t0);
            req.flash('error', 'Failed to approve refund.');
            res.redirect('/trips/refund-requests?refundStatus=Pending');

          case 18:
          case "end":
            return _context3.stop();
        }
      }
    }, null, null, [[0, 13]]);
  }
};