const { squareClient: square, ApiError } = require('../public/js/squareClient');
const { send, bail } = require('micro');
const { retry } = require('@lifeomic/attempt');
const { validatePaymentPayload } = require('../models/paymentSchema');
const Trip = require("../models/trip");
const mongoose = require("mongoose");
const dotenv = require('dotenv');
const { sendEmail, sendContact } = require("../public/js/sendmail");
dotenv.config();

module.exports = {
  index: (req, res) => {
    // Render the payment form to the user.
	Trip.findById(req.params.id)
		.then(trip => {
			res.render("trips/payment", {app_id: process.env.SQUARE_APPLICATION_ID, location_id: process.env.SQUARE_LOCATION_ID, price: trip.price, trip: trip});
  		})
		.catch((err) => {
			console.log(err);
			res.redirect("/trips");
			req.flash("error", "There was an error finding the trip.");
  	});
  },

  processPayment: async (req, res) => {
    req.body = JSON.stringify(req.body);

    const payload = JSON.parse(req.body);
    // We validate the payload for specific fields. You may disable this feature
    // if you would prefer to handle payload validation on your own.
    if (!validatePaymentPayload(payload)) {
      console.log("bad request");
      throw new Error('Bad Request');
    }

	let price = 0;
	let savedTrip = null;
	let shouldRedirect = false;

	try {
		savedTrip = await Trip.findById(req.params.id);
		price = savedTrip.price;
	  } catch (err) {
		console.log(err);
		req.flash("error", "There was an error finding the trip.");
		shouldRedirect = true;
	}
	
	let redirectUrl = null;
	if (!shouldRedirect) {
		try {
		  	let paymentCreated = false;
			await retry(async ({ attempt }) => {
			try {
				const payment = {
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
					amount: (price * 100) + "",
					// If you are a non-US account, you must change the currency to match the country in which
					// you are accepting the payment.
					currency: 'USD',
				},
				};
				// If a trip is a road trip, we don't want to autocomplete the payment
				if(savedTrip.tripType === "Road Trip") {
					payment.autocomplete = false;
					// set the delay duration to 3 weeks
					// payment.delayDuration = "P21D";
				}

				if (payload.customerId) {
					payment.customerId = payload.customerId;
				}
				// VerificationDetails is part of Secure Card Authentication.
				// This part of the payload is highly recommended (and required for some countries)
				// for 'unauthenticated' payment methods like Cards.
				if (payload.verificationToken) {
					payment.verificationToken = payload.verificationToken;
				}

				const { result, statusCode } = await square.paymentsApi.createPayment(payment);

				send(res, statusCode, {
				success: true,
				payment: {
					id: result.payment.id,
					status: result.payment.status,
					receiptUrl: result.payment.receiptUrl,
					orderId: result.payment.orderId,
				},
				flashMessage: 'Payment Successful',
				});

				// store the payment id in the trip
				savedTrip.paymentId = result.payment.id;
				savedTrip.idempotencyKey = payload.idempotencyKey;
				
				// change trip status to paid
				savedTrip.paid = true;
				savedTrip.tripStatus = "Confirmed";
				sendEmail(savedTrip.tripUserEmail, "Payment Successful", "payment", savedTrip, null);
				if(savedTrip.tripType === "Road Trip") {
					savedTrip.paid = false;
		
				}
				await savedTrip.save();
				paymentCreated = true;
			} catch (ex) {
				if (ex instanceof ApiError) {
				// likely an error in the request. don't retry
					bail(ex);
				} else {
				// IDEA: send to error reporting service
				// logger.error(`Error creating payment on attempt ${attempt}: ${ex}`);
					console.log(`Error creating payment on attempt ${attempt}: ${ex}`);
					throw ex; // to attempt retry
				}
			}
		});
		if (!paymentCreated) {
			shouldRedirect = true;
			redirectUrl = "/trips/" + savedTrip._id + "/payment";}
		}
		catch (err) {
			console.log(err);
			req.flash("error", "There was an error processing the payment.");
			shouldRedirect = true;
			redirectUrl = "/trips/" + savedTrip._id + "/payment";
		}
	}

	if (shouldRedirect) {
		redirectUrl = redirectUrl || "/trips";
		req.flash("success", "Payment successful!");
	  } else {
		redirectUrl = "/trips";
		req.flash("success", "Payment successful!");
	  }
  },
	captureDelayedPayment: async (req, res) => {
	try {
		let paymentId = null;
		let savedTrip = null;
		await Trip.findById(req.params.id)
			.then(trip => {
	  		 	paymentId = trip.paymentId; // Assuming the payment ID is passed as a URL parameter
				savedTrip = trip;
				// const updatedAmount = trip.price; // Assuming the updated amount is sent in the request body
			})
			.catch((err) => {
				console.log(err);
				req.flash("error", "There was an error finding the trip.");
				res.redirect("/trips");
			});
		
  
	  // Build the request body to capture the delayed payment
	  const requestBody = {
		autocomplete: true, // Setting this to true indicates you want to capture the payment immediately
	  };
  
	  // Perform the delayed capture
	  const response = await square.paymentsApi.completePayment(paymentId, requestBody);
  
	  console.log('Payment captured successfully');
	  // go back to the home page and display a message
	  savedTrip.paid = true;
	  savedTrip.tripStatus = "Confirmed";
	  await savedTrip.save();
	  req.flash("success", "Payment captured successfully!");
	  res.redirect("/");
	  
	} catch (error) {
	  // Handle errors
	  console.error('Error capturing delayed payment:', error);
	  res.status(500).json({ error: 'Error capturing delayed payment.' });
	}
  },
  updatePayment: async (req, res) => {
	try {
	  	let updatedAmount = req.body.price; // (req.body.amount)
	  	let paymentId = null;
		let savedTrip = null;
		await Trip.findById(req.params.id)
			.then(trip => {
	  		 	paymentId = trip.paymentId; // Assuming the payment ID is passed as a URL parameter
				savedTrip = trip;
			})
			.catch((err) => {
				console.log(err);
				req.flash("error", "There was an error finding the trip.");
				res.redirect("/trips");
			});

	  // Perform the payment update
	  const response = await square.paymentsApi.updatePayment(paymentId,
	  {
		payment: {
		  amountMoney: {
			amount: (updatedAmount * 100) + "",
			currency: 'USD'
		  }
		},
		idempotencyKey: savedTrip.idempotencyKey
	  });

	  savedTrip.price = updatedAmount;
	  savedTrip.priceUpdated = true;
	  await savedTrip.save();
  
	  console.log('Payment updated successfully.');
	  req.flash("success", "Payment updated successfully!");
	  res.redirect("/trips/admin?tripStatus=Pending");
	  // send an email to the user
	//   sendEmail(savedTrip.tripUserEmail, "Payment Updated", "payment", savedTrip, null);
	} catch (error) {
	  // Handle errors
	  console.error('Error updating payment:', error);
	  res.status(500).json({ error: 'Error updating payment.' });
	}
  },
  getUpdateForm: async (req, res) => {
	// displays a form that allows the admin to update the payment
	let savedTrip = null;
	await Trip.findById(req.params.id)
		.then(trip => {
			savedTrip = trip;
		})
		.catch((err) => {
			console.log(err);
			req.flash("error", "There was an error finding the trip.");
			res.redirect("/trips");
		}
	);
	res.render("trips/updatePayment", {trip: savedTrip});
	},
};
