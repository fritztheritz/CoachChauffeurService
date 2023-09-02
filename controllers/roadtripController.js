const User = require("../models/user");
const RoadTrip = require("../models/roadtrip");
const Refund = require("../models/refund");
const { sendEmail, sendContact } = require("../public/js/sendmail");
const dotenv = require('dotenv');
const axios = require('axios');
const paginate = require('express-paginate');
const shortid = require('shortid');
const { validate } = require('deep-email-validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

dotenv.config();

const getRoadTripParams = (body) => {
	  return {
	tripDate: body.tripDate,
	tripUser: body.tripUser,
	tripUserEmail: body.tripUserEmail,
	tripUserPhone: body.tripUserPhone,
	tripUserName: body.tripUserName,
	pickUpAddress: body.pickUpAddress,
	dropOffAddress: body.dropOffAddress,
	pickUpTime: body.pickUpTime,
	travelTime: body.travelTime,
	price: body.price,
	num_of_passengers: body.num_of_passengers,
	specialInstructions: body.specialInstructions,
	tripStatus: body.tripStatus,
	paid: body.paid,
	tripCode: body.tripCode,
	paymentId: body.paymentId,
	carChoice: body.carChoice,
  };
}

function calculateTravelTime(pickupAddress, dropOffAddress) {
	var url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickupAddress)}&destinations=${encodeURIComponent(dropOffAddress)}&units=imperial&key=${process.env.MPASS}`;
  
	var config = {
	  method: 'get',
	  url: url,
	  headers: {}
	};
  
	return axios(config)
	  .then(function (response) {
		return response.data;
	  })
	  .catch(function (error) {
		console.log(error);
		throw new Error('Failed to calculate travel time');
	  });
  }
  
  const validateEmail = async (email) => {
	try {
	  const apiKey = process.env.EMAILPASS;
	  const response = await axios.get(`https://api.sendbridge.com/v1/validate/${apiKey}/${email}`);
	  return response.data;
	} catch (error) {
	  console.error('Email validation API error:', error);
	  throw error;
	}
  };

module.exports = {
	// gets all trips from the database and then passes the trips to the next middleware function
	index: async (req, res, next) => {
		try {
		  let match = {};
	  
		  if (req.query.tripStatus) {
			match.tripStatus = req.query.tripStatus;
		  }
	  
		  if (req.query.tripCode) {
			match.tripCode = req.query.tripCode;
		  }
	
		  if (req.query.payment === "success") {
			req.session.successMessage = "Payment successful!";
		}
	  
		  const trips = await Trip.find(match)
			.sort({ tripDate: "desc" })
			.populate("tripUser")
			.exec();
	  
		  // Retrieve the page and limit from the query parameters
		  const page = req.query.page || 1;
		  const limit = req.query.limit || 6;
	  
		  // Perform pagination logic on your data source
		  // Example: Fetch items from a database
		  const items = trips;
		  const itemCount = items.length;
		  const pageCount = Math.ceil(itemCount / limit);
	  
		  // Calculate the offset for slicing the items array
		  const offset = limit * (page - 1);
	  
		  // Slice the items array to get the items for the current page
		  const paginatedItems = items.slice(offset, offset + limit);
	  
		  // Retrieve the flash message from the session and delete it
		  const successMessage = req.session.successMessage;
		  delete req.session.successMessage;
	
	  
		  res.render("trips/index", {
			trips: paginatedItems,
			searchOptions: req.query.tripStatus,
			currentPage: page,
			pageCount: pageCount,
			pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
			limit: limit,
			successMessage: successMessage, // Pass the successMessage variable to the view
		  });
		} catch (error) {
		  console.log(`Error fetching trips: ${error.message}`);
		  next(error);
		}
	  },
	  
	  
	  // renders the trips/index view
	  indexView: (req, res) => {
			res.render("trips/index");
	  },
	
	  admin: (req, res, next) => {
		Trip.find()
		  .populate("tripUser")     
		  .then((trips) => {
			res.locals.trips = trips;
			next();
		  })
		  .catch((error) => {
			console.log(`Error fetching users: ${error.message}`);
			next(error);
		  });
	  },
	  // renders the trips/admin view
	  adminView: async (req, res, next) => {
		try {
		  let match = {};
		  if (req.query.tripStatus) {
			match.tripStatus = req.query.tripStatus;
		  }
	  
		  const trips = await Trip.find(match).sort({ tripDate: "desc" }).populate("tripUser").exec();
	
			  // Retrieve the page and limit from the query parameters
			const page = req.query.page || 1;
			const limit = req.query.limit || 6;
	
			// Perform pagination logic on your data source
			// Example: Fetch items from a database
			const items = trips;
			const itemCount = items.length;
			const pageCount = Math.ceil(itemCount / limit);
	
			// Calculate the offset for slicing the items array
			const offset = limit * (page - 1);
	
			// Slice the items array to get the items for the current page
			const paginatedItems = items.slice(offset, offset + limit);
		  // Get the number of refunds for all trips where refundStatus is pending
		  const refunds = await Refund.find({ refundStatus: "Pending" });
		  const refundCount = refunds.length;
	  
		  res.render("trips/admin", {
			trips: paginatedItems,
			searchOptions: req.query.tripStatus,
			currentPage: page,
			pageCount: pageCount,
			pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
			limit: limit,
			refundCount: refundCount,
	
		  });
		} catch (error) {
		  console.log(`Error fetching trips: ${error.message}`);
		  next(error);
		}
	  },
	  
	  // renders the trips/new view
	  new: (req, res) => {
		if (req.user) {
		  res.render("trips/new", { autofill: process.env.MPASS, askEmailPhone: false });
		} else {
		  res.render("trips/new", { autofill: process.env.MPASS, askEmailPhone: true });
		}
	  },
	   showVerifyEditForm: (req, res, next) => {
	  const { id } = req.params;
	  
	  if (req.user && req.user.isAdmin) {
		// User is an admin, render the edit form directly
		Trip.findById(id)
		  .then((trip) => {
			if (!trip) {
			  req.flash('error', 'Trip not found.');
			  return res.redirect('/');
			}
			res.render('trips/edit', { trip, req });
		  })
		  .catch((error) => {
			console.error(`Error fetching trip for editing: ${error}`);
			req.flash('error', 'An error occurred while fetching the trip for editing.');
			res.redirect('/');
		  });
	  } else {
		// User is not an admin, render the verification form
		res.render('trips/verify-edit', { id });
	  }
	},
	  verifyEdit: (req, res, next) => {
		if (req.user && req.user.isAdmin) {
		  // Admins can edit trips without verification
		  next();
		} else {
		const { id } = req.params;
		const { code } = req.body;
	  
		Trip.findById(id)
		  .then((trip) => {
			if (trip.tripCode === code) {
			  // Verification successful, proceed with editing
			  next();
			} else {
			  // Incorrect verification code
			  req.flash('error', 'Incorrect verification code for editing.');
			  res.redirect(`/trips/${id}/verify-edit`);
			}
		  })
		  .catch((error) => {
			console.error(`Error verifying trip for edit: ${error}`);
			res.redirect('/');
		  });
		}
	  },
	  showVerifyCancelForm: (req, res) => {
		const { id } = req.params;
		if (req.user && req.user.isAdmin) {
		  // Admins can delete trips without verification
		  Trip.findById(id)
			.populate("tripUser")
			.then((trip) => {
			  trip.tripStatus = "Cancelled";
			  sendEmail(trip.tripUserEmail, 'Reservation Denied', 'cancellation', trip);
			  trip.save();
			  res.redirect('/trips/admin');
			})
			.catch((error) => {
			  console.log(`Error fetching trip by ID: ${error.message}`);
			  next(error);
			});
			  
		
			} else {
		  res.render('trips/verify-cancel', { id });
		}
	  
	  },
	  
	  verifyCancel: (req, res, next) => {
		const { id } = req.params;
		const { code } = req.body;
		Trip.findById(id)
		  .then((trip) => {
			if (trip.tripStatus !== "In-Progress") {
			  if (trip.tripCode === code) {
				// Verification successful, proceed with deletion
				sendEmail(trip.tripUserEmail, 'Reservation Cancelled', 'cancel', trip);
				next();
			  } else {
				// Incorrect verification code
				req.flash('error', 'Incorrect verification code for cancellation.');
				res.redirect(`/trips/${id}/verify-cancel`);
			  }
			} else {
			  req.flash('error', 'You cannot cancel a trip that is in progress.');
			  res.redirect(`/trips/${id}/verify-cancel`);
			}
		  })
		  .catch((error) => {
			req.flash('error', 'Error occurred while verifying cancellation.');
			res.redirect(`/trips/${id}/verify-cancel`);
		  });
	  },
	  
	
	// Search for a trip by trip code
	search: (req, res) => {
	  const { tripCode } = req.query;
	
	  Trip.findOne({ tripCode })
		.populate('tripUser')
		.then((trip) => {
		  if (trip) {
			// Trip found, render the trip details page
			res.render('trips/show', { trip });
		  } else {
			// Trip not found, display an error message
			req.flash('error', 'Trip not found.');
			res.redirect('/');
		  }
		})
		.catch((error) => {
		  console.error(`Error searching for trip: ${error}`);
		  req.flash('error', 'An error occurred while searching for the trip.');
		  res.redirect('/');
		});
	},
	
	
	// Inside your route handler
	create: async (req, res, next) => {
	  if (req.skip) {
		// If skipping, proceed to the next middleware
		next();
		return;
	  }
	
	  let tripParams = getTripParams(req.body);
	
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
		try {
		  const emailValidationResult = await validateEmail(tripParams.tripUserEmail);
	
		  if (emailValidationResult.score > 70) {
			// Email is valid, proceed with phone number validation
			// Validate the phone number using libphonenumber-js
			const phoneNumber = String(tripParams.tripUserPhone);
			const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code
	
			if (phoneNumberObj && phoneNumberObj.isValid()) {
			  try {
				const travelTime = await calculateTravelTime(tripParams.pickUpAddress, tripParams.dropOffAddress);
				// Add the travelTime field to tripParams
				tripParams.travelTime = travelTime.rows[0].elements[0].duration.text;
				const verificationCodeLength = 10;
				tripParams.tripCode = shortid.generate().substring(0, verificationCodeLength);
	
				Trip.create(tripParams)
				  .then((trip) => {
					res.locals.redirect = '/trips/' + trip._id;
					res.locals.trip = trip;
	
					// Set the trip date to the correct date (time zone issue)
					let modifiedDate = new Date(trip.tripDate);
					modifiedDate.setHours(modifiedDate.getHours() + 4);
					trip.tripDate = modifiedDate;
					trip.save();
	
					req.flash('success', 'Trip successfully created!');
					sendEmail(tripParams.tripUserEmail, 'Reservation Created', 'reservation', trip,"", req);
					next();
				  })
				  .catch((error) => {
					console.log(`Error saving trip: ${error.message}`);
					res.locals.redirect = '/trips/new';
					req.flash('error', `Failed to create trip because: ${error.message}.`);
					next();
				  });
	
			  } catch (error) {
				console.log(`Error calculating travel time: ${error.message}`);
				res.locals.redirect = '/trips/new';
				req.flash('error', 'Failed to calculate travel time.');
				next();
			  }
			} else {
			  // Phone number is invalid
			  res.locals.redirect = '/trips/new';
			  req.flash('error', 'Invalid phone number.');
			  next();
			}
		  } else {
			// Email is invalid
			res.locals.redirect = '/trips/new';
			req.flash('error', 'Invalid email address.');
			next();
		  }
		} catch (error) {
		  console.error(`Error validating email address: ${error}`);
		  res.locals.redirect = '/trips/new';
		  req.flash('error', 'An error occurred while validating your email address.');
		  next();
		}
	},
	
	  // redirects to the proper show view
	  redirectView: (req, res, next) => {
		let redirectPath = res.locals.redirect;
		if (redirectPath) res.redirect(redirectPath);
		else next();
	  },
	
	  // gets the trip by ID and then passes the trip to the next middleware function
	  show: (req, res, next) => {
		let tripId = req.params.id;
		Trip.findById(tripId)
		.populate("tripUser")
		  .then((trip) => {
			res.locals.trip = trip;
			next();
		})
		  .catch((error) => {
			console.log(`Error fetching trip by ID: ${error.message}`);
			next(error);
		  });
	  },
	
	  // renders the trips/show view
	  showView: (req, res) => {
		res.render('trips/show');
	  },
	  // gets the trip by ID and then renders the trips/edit view with the user data
	  // Edit controller action
	  edit: (req, res, next) => {
		const tripId = req.params.id;
	  
		Trip.findById(tripId)
		  .populate("tripUser")
		  .then((trip) => {
			if (trip.tripStatus === "Pending") {
			  if (req.user) {
				res.render("trips/edit", {
				  trip: trip,
				  autofill: process.env.MPASS,
				  req: req,
				  askEmailPhone: false,
				});
			  } else {
				res.render("trips/edit", {
				  trip: trip,
				  autofill: process.env.MPASS,
				  req: req,
				  askEmailPhone: true,
				});
			  }
			} else {
			  req.flash('error', 'You cannot edit a trip that has already been .' + trip.tripStatus);
			  res.redirect(`/trips/${tripId}`);
			}
		  })
		  .catch((error) => {
			console.log(`Error fetching trip by ID: ${error.message}`);
			next(error);
		  });
	  },
	  
	  update: async (req, res, next) => {
		if (req.skip) return next();
		let tripId = req.params.id,
		  tripParams = getTripParams(req.body);
	  
		if (req.user && req.user.isAdmin) {
		  tripParams.tripStatus = 'Confirmed';
	  
		  try {
			const updatedTrip = await Trip.findByIdAndUpdate(tripId, {
			  $set: tripParams,
			}).populate("tripUser");
			
			res.locals.redirect = "/trips/admin";
			res.locals.trip = updatedTrip;
			req.flash("success", "Trip successfully approved!");
	  
			try {
			  const trip = await Trip.findById(tripId).populate("tripUser");
			  sendEmail(trip.tripUserEmail, "Reservation Approved!", "approval", trip, "", req);
			} catch (error) {
			  console.log(`Error fetching trip by ID: ${error.message}`);
			  next(error);
			}
	  
			next();
		  } catch (error) {
			console.log(`Error updating trip by ID: ${error.message}`);
			res.locals.redirect = `/trips/${tripId}/verify-edit`;
			req.flash("error", `Failed to update trip because: ${error.message}.`);
			next();
		  }
		} else {
		  travelel = await calculateTravelTime(tripParams.pickUpAddress, tripParams.dropOffAddress);
		  tripParams.travelTime = travelel.rows[0].elements[0].duration.text;
		  const emailValidationResult = await validateEmail(tripParams.tripUserEmail);
		
		  if (emailValidationResult.score > 90) {
			// Validate the phone number using libphonenumber-js
			const phoneNumber = tripParams.tripUserPhone;
			const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code
		
			if (phoneNumberObj && phoneNumberObj.isValid()) {
			  try {
				const updatedTrip = await Trip.findByIdAndUpdate(tripId, {
				  $set: tripParams,
				}).populate("tripUser");
			
				res.locals.redirect = `/trips/${tripId}`;
				res.locals.trip = updatedTrip;
				req.flash("success", "Trip successfully updated!");
				next();
			  } catch (error) {
				console.log(`Error updating trip by ID: ${error.message}`);
				res.locals.redirect = `/trips/${tripId}`;
				req.flash("error", `Failed to update trip because: ${error.message}.`);
				next();
			  }
			  try {
			  Trip.findById(tripId)
				.populate("tripUser")
				.then((trip) => {
				  sendEmail(trip.tripUserEmail, "Reservation Updated", "update", trip, "", req);
				})
			  } catch (error) {
				console.log(`Error fetching trip by ID: ${error.message}`);
				next(error);
			  }
			} else {
			  // Phone number is invalid
			  res.locals.redirect = `/trips/${tripId}/verify-edit`;
			  req.flash('error', 'Invalid phone number.');
			  next();
			}
		  } else {
			// Email is invalid
			res.locals.redirect = `/trips/${tripId}/verify-edit`;
			req.flash('error', 'Invalid email address.');
			next();
		  }
		}
	  },    
	  
	  // deletes the trip by ID and then redirects to the trips index view
	  delete: (req, res, next) => {
		let tripId = req.params.id;
	
		Trip.findById(tripId)
		.populate("tripUser")
		.then((trip)=> {
		//   trip.tripStatus = 'Cancelled';
		//   trip.save();
		//   if (trip.tripUser === undefined) {
		//     sendEmail(trip.tripUserEmail, 'Trip Deleted!', 'cancellation', trip);
		//   } else {
		//     if (trip.tripUser.isAdmin) {
		//     sendEmail(trip.tripUser.email, 'Trip Deleted!', 'denial', trip);
		//     } else if(trip.tripUser.isAdmin == false && trip.tripUser) {
		//       sendEmail(trip.tripUser.email, 'Trip Deleted!', 'cancellation', trip);
		//     }
		//   }
		  if(trip.paid && trip.tripStatus === 'Confirmed') { // if trip is paid and confirmed, create a refund
			Refund.create({
				trip: tripId,
				refundAmount: trip.price,
				refundReason: "Trip Cancelled By User",
				refundStatus: 'Pending'
			})
			.then((refund) => {
				trip.tripStatus = 'Cancelled';
				trip.save();
				sendEmail(trip.tripUserEmail, 'Refund Requested', 'refund', refund.trip, "", req, refund);
			})
			.catch((error) => {
				console.log(`Error creating refund: ${error.message}`);
			});
		  }
			  res.locals.redirect = "/";
			req.flash("success", "Trip successfully cancelled!");
			next();
		})
		.catch((error) => {
			console.log(`Error fetching trip by ID: ${error.message}`);
			next(error);
			});
	  },
	  displayCancelForm: async (req, res, next) => {
		if (req.user && req.user.isAdmin) {
		try {
		  const tripId = req.params.id;
		  const trip = await Trip.findById(tripId);
		  res.render("trips/cancel", { trip });
		} catch (error) {
		  console.log(`Error displaying cancellation form: ${error.message}`);
		  req.flash("error", "Failed to display cancellation form.");
		  res.redirect("/trips");
		}
	  } else {
		res.render("trips/verify-cancel", { id: req.params.id });
	  }    
	  },
	  processCancelForm: async (req, res, next) => {
		try {
		  
		  const tripId = req.params.id;
		  const { cancellationReason } = req.body;
	
		  Trip.findById(tripId) 
		  .populate("tripUser")
		  .then((trip)=> {
			sendEmail(trip.tripUserEmail, 'Reservation Denied', 'cancellation', trip, cancellationReason);
		  })
		  .catch((error) => {
			console.log(`Error fetching trip by ID: ${error.message}`);
			next(error);
			});
	
	  
		  // Delete the trip or perform any additional actions based on the cancellation reason  
		  req.flash("success", "Trip successfully cancelled.");
		  res.redirect("/trips/admin?tripStatus=Pending");
		} catch (error) {
		  console.log(`Error cancelling trip: ${error.message}`);
		  req.flash("error", "Failed to cancel the trip.");
		  res.redirect("/trips/admin?tripStatus=Pending");
		}
	  },
	  // validates the trip input for the trip create form
	  validate: (req, res, next) => {
	  req.check("tripDate", "Trip date cannot be empty").notEmpty();      
		req.check("pickUpAddress", "Pick up address cannot be empty").notEmpty();
		req.check("dropOffAddress", "Drop off address cannot be empty").notEmpty();
	  req.check("num_of_passengers", "Number of passengers cannot be empty").notEmpty();
	  req.check("pickUpTime", "Pick up time cannot be empty").notEmpty();
	  // check if the address is valid
	  if (req.body.tripUserEmail){
		req.check("tripUserEmail", "Email is not valid").isEmail();
	  }
	  if (req.body.tripUserPhone){
		req.check("tripUserPhone", "Phone number is not valid").isMobilePhone();
	  }
	  
		req.getValidationResult().then((error) => {
		  if (!error.isEmpty()) {
			let messages = error.array().map((e) => e.msg);
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
	  validateUpdate: (req, res, next) => {
		if (!req.user || !req.user.isAdmin) {
		  req.check("tripDate", "Trip date cannot be empty").notEmpty();      
		req.check("pickUpAddress", "Pick up address cannot be empty").notEmpty();
		req.check("dropOffAddress", "Drop off address cannot be empty").notEmpty();
	  req.check("num_of_passengers", "Number of passengers cannot be empty").notEmpty();
	  req.check("pickUpTime", "Pick up time cannot be empty").notEmpty();
		req.getValidationResult().then((error) => {
			if (!error.isEmpty()) {
				let messages = error.array().map((e) => e.msg);
				req.skip = true;
				req.flash("error", messages.join(" and "));
				res.locals.redirect = `/trips/${req.params.id}/edit`;
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
	  logout: (req, res, next) => {
		req.logout(function (err) {
		  if (err) {
			return next(err);
		  }
		  req.flash("success", "You have been logged out!");
		  res.locals.redirect = "/";
		  next();
		});
	  },
	
	  completeTrip: async (req, res, next) => {
		try {
		  const tripId = req.params.id;
		  await Trip.findByIdAndUpdate(tripId, { tripStatus: 'Completed' });
		  const trip = await Trip.findById(tripId);
		  await sendEmail(trip.tripUserEmail, 'Reservation Completed', 'complete', trip);
		  req.flash("success", 'Trip status updated successfully');
		  res.redirect('/trips/admin'); // Redirect to the admin view after completing the trip
		} catch (err) {
		  console.log('Error updating trip status:', err);
		  res.sendStatus(500);
		}
	  },  
	
	  updateTripStatusToInProgress: async (req, res, next) => {
		try {
		  const tripId = req.params.id;
	
		  // Find the trip by ID and update the status to "In-Progress"
		  const trip = await Trip.findByIdAndUpdate(
			tripId,
			{ $set: { tripStatus: 'In-Progress' } },
			{ new: true }
		  );
	
		  if (!trip) {
			req.flash('error', 'Trip not found.');
			return res.redirect(`/trips/${tripId}`);
		  }
	
		  req.flash('success', 'Trip status updated to In-Progress.');
		  res.redirect(`/trips/${tripId}`);
		} catch (error) {
		  console.log('Error updating trip status:', error);
		  req.flash('error', 'Failed to update trip status.');
		  res.redirect(`/trips/${tripId}`);
		}
	  },
	};



