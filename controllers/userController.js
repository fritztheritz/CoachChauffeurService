const User = require("../models/user");
const Trip = require("../models/trip");
const passport = require("passport");
const { sendEmail, sendContact, sendReset } = require("../public/js/sendmail");
const paginate = require('express-paginate');
const { validate } = require('deep-email-validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const uuid = require("uuid");
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
// gets user parameters from the request body
const getUserParams = (body) => {
	return {
	  firstName: body.firstName,
	  lastName: body.lastName,
	  email: body.email,
	  password: body.password,
	  confirmPassword: body.confirmPassword,
	  phoneNumber: body.phoneNumber,
	  oldPassword: body.oldPassword,
	};
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
  // gets all users from the database and then passes the users to the next middleware function
  index: (req, res, next) => {
    User.find()
      .then((users) => {
        res.locals.users = users;
        next();
      })
      .catch((error) => {
        console.log(`Error fetching users: ${error.message}`);
        next(error);
      });
  },
  // renders the users/index view
  indexView: (req, res) => {
	if(req.user && req.user.isAdmin) {
		// Retrieve the page and limit from the query parameters
		const page = req.query.page || 1;
		const limit = req.query.limit || 6;

		// Perform pagination logic on your data source
		// Example: Fetch items from a database
		const items = res.locals.users;
		const itemCount = items.length;
		const pageCount = Math.ceil(itemCount / limit);

		// Calculate the offset for slicing the items array
		const offset = limit * (page - 1);

		// Slice the items array to get the items for the current page
		const paginatedItems = items.slice(offset, offset + limit);

    	res.render("users/index", {
        users: paginatedItems,
		currentPage: page,
		pageCount: pageCount,
		pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
		limit: limit,

      });
	}
	else {
		req.flash('error', 'You must be an admin to view this page!');
		res.redirect('/');
	}
  },
  // renders the users/index view
  dashboardView: (req, res) => {
	if(req.user && req.user.isAdmin) {
    	res.render("users/dashboard");
	}
	else {
		req.flash('error', 'You must be an admin to view this page!');
		res.redirect('/');
	}
  },
  // renders the users/new view
  new: (req, res) => {
	const { firstName, lastName, email, phoneNumber } = req.query;
    res.render("users/new", { firstName, lastName, email, phoneNumber });
  },
  create: async (req, res, next) => {
	if (req.skip) return next();
	let userParams = getUserParams(req.body);
	// console.log(userParams.email);
  
	try {
	  // Validate the email using the deep-email-validator package
	  const emailValidationResult = await validateEmail(userParams.email);
	//   console.log(emailValidationResult);
  
	  if (emailValidationResult.score > 70) {
		// Validate the phone number using libphonenumber-js
		const phoneNumber = userParams.phoneNumber;
		const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code
  
		if (phoneNumberObj && phoneNumberObj.isValid()) {
		  let newUser = new User(userParams);
		  User.register(newUser, req.body.password, (error, user) => {
			if (user) {
			  req.login(user, (err) => {
				if (err) return next(err);
				res.locals.redirect = "/";
				res.locals.user = user;
				req.flash("success", "User successfully created and logged in!");
				sendEmail(user.email, "Welcome To Coach Chauffeur!", 'signup', null, "",req, null, user);
				// find all trips that have been created using the user's email
				Trip.find({tripUserEmail: user.email})
				.then((trips) => {
					// make the trip user id equal to the user's id
					trips.forEach((trip) => {
						trip.tripUser = user._id;
						trip.save();
					});
				})
				.catch((error) => {
					console.log(`Error fetching trips: ${error.message}`);
					next(error);
				});
				next();
			  });
			} else {
			  console.log(`Error saving user: ${error.message}`);
			  res.locals.redirect = "/users/new";
			  req.flash("error", `Failed to create user because: ${error.message}.`);
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
	} catch (error) {
	  console.error(`Error validating email address: ${error}`);
	  res.locals.redirect = "/users/new";
	  req.flash("error", "An error occurred while validating your email address.");
	  next();
	}
  },
  

  // redirects to the proper show view
  redirectView: (req, res, next) => {
    let redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);
    else next();
  },
  // gets the user by ID and then passes the user to the next middleware function
  show: (req, res, next) => {
	let userId = req.params.id;
	User.findById(userId)
	  .then((user) => {
		res.locals.user = user;
		// Find all trips that the user has created based on the tripStatus query parameter
		let tripStatus = req.query.tripStatus || 'Pending';
		Trip.find({ tripUser: userId, tripStatus })
		  .then((trips) => {
			res.locals.trips = trips;
			next(); // Call next() here
		  })
		  .catch((error) => {
			console.log(`Error fetching trips by user ID: ${error.message}`);
			next(error);
		  });
	  })
	  .catch((error) => {
		console.log(`Error fetching user by ID: ${error.message}`);
		next(error);
	  });
  },
  
  // renders the users/show view
  showView: (req, res) => {
	if (req.user && req.user._id == req.params.id) {
	  let userId = req.params.id;
	  let tripStatus = req.query.tripStatus;
  
	  let query = { tripUser: userId };
  
	  if (tripStatus && tripStatus !== "All") {
		query.tripStatus = tripStatus;
	  }
	  Trip.find(query)
		.then((trips) => {
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
		  	res.render("users/show", { 
				user: req.user, 
				searchOptions: req.query.tripStatus,
				trips: paginatedItems,
				pageCount,
				currentPage: page,
				pages: paginate.getArrayPages(req)(Number.MAX_SAFE_INTEGER, pageCount, page),
				limit, });
		})
		.catch((error) => {
		  console.log(`Error fetching trips for user ID: ${userId}, Error: ${error}`);
		  req.flash("error", "An error occurred while fetching the trips.");
		  res.redirect(`/users/${userId}`);
		});
	} else {
	  req.flash("error", "You are not authorized to view this page.");
	  res.redirect("/");
	}
  },
  
  // gets the user by ID and then renders the users/edit view with the user data
  edit: (req, res, next) => {
    let userId = req.params.id;
	// it's an account that needs to get all information filled out
	if(res.locals.flashMessages && res.locals.flashMessages.info) {
		res.locals.hasAllInfo = false;
	}
    if (req.user && req.user._id == req.params.id) {
    User.findById(userId)
      .then((user) => {
        res.render("users/edit", {
          user: user,
		  hasAllInfo: res.locals.hasAllInfo,
        });
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        req.flash("error", `Failed to edit user because: ${error.message}.`);
        next();
      });
    }
  },
  update: async (req, res, next) => {
	if (req.skip) {
	  return next();
	} else {
	  let userId = req.params.id,
		userParams = getUserParams(req.body);
  
	  // if the user did not enter a new password, do not update the password
	  if (!userParams.password) {
		delete userParams.password;
	  }
	  // if the user did enter a new password, hash it and update the password
	  else {
		try {
		  const user = await User.findById(userId);
		  user.setPassword(userParams.password, () => {
			user.save();
		  });
		} catch (error) {
		  console.log(`Error saving user password: ${error.message}`);
		  next();
		}
	  }
  
	  try {
		// console.log(userParams.email);
		const emailValidationResult = await validateEmail(userParams.email);
		// console.log(emailValidationResult);
		if (emailValidationResult.score > 70) {
		  // Validate the phone number using libphonenumber-js
		//   const phoneNumber = userParams.phoneNumber;
		  const phoneNumber = String(userParams.phoneNumber);
		//   console.log(userParams.phoneNumber)
		  const phoneNumberObj = parsePhoneNumberFromString(phoneNumber, 'US'); // Replace 'US' with the appropriate country code
		//   console.log(phoneNumberObj)

  
		  if (phoneNumberObj && phoneNumberObj.isValid()) {
			try {
			  const user = await User.findByIdAndUpdate(userId, {
				$set: userParams,
			  });
			  res.locals.redirect = `/users/${userId}`;
			  res.locals.user = user;
			  res.locals.hasAllInfo = true;
			  req.flash("success", "User successfully updated!");
			//   console.log("checkmark 2")
			  next();
			} catch (error) {
			  console.log(`Error updating user by ID: ${error.message}`);
			  res.locals.redirect = `/users/${userId}/edit`;
			  req.flash("error", `Failed to update user because: ${error.message}.`);
			  next();
			}
		  } else {
			// Phone number is invalid
			res.locals.redirect = `/users/${userId}/edit`;
			req.flash('error', 'Invalid phone number.');
			next();
		  }
		} else {
		  console.log('Invalid email');
		  res.locals.redirect = `/users/${userId}/edit`;
		  req.flash("error", "Invalid email.");
		  next();
		}
	  } catch (error) {
		console.error(`Error validating email address: ${error}`);
		res.locals.redirect = `/users/${userId}/edit`;
		req.flash('error', 'An error occurred while validating your email address.');
		next();
	  }
	}
  },
  
  // deletes the user by ID and then redirects to the users index view
  delete: (req, res, next) => {
	if (req.skip) {
		return next();
	} else {
		let userId = req.params.id;
		if (req.user && req.user._id == req.params.id) {
		User.findByIdAndRemove(userId)
		.then(() => {
			res.locals.redirect = "/";
			req.flash("success", "User successfully deleted!");
			next();
			if(res.locals.googleUser){
				res.locals.googleUser = false;
				module.exports.redirectView(req, res, next);
			}
		})
		.catch((error) => {
			console.log(`Error deleting user by ID: ${error.message}`);
			req.flash("error", `Failed to delete user because: ${error.message}.`);
			next();
		});
		}
		
	}
  },
  // displays the users/login view
  login: (req, res) => {
    res.render("users/login");
  },
  // authenticates the user, logs them in, and redirects to the home page
	authenticate: (req, res, next) => {
		passport.authenticate("local", (err, user, info) => {
			if (err) return next(err);
			if (!user) {
				req.flash("error", "Failed to login. Please try again.");
				return res.redirect("/users/login");
			}
			req.logIn(user, (err) => {
				if (err) return next(err);
				req.flash("success", "You have been successfully logged in!");
				// find all trips that have been created using the user's email
				Trip.find({tripUserEmail: user.email})
				.then((trips) => {
					// make the trip user id equal to the user's id
					trips.forEach((trip) => {
						trip.tripUser = user._id;
						trip.save();
					});
				})
				.catch((error) => {
					console.log(`Error fetching trips: ${error.message}`);
					next(error);
				});
				return res.redirect("/");
			});
		})(req, res, next);
	},
  // validates the user input for the user create form
  validate: (req, res, next) => {
    req.sanitizeBody("email").trim();
	req.check("firstName", "First name cannot be empty").notEmpty();
	req.check("lastName", "Last name cannot be empty").notEmpty();
    req.check("email", "Email is invalid").isEmail();
	req.check("phoneNumber", "Phone number cannot be empty").notEmpty();
    req.check("password", "Password cannot be empty").notEmpty();
	
    req.getValidationResult().then((error) => {

      if (!error.isEmpty()) {
        let messages = error.array().map((e) => e.msg);
		if (req.body.password !== req.body.confirmPassword) {
			messages.push("Passwords do not match");
		}
        req.skip = true;
        req.flash("error", messages.join(" and "));
        res.locals.redirect = "/users/new";
        next();
      } else {
		if(req.body.password !== req.body.confirmPassword) {
			req.skip = true;
			req.flash("error", "Passwords do not match");
			res.locals.redirect = "/users/new";
		}
        next();
      }
    });
  },
  // validates the user input for the user update form
  validateUpdate: (req, res, next) => {
    req.sanitizeBody("email").trim();
    req.check("firstName", "First name cannot be empty").notEmpty();
    req.check("lastName", "Last name cannot be empty").notEmpty();
    req.check("email", "Email is invalid").isEmail();
    req.check("phoneNumber", "Phone number cannot be empty").notEmpty();
    req.getValidationResult().then((error) => {
        if (!error.isEmpty()) {
            let messages = error.array().map((e) => e.msg);
			if(res.locals.hasAllInfo && req.user.googleId == null){
				if (req.body.oldPassword && !req.body.password) {
					messages.push("Old password provided but no new password");
				}
				else if (req.body.password && !req.body.oldPassword) {
					messages.push("New password provided but no old password");
				}
				else {
					// Compare old password to password in database
					req.user.changePassword(req.body.oldPassword, req.body.password, (err) => {
						if (err) {
							messages.push("Old password is incorrect");
						}
					});
				}
			}
            
            req.skip = true;
            req.flash("error", messages.join(" and "));
            res.locals.redirect = `/users/${req.params.id}/edit`;
            res.locals.hasAllInfo = false;
            next();
        } else {
			if(res.locals.hasAllInfo && req.user.googleId == null){
				if (req.body.oldPassword && !req.body.password) {
					req.skip = true;
					req.flash("error", "Old password provided but no new password");
					res.locals.redirect = `/users/${req.params.id}/edit`;
				} else if (req.body.password && !req.body.oldPassword) {
					req.skip = true;
					req.flash("error", "New password provided but no old password");
					res.locals.redirect = `/users/${req.params.id}/edit`;
				} else {
					// Compare old password to password in database
					const userId = req.params.id; 
					req.user.changePassword(req.body.oldPassword, req.body.password, (err) => {
						if (err) {
							req.skip = true;
							req.flash("error", "Old password is incorrect");
							res.locals.redirect = `/users/${userId}/edit`;
						}
					});
				}
			}
			next();
        }
    });
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

  displayVerifyDelete: (req, res, next) => {
	User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        // Handle case when user is not found
        return next(new Error('User not found'));
      }

      if (user.googleId && user.googleToken) {
        // Google user
		res.locals.googleUser = true;
        module.exports.delete(req, res, next);
      } else {
        // Regular user
		res.render("users/delete", {
			user: user,
		});
      }
    })
    .catch((error) => {
      console.log(`Error fetching user by ID: ${error.message}`);
      req.flash("error", `Failed to delete user because: ${error.message}.`);
      next(error);
    });
  },
  
verifyDelete: (req, res, next) => {
	// Compare passwords
	if (req.body.password && req.body.password2 && req.body.password == req.body.password2) {
		// Change password allows the password to be compared to the one in the database
		req.user.changePassword(req.body.password, req.body.password2, (err) => {
			// Passwords didn't match	
			if (err) {
				req.skip = true;
				req.flash("error", "Incorrect password");
				res.locals.redirect = `/users/${req.params.id}/delete`;
			}
			next();
		});
	} else if (req.body.password && req.body.password2 && req.body.password != req.body.password2){
		req.skip = true;
		req.flash("error", "Passwords do not match");
		res.locals.redirect = `/users/${req.params.id}/delete`;
		next();
	} else if (req.body.password && !req.body.password2){
		req.skip = true;
		req.flash("error", "Confirm password is empty");
		res.locals.redirect = `/users/${req.params.id}/delete`;
		next();
	} else if (!req.body.password && req.body.password2){
		req.skip = true;
		req.flash("error", "Password is empty");
		res.locals.redirect = `/users/${req.params.id}/delete`;
		next();
	} else {
		next();
	}
},
displayForgotPassword: (req, res, next) => {
	res.render("users/forgotPassword");
},

sendResetToken: (req, res, next) => {
	const email = req.body.email;
	User.findOne({email: email})
	.then(user => {
		if (!user) {
			req.skip = true;
			req.flash("error", "User not found");
			res.locals.redirect = "/users/forgot-password";
			next();
		} else {
			// Generate token
			user.resetToken = uuid.v4();
	  		user.resetPasswordExpires = Date.now() + 3600000; // 1 hour (3600000 milliseconds)
			let resetLink = "http://" + req.headers.host + "/users/reset-password/" + user.resetToken;
			user.save()
			.then(user => {
				// Send email
				sendReset(user.email, 'Reset Password', 'reset', resetLink);
				req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
				res.locals.redirect = "/users/login";
				next();
			})
			.catch(error => {
				console.log(`Error saving user: ${error.message}`);
				req.flash("error", `Failed to save user account because: ${error.message}.`);
				next(error);
			}
			);
		}
	})
	.catch(error => {
		console.log(`Error finding user: ${error.message}`);
		req.flash("error", `Failed to find user account because: ${error.message}.`);
		next(error);
	}
	);
},

displayResetPassword: (req, res, next) => {
	const { token } = req.params;
  
  	User.findOne({ resetToken: token, resetPasswordExpires: { $gt: Date.now() } })
    .then(user => {
      if (!user) {
        req.flash("error", "The password reset link has expired or is invalid.");
        return res.redirect("/users/forgot-password");
      }
	  res.render("users/resetPassword", {token: req.params.token});
    })
    .catch(error => {
      console.log(`Error finding user: ${error.message}`);
      req.flash("error", `Failed to find user account because: ${error.message}.`);
      return res.redirect("/users/forgot-password");
    });
	
},

resetPassword: (req, res, next) => {
	if (req.body.password && !req.body.confirmPassword){
		req.skip = true;
		req.flash("error", "Confirm password is empty");
		res.locals.redirect = `/users/reset-password/${req.params.token}`;
		next();
	} else if (!req.body.password && req.body.confirmPassword){
		req.skip = true;
		req.flash("error", "Password is empty");
		res.locals.redirect = `/users/reset-password/${req.params.token}`;
		next();
	} else if (req.body.password && req.body.confirmPassword && req.body.password != req.body.confirmPassword){
		req.skip = true;
		req.flash("error", "Passwords do not match");
		res.locals.redirect = `/users/reset-password/${req.params.token}`;
		next();
	} else {
		User.findOne({resetToken: req.params.token})
		.then(user => {
			user.setPassword(req.body.password, () => {
				user.save();
			});
			user.resetToken = undefined;
			user.resetPasswordExpires = undefined;	
			user.save()
			.then(user => {
				req.flash("success", "Password has been reset");
				res.locals.redirect = "/users/login";
				next();
			}
			)
			.catch(error => {
				console.log(`Error saving user: ${error.message}`);
				req.flash("error", `Failed to save user account because: ${error.message}.`);
				next(error);
			}
			);
		})
		.catch(error => {
			console.log(`Error finding user: ${error.message}`);
			req.flash("error", `Failed to find user account because: ${error.message}.`);
			next(error);
		}
		);
	}
},

};
