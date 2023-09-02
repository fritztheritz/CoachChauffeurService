const mongoose = require("mongoose");
const express = require('express');
const methodOverride = require("method-override");
const layouts = require('express-ejs-layouts');
const expressSession = require("express-session");
const expressValidator = require("express-validator");
const cookieParser = require("cookie-parser");
const connectFlash = require("connect-flash");
const passport = require("passport");
const User = require("./models/user");
const Trip = require("./models/trip");
const cors = require('cors');
const paginate = require('express-paginate');
const app = express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = require("./routes/index");
require("dotenv").config();

app.use(cors());

mongoose.connect(`mongodb+srv://${process.env.username}:${process.env.password}@wilson.esob13d.mongodb.net/coach_car?retryWrites=true&w=majority`, {
  useNewUrlParser: true, // Add useNewUrlParser option
  useUnifiedTopology: true, // Add useUnifiedTopology option
}); // need a new database
const db = mongoose.connection;
db.once("open", () => {
	console.log("Successfully connected to mongodb!");
});

app.use(express.json());
app.use(express.urlencoded());
app.set("view engine", "ejs");
app.use(layouts);
app.use(express.static('public'));
app.use(expressValidator());
app.use(
  methodOverride("_method", {
    methods: ["POST", "GET"],
  })
);
app.use(cookieParser("secret-pascode"));
app.use(
  expressSession({
    secret: "secret_passcode",
    cookie: {
      maxAge: 4000000,
    },
    resave: false,
    saveUninitialized: true, // changed from false to true
  })
);
app.use(connectFlash());
app.use(paginate.middleware(6));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.use(
	new GoogleStrategy(
	  {
		clientID: process.env.clientID,
		clientSecret: process.env.clientSecret,
		callbackURL: '/auth/google/callback',
		scope: ['profile', 'email'],
	  },
	  async (accessToken, refreshToken, profile, done) => {
		try {
		  // Check if the user with the email already exists in the database
		  let user = await User.findOne({ email: profile.emails[0].value });
  
		  if (user) {
			// User already exists, update the access token if necessary
			if (user.googleToken !== accessToken) {
				user.googleId = profile.id;
				user.googleToken = accessToken;
				await user.save();
			}

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
  
			return done(null, user);
		  } else {
			const phoneNumber = profile.phoneNumbers && profile.phoneNumbers.length > 0
            ? profile.phoneNumbers[0].value : '';
			// User does not exist, create a new user with Google information
			user = new User({
			  firstName: profile.name.givenName,
			  lastName: profile.name.familyName,
			  email: profile.emails[0].value, // Access the email directly from the profile object
			  phoneNumber: phoneNumber, // You can set this field as empty or handle it separately
			  isAdmin: false,
			  googleId: profile.id,
			  googleToken: accessToken,
			});

			Trip.find({tripUserEmail: user.email})
				.then((trips) => {
					console.log(trips);
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
  
			await user.save();
  
			return done(null, user);
		  }
		} catch (err) {
		  return done(err);
		}
	  }
	)
  );
  

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  res.locals.loggedIn = req.isAuthenticated();
  res.locals.currentUser = req.user;
  res.locals.hasAllInfo = req.user && req.user.firstName && req.user.lastName && req.user.email && req.user.phoneNumber;
  next();
});

app.set("port", process.env.PORT || 3000);
app.use("/", router);

app.listen(app.get("port"), () => {
	  console.log(`Express running → PORT ${app.get("port")}`);
});