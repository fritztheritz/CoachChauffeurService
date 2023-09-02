"use strict";

var _require = require('../public/js/squareClient'),
    square = _require.squareClient,
    ApiError = _require.ApiError;

var _require2 = require('micro'),
    send = _require2.send,
    bail = _require2.bail;

var _require3 = require('@lifeomic/attempt'),
    retry = _require3.retry;

var _require4 = require('../models/paymentSchema'),
    validatePaymentPayload = _require4.validatePaymentPayload;

var Trip = require("../models/trip");

var mongoose = require("mongoose");

var dotenv = require('dotenv');

var _require5 = require("../public/js/sendmail"),
    sendEmail = _require5.sendEmail,
    sendContact = _require5.sendContact;

dotenv.config();
module.exports = {
  index: function index(req, res) {
    // Render the payment form to the user.
    Trip.findById(req.params.id).then(function (trip) {
      res.render("trips/payment", {
        app_id: process.env.SQUARE_APPLICATION_ID,
        location_id: process.env.SQUARE_LOCATION_ID,
        price: trip.price,
        trip: trip
      });
    })["catch"](function (err) {
      console.log(err);
      res.redirect("/trips");
      req.flash("error", "There was an error finding the trip.");
    });
  },
  processPayment: function processPayment(req, res) {
    var payload, price, savedTrip, shouldRedirect, redirectUrl, paymentCreated;
    return regeneratorRuntime.async(function processPayment$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            req.body = JSON.stringify(req.body);
            payload = JSON.parse(req.body); // We validate the payload for specific fields. You may disable this feature
            // if you would prefer to handle payload validation on your own.

            if (validatePaymentPayload(payload)) {
              _context2.next = 5;
              break;
            }

            console.log("bad request");
            throw new Error('Bad Request');

          case 5:
            price = 0;
            savedTrip = null;
            shouldRedirect = false;
            _context2.prev = 8;
            _context2.next = 11;
            return regeneratorRuntime.awrap(Trip.findById(req.params.id));

          case 11:
            savedTrip = _context2.sent;
            price = savedTrip.price;
            _context2.next = 20;
            break;

          case 15:
            _context2.prev = 15;
            _context2.t0 = _context2["catch"](8);
            console.log(_context2.t0);
            req.flash("error", "There was an error finding the trip.");
            shouldRedirect = true;

          case 20:
            redirectUrl = null;

            if (shouldRedirect) {
              _context2.next = 35;
              break;
            }

            _context2.prev = 22;
            paymentCreated = false;
            _context2.next = 26;
            return regeneratorRuntime.awrap(retry(function _callee(_ref) {
              var attempt, payment, _ref2, result, statusCode;

              return regeneratorRuntime.async(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      attempt = _ref.attempt;
                      _context.prev = 1;
                      payment = {
                        idempotencyKey: payload.idempotencyKey,
                        locationId: payload.locationId,
                        sourceId: payload.sourceId,
                        // While it's tempting to pass this data from the client
                        // Doing so allows a bad actor to modify these values
                        // Instead, leverage Orders to create an order on the server
                        // and pass the Order ID to createPayment rather than raw amounts
                        // See Orders documentation: https://developer.squareup.com/docs/orders-api/what-it-does
                        amountMoney: {
                          // the expected amount is in cents, meaning this is $1.00.
                          amount: price * 100 + "",
                          // If you are a non-US account, you must change the currency to match the country in which
                          // you are accepting the payment.
                          currency: 'USD'
                        }
                      }; // If a trip is a road trip, we don't want to autocomplete the payment

                      if (savedTrip.tripType === "Road Trip") {
                        payment.autocomplete = false; // set the delay duration to 3 weeks
                        // payment.delayDuration = "P21D";
                      }

                      if (payload.customerId) {
                        payment.customerId = payload.customerId;
                      } // VerificationDetails is part of Secure Card Authentication.
                      // This part of the payload is highly recommended (and required for some countries)
                      // for 'unauthenticated' payment methods like Cards.


                      if (payload.verificationToken) {
                        payment.verificationToken = payload.verificationToken;
                      }

                      _context.next = 8;
                      return regeneratorRuntime.awrap(square.paymentsApi.createPayment(payment));

                    case 8:
                      _ref2 = _context.sent;
                      result = _ref2.result;
                      statusCode = _ref2.statusCode;
                      send(res, statusCode, {
                        success: true,
                        payment: {
                          id: result.payment.id,
                          status: result.payment.status,
                          receiptUrl: result.payment.receiptUrl,
                          orderId: result.payment.orderId
                        },
                        flashMessage: 'Payment Successful'
                      }); // store the payment id in the trip

                      savedTrip.paymentId = result.payment.id;
                      savedTrip.idempotencyKey = payload.idempotencyKey; // change trip status to paid

                      savedTrip.paid = true;
                      savedTrip.tripStatus = "Confirmed";
                      sendEmail(savedTrip.tripUserEmail, "Payment Successful", "payment", savedTrip, null);

                      if (savedTrip.tripType === "Road Trip") {
                        savedTrip.paid = false;
                      }

                      _context.next = 20;
                      return regeneratorRuntime.awrap(savedTrip.save());

                    case 20:
                      paymentCreated = true;
                      _context.next = 31;
                      break;

                    case 23:
                      _context.prev = 23;
                      _context.t0 = _context["catch"](1);

                      if (!(_context.t0 instanceof ApiError)) {
                        _context.next = 29;
                        break;
                      }

                      // likely an error in the request. don't retry
                      bail(_context.t0);
                      _context.next = 31;
                      break;

                    case 29:
                      // IDEA: send to error reporting service
                      // logger.error(`Error creating payment on attempt ${attempt}: ${ex}`);
                      console.log("Error creating payment on attempt ".concat(attempt, ": ").concat(_context.t0));
                      throw _context.t0;

                    case 31:
                    case "end":
                      return _context.stop();
                  }
                }
              }, null, null, [[1, 23]]);
            }));

          case 26:
            if (!paymentCreated) {
              shouldRedirect = true;
              redirectUrl = "/trips/" + savedTrip._id + "/payment";
            }

            _context2.next = 35;
            break;

          case 29:
            _context2.prev = 29;
            _context2.t1 = _context2["catch"](22);
            console.log(_context2.t1);
            req.flash("error", "There was an error processing the payment.");
            shouldRedirect = true;
            redirectUrl = "/trips/" + savedTrip._id + "/payment";

          case 35:
            if (shouldRedirect) {
              redirectUrl = redirectUrl || "/trips";
              req.flash("success", "Payment successful!");
            } else {
              redirectUrl = "/trips";
              req.flash("success", "Payment successful!");
            }

          case 36:
          case "end":
            return _context2.stop();
        }
      }
    }, null, null, [[8, 15], [22, 29]]);
  },
  captureDelayedPayment: function captureDelayedPayment(req, res) {
    var paymentId, savedTrip, requestBody, response;
    return regeneratorRuntime.async(function captureDelayedPayment$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            paymentId = null;
            savedTrip = null;
            _context3.next = 5;
            return regeneratorRuntime.awrap(Trip.findById(req.params.id).then(function (trip) {
              paymentId = trip.paymentId; // Assuming the payment ID is passed as a URL parameter

              savedTrip = trip; // const updatedAmount = trip.price; // Assuming the updated amount is sent in the request body
            })["catch"](function (err) {
              console.log(err);
              req.flash("error", "There was an error finding the trip.");
              res.redirect("/trips");
            }));

          case 5:
            // Build the request body to capture the delayed payment
            requestBody = {
              autocomplete: true // Setting this to true indicates you want to capture the payment immediately

            }; // Perform the delayed capture

            _context3.next = 8;
            return regeneratorRuntime.awrap(square.paymentsApi.completePayment(paymentId, requestBody));

          case 8:
            response = _context3.sent;
            console.log('Payment captured successfully'); // go back to the home page and display a message

            savedTrip.paid = true;
            savedTrip.tripStatus = "Confirmed";
            _context3.next = 14;
            return regeneratorRuntime.awrap(savedTrip.save());

          case 14:
            req.flash("success", "Payment captured successfully!");
            res.redirect("/");
            _context3.next = 22;
            break;

          case 18:
            _context3.prev = 18;
            _context3.t0 = _context3["catch"](0);
            // Handle errors
            console.error('Error capturing delayed payment:', _context3.t0);
            res.status(500).json({
              error: 'Error capturing delayed payment.'
            });

          case 22:
          case "end":
            return _context3.stop();
        }
      }
    }, null, null, [[0, 18]]);
  },
  updatePayment: function updatePayment(req, res) {
    var updatedAmount, paymentId, savedTrip, response;
    return regeneratorRuntime.async(function updatePayment$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;
            updatedAmount = req.body.price; // (req.body.amount)

            paymentId = null;
            savedTrip = null;
            _context4.next = 6;
            return regeneratorRuntime.awrap(Trip.findById(req.params.id).then(function (trip) {
              paymentId = trip.paymentId; // Assuming the payment ID is passed as a URL parameter

              savedTrip = trip;
            })["catch"](function (err) {
              console.log(err);
              req.flash("error", "There was an error finding the trip.");
              res.redirect("/trips");
            }));

          case 6:
            _context4.next = 8;
            return regeneratorRuntime.awrap(square.paymentsApi.updatePayment(paymentId, {
              payment: {
                amountMoney: {
                  amount: updatedAmount * 100 + "",
                  currency: 'USD'
                }
              },
              idempotencyKey: savedTrip.idempotencyKey
            }));

          case 8:
            response = _context4.sent;
            savedTrip.price = updatedAmount;
            savedTrip.priceUpdated = true;
            _context4.next = 13;
            return regeneratorRuntime.awrap(savedTrip.save());

          case 13:
            console.log('Payment updated successfully.');
            req.flash("success", "Payment updated successfully!");
            res.redirect("/trips/admin?tripStatus=Pending"); // send an email to the user
            //   sendEmail(savedTrip.tripUserEmail, "Payment Updated", "payment", savedTrip, null);

            _context4.next = 22;
            break;

          case 18:
            _context4.prev = 18;
            _context4.t0 = _context4["catch"](0);
            // Handle errors
            console.error('Error updating payment:', _context4.t0);
            res.status(500).json({
              error: 'Error updating payment.'
            });

          case 22:
          case "end":
            return _context4.stop();
        }
      }
    }, null, null, [[0, 18]]);
  },
  getUpdateForm: function getUpdateForm(req, res) {
    var savedTrip;
    return regeneratorRuntime.async(function getUpdateForm$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            // displays a form that allows the admin to update the payment
            savedTrip = null;
            _context5.next = 3;
            return regeneratorRuntime.awrap(Trip.findById(req.params.id).then(function (trip) {
              savedTrip = trip;
            })["catch"](function (err) {
              console.log(err);
              req.flash("error", "There was an error finding the trip.");
              res.redirect("/trips");
            }));

          case 3:
            res.render("trips/updatePayment", {
              trip: savedTrip
            });

          case 4:
          case "end":
            return _context5.stop();
        }
      }
    });
  }
};