const Refund = require("../models/refund");
const trip = require("../models/trip");
const Trip = require("../models/trip");
const User = require("../models/user");
const { sendEmail } = require("../public/js/sendmail");
const { v4: uuidv4 } = require('uuid');
const { squareClient: square, ApiError } = require('../public/js/squareClient');
const paginate = require('express-paginate');

const refundsApi = square.refundsApi;

const getRefundParams = (body) => {
	  return {
		trip: body.trip,
		refundAmount: body.refundAmount,
		refundReason: body.refundReason,
		refundStatus: body.refundStatus,
		refundNotes: body.refundNotes,
	};
}

module.exports = {
	index: (req, res, next) => {
		Refund.find()
		.populate("trip")
		.then(refunds => {
			res.locals.refunds = refunds;
			next();
		})
		.catch(error => {
			console.log(`Error fetching refunds: ${error.message}`);
			next(error);
		});
	}, 
	indexView: async (req, res) => {
		if (req.user && req.user.isAdmin) {
			const { refundStatus } = req.query;
			let query = {};
	
			// Handle the refundStatus filter
			if (refundStatus) {
				query.refundStatus = refundStatus;
			}

			
	
			// try {
				const refunds = await Refund.find(query).populate('trip');

				const page = req.query.page || 1;
				const limit = req.query.limit || 6;

				// Perform pagination logic on your data source
				// Example: Fetch items from a database
				const items = refunds;
				const itemCount = items.length;
				const pageCount = Math.ceil(itemCount / limit);

				// Calculate the offset for slicing the items array
				const offset = limit * (page - 1);

				// Slice the items array to get the items for the current page
				const paginatedItems = items.slice(offset, offset + limit);

				res.render('refunds/index', {
					refunds: refunds.slice(offset, offset + limit),
					searchOptions: refundStatus,
					currentPage: page,
					pageCount: pageCount,
					pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
					limit: limit,

				});
			// } catch (error) {
			// 	req.flash('error', 'An error occurred while fetching refunds.');
			// 	res.redirect('/trips/refund-requests');
			// }
		} else {
			req.flash('error', 'You are not authorized to view this page.');
			res.redirect('/');
		}
	},	
	
	new: (req, res) => {
		Trip.findById(req.params.id)
		.then(trip => {
			res.locals.trip = trip;
			res.render("refunds/new", {trip: trip});
		})
		.catch(error => {
			console.log(`Error fetching trip by ID: ${error.message}`);
			next(error);
		}
		);
	}, 

	// store the refund request in the database
	create: (req, res, next) => {
		let refundParams = getRefundParams(req.body);
		Refund.create(refundParams)
		.then(refund => {
			res.locals.redirect = "/";
			res.locals.refund = refund;
			req.flash("success", "Refund request submitted successfully!");
			Trip.findById(refundParams.trip)
			.then(trip => {
				sendEmail(trip.tripUserEmail, 'Refund Requested', 'refund', trip, null, req, refund );
			})
			.catch(error => {
				console.log(`Error fetching trip by ID: ${error.message}`);
				next(error);
			}
			);
			next();
		})
		.catch(error => {
			console.log(`Error saving refund: ${error.message}`);
			next(error);
		});
	},

  	redirectView: (req, res, next) => {
		let redirectPath = res.locals.redirect;
    	if (redirectPath) res.redirect(redirectPath);
    	else next();
	},
	show: (req, res, next) => {
		let refundId = req.params.refundId;
		Refund.findById(refundId)
		.populate("trip")
		.then(refund => {
			res.locals.refund = refund;
			next();
		}
		)
		.catch(error => {
			console.log(`Error fetching refund by ID: ${error.message}`);
			next(error);
		}
		);
	},
	showView: (req, res) => {
		if(req.user && req.user.isAdmin){
			res.render("refunds/show");
		} else {
			req.flash("error", "You are not authorized to view this page.");
			res.redirect("/");
		}
	},
	edit: (req, res, next) => {
		if(req.user && req.user.isAdmin){
			let refundId = req.params.refundId;
			Refund.findById(refundId)
			.populate("trip")
			.then(refund => {
				res.render("refunds/edit", {refund: refund});
			}
			)
			.catch(error => {
				console.log(`Error fetching refund by ID: ${error.message}`);
				next(error);
			}
			);
		} else {
			req.flash("error", "You are not authorized to view this page.");
			res.redirect("/");
		}


	},
	update: (req, res, next) => {
		let refundId = req.params.refundId;
		let tripId = req.params.id;
		let userEmail = null;
		let tripHolder = null;
		let paymentId = null; // Added this line
		let refundParams = getRefundParams(req.body);
		Refund.findByIdAndUpdate(refundId, {
			$set: refundParams
	})
	.then(refund => {
		console.log("refund", refund);
		if(refund.refundStatus == "Approved"){
			res.locals.redirect = `/trips/${tripId}/refund/${refundId}`;
			res.locals.refund = refund;
			req.flash("success", "Refund request updated successfully!");
			// get the user who created the trip and the payment ID
			Trip.findById(tripId)
			.then(trip => {
				userEmail = trip.tripUserEmail;
				tripHolder = trip;
				paymentId = trip.paymentId; // Added this line
				console.log(`Payment ID: ${paymentId}`); 
				// Before calling the refund function, check if the paymentId exists
				if (paymentId) {
					square.refundsApi.refundPayment({
						idempotencyKey: uuidv4(),
						paymentId: paymentId,  // Use the paymentId here
						amountMoney: {
						amount: parseInt(refundParams.refundAmount) * 100, // Square API expects the amount in smallest currency unit. In case of USD, it's cents.
						currency: 'USD'
						},
						reason: refundParams.refundReason || 'Refund Issued'
					})
					.then(response => {
						console.log(`Refund successful, response: ${response}`);
					})
					.catch(error => {
						console.log(`Error occurred while refunding: ${error}`);
					});
				}
				else {
					console.log("No payment ID found for this trip");
				}
			
			})
			 
		} 
		else {
			Trip.findById(tripId)
			.then(trip => {
				userEmail = trip.tripUserEmail;
				sendEmail(userEmail, 'Refund Request Update', 'refund-denied');
				tripHolder = trip;	
				trip.refunded = false;
				trip.save();			
			})
			.catch(error => {
				console.log(`Error fetching trip by ID: ${error.message}`);
				next(error);
			}
			);
		}
	})

	.catch(error => {
		console.log(`Error updating refund by ID: ${error.message}`);
		next(error);
	});
	},
	delete: (req, res, next) => {
		if(req.user && req.user.isAdmin){
			let refundId = req.params.refundId;

			Refund.findByIdAndRemove(refundId)
			.then(() => {
				res.locals.redirect = `/trips/refund-requests`;
				req.flash("success", "Refund request deleted successfully!");
				next();
			}
			)
			.catch(error => {
				console.log(`Error deleting refund by ID: ${error.message}`);
				next(error);
			}
			);
		} else {
			req.flash("error", "You are not authorized to view this page.");
			res.redirect("/");
		}
	},
	

  denyRefund: async (req, res, next) => {
    try {
      const refundId = req.params.id;
      const refund = await Refund.findByIdAndUpdate(
        refundId,
        { $set: { refundStatus: 'Denied' } },
        { new: true }
      ).populate('trip');

      if (!refund) {
        req.flash('error', 'Refund not found.');
        return res.redirect('/trips/refund-requests?refundStatus=Pending');
      }

      sendEmail(refund.trip.tripUserEmail, 'Refund Denied', 'refund-denied', refund.trip, null, req, refund);
      res.redirect('/trips/refund-requests?refundStatus=Pending');
    } catch (error) {
      console.log('Error denying refund:', error);
      req.flash('error', 'Failed to deny refund.');
      res.redirect('/trips/refund-requests?refundStatus=Pending');
    }
  },

  approveRefund: async (req, res, next) => {
    try {
      const refundId = req.params.id;
      const refund = await Refund.findByIdAndUpdate(
        refundId,
        { $set: { refundStatus: 'Approved' } },
        { new: true }
      ).populate('trip');

      if (!refund) {
        req.flash('error', 'Refund not found.');
        return res.redirect('trips/refund-requests?refundStatus=Pending');
      }

	  // Before calling the refund function, check if the paymentId exists
	  if (refund.trip.paymentId) {
		square.refundsApi.refundPayment({
			idempotencyKey: uuidv4(),
			paymentId: refund.trip.paymentId,  // Use the paymentId here
			amountMoney: {
			amount: refund.refundAmount * 100, // Square API expects the amount in smallest currency unit. In case of USD, it's cents.
			currency: 'USD'
			},
			reason: refund.refundReason || 'Refund Issued'
		})
		.then(response => {
			console.log(`Refund successful, response: ${response}`);
		})
		.catch(error => {
			console.log(`Error occurred while refunding: ${error}`);
		});
	}
	else {
		console.log("No payment ID found for this trip");
	}

      sendEmail(refund.trip.tripUserEmail, 'Refund Approved', 'refund-approved', refund.trip, null, req, refund);
      res.redirect('/trips/refund-requests?refundStatus=Pending');
    } catch (error) {
      console.log('Error approving refund:', error);
      req.flash('error', 'Failed to approve refund.');
      res.redirect('/trips/refund-requests?refundStatus=Pending');
    }
  },

};	


