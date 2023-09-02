"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var nodemailer = require('nodemailer');

var handlebars = require('handlebars');

var fs = require('fs');

var path = require('path');

require('dotenv').config();

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'noreplycoachchauffeur@gmail.com',
    // google username
    pass: process.env.apass // google app pass

  }
});

function sendContact(to, subject, template, firstName, lastName, bookingNumber, reason, email) {
  var content;

  switch (template) {
    case 'contact':
      var filePath = path.join(__dirname, 'html', 'contact.handlebars');
      var source = fs.readFileSync(filePath, 'utf-8').toString();
      var reservationTemplate = handlebars.compile(source);
      var replacements = {
        First: firstName,
        Last: lastName,
        Book: bookingNumber,
        Email: email,
        Reason: reason
      };
      var htmlToSend = reservationTemplate(replacements);
      content = htmlToSend;
      break;
  }

  var mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to: to,
    subject: subject,
    html: content,
    contentType: 'text/html'
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

function sendEmail(to, subject, template, trip, cancellationReason, req, refunded, user) {
  var content;

  switch (template) {
    case 'signup':
      var filePath10 = path.join(__dirname, 'html', 'signup.handlebars');
      var source10 = fs.readFileSync(filePath10, 'utf-8').toString();
      var signUpTemplate = handlebars.compile(source10);
      var replacements10 = {
        Name: user.fullName,
        First: user.firstName,
        Last: user.lastName,
        Email: user.email,
        Phone: user.phoneNumber
      };
      var sign_up = signUpTemplate(replacements10);
      content = sign_up;
      break;

    case 'reservation':
      var filePath = path.join(__dirname, 'html', 'reservation.handlebars');
      var source = fs.readFileSync(filePath, 'utf-8').toString();
      var reservationTemplate = handlebars.compile(source);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli2 = _slicedToArray(_trip$pickUpTime$spli, 2),
          hours = _trip$pickUpTime$spli2[0],
          minutes = _trip$pickUpTime$spli2[1];

      var period = "AM";

      if (hours >= 12) {
        period = "PM";

        if (hours > 12) {
          hours -= 12;
        }
      }

      var time = "".concat(hours, ":").concat(minutes.toString().padStart(2, "0"), " ").concat(period);
      var replacements = {
        Name: trip.tripUserName,
        BookingNumber: trip.tripCode,
        PickUpAddress: trip.pickUpAddress,
        DropOffAddress: trip.dropOffAddress,
        PickUpDate: modifiedDate.toLocaleString('en-US', options),
        PickUpTime: time,
        TravelTime: trip.travelTime,
        NumberOfPassengers: trip.num_of_passengers,
        Link: "http://" + req.headers.host + "/trips/" + trip._id + "/verify-edit"
      };
      var htmlToSend = reservationTemplate(replacements);
      content = htmlToSend;
      break;

    case 'approval':
      var filePath1 = path.join(__dirname, 'html', 'approve.handlebars');
      var source1 = fs.readFileSync(filePath1, 'utf-8').toString();
      var approvalTemplate = handlebars.compile(source1);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli3 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli4 = _slicedToArray(_trip$pickUpTime$spli3, 2),
          hours2 = _trip$pickUpTime$spli4[0],
          minutes2 = _trip$pickUpTime$spli4[1];

      var period2 = "AM";

      if (hours2 >= 12) {
        period2 = "PM";

        if (hours2 > 12) {
          hours2 -= 12;
        }
      }

      var time2 = "".concat(hours2, ":").concat(minutes2.toString().padStart(2, "0"), " ").concat(period2);
      var replacements1 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time2,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions,
        Link: "http://" + req.headers.host + "/trips/" + trip._id + "/payment"
      };
      var approve = approvalTemplate(replacements1);
      content = approve;
      break;

    case 'cancellation':
      if (cancellationReason == null) cancellationReason = 'Cancelled By User.';
      var filePath2 = path.join(__dirname, 'html', 'cancellation.handlebars');
      var source2 = fs.readFileSync(filePath2, 'utf-8').toString();
      var cancellationTemplate = handlebars.compile(source2);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli5 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli6 = _slicedToArray(_trip$pickUpTime$spli5, 2),
          hours3 = _trip$pickUpTime$spli6[0],
          minutes3 = _trip$pickUpTime$spli6[1];

      var period3 = "AM";

      if (hours3 >= 12) {
        period3 = "PM";

        if (hours3 > 12) {
          hours3 -= 12;
        }
      }

      var time3 = "".concat(hours3, ":").concat(minutes3.toString().padStart(2, "0"), " ").concat(period3);
      var replacements2 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time3,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions,
        Cancel: cancellationReason
      };
      var cancellation = cancellationTemplate(replacements2);
      content = cancellation;
      break;

    case 'cancel':
      var filePath3 = path.join(__dirname, 'html', 'cancel.handlebars');
      var source3 = fs.readFileSync(filePath3, 'utf-8').toString();
      var cancelTemplate = handlebars.compile(source3);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli7 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli8 = _slicedToArray(_trip$pickUpTime$spli7, 2),
          hours4 = _trip$pickUpTime$spli8[0],
          minutes4 = _trip$pickUpTime$spli8[1];

      var period4 = "AM";

      if (hours4 >= 12) {
        period4 = "PM";

        if (hours4 > 12) {
          hours4 -= 12;
        }
      }

      var time4 = "".concat(hours4, ":").concat(minutes4.toString().padStart(2, "0"), " ").concat(period4);
      var replacements3 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time4,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions
      };
      var cancel = cancelTemplate(replacements3);
      content = cancel;
      break;

    case 'payment':
      var filePath4 = path.join(__dirname, 'html', 'payment.handlebars');
      var source4 = fs.readFileSync(filePath4, 'utf-8').toString();
      var paymentTemplate = handlebars.compile(source4);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli9 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli10 = _slicedToArray(_trip$pickUpTime$spli9, 2),
          hours5 = _trip$pickUpTime$spli10[0],
          minutes5 = _trip$pickUpTime$spli10[1];

      var period5 = "AM";

      if (hours5 >= 12) {
        period5 = "PM";

        if (hours5 > 12) {
          hours5 -= 12;
        }
      }

      var time5 = "".concat(hours5, ":").concat(minutes5.toString().padStart(2, "0"), " ").concat(period5);
      var replacements4 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time5,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions
      };
      var payment = paymentTemplate(replacements4);
      content = payment;
      break;

    case 'update':
      var filePath5 = path.join(__dirname, 'html', 'update.handlebars');
      var source5 = fs.readFileSync(filePath5, 'utf-8').toString();
      var updateTemplate = handlebars.compile(source5);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli11 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli12 = _slicedToArray(_trip$pickUpTime$spli11, 2),
          hours6 = _trip$pickUpTime$spli12[0],
          minutes6 = _trip$pickUpTime$spli12[1];

      var period6 = "AM";

      if (hours6 >= 12) {
        period6 = "PM";

        if (hours6 > 12) {
          hours6 -= 12;
        }
      }

      var time6 = "".concat(hours6, ":").concat(minutes6.toString().padStart(2, "0"), " ").concat(period6);
      var replacements5 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time6,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions
      };
      var update = updateTemplate(replacements5);
      content = update;
      break;

    case 'complete':
      var filePath6 = path.join(__dirname, 'html', 'complete.handlebars');
      var source6 = fs.readFileSync(filePath6, 'utf-8').toString();
      var completeTemplate = handlebars.compile(source6);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli13 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli14 = _slicedToArray(_trip$pickUpTime$spli13, 2),
          hours7 = _trip$pickUpTime$spli14[0],
          minutes7 = _trip$pickUpTime$spli14[1];

      var period7 = "AM";

      if (hours7 >= 12) {
        period7 = "PM";

        if (hours7 > 12) {
          hours7 -= 12;
        }
      }

      var time7 = "".concat(hours7, ":").concat(minutes7.toString().padStart(2, "0"), " ").concat(period7);
      var replacements6 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time7,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions
      };
      var complete = completeTemplate(replacements6);
      content = complete;
      break;

    case 'refund':
      var filePath7 = path.join(__dirname, 'html', 'refund.handlebars');
      var source7 = fs.readFileSync(filePath7, 'utf-8').toString();
      var refundTemplate = handlebars.compile(source7);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      console.log(trip);
      console.log(trip.pickUpTime);

      var _trip$pickUpTime$spli15 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli16 = _slicedToArray(_trip$pickUpTime$spli15, 2),
          hours8 = _trip$pickUpTime$spli16[0],
          minutes8 = _trip$pickUpTime$spli16[1];

      var period8 = "AM";

      if (hours8 >= 12) {
        period8 = "PM";

        if (hours8 > 12) {
          hours8 -= 12;
        }
      }

      var time8 = "".concat(hours8, ":").concat(minutes8.toString().padStart(2, "0"), " ").concat(period8);
      var replacements7 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time8,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions,
        Amount: refunded.refundAmount,
        Reason: refunded.refundReason
      };
      var refund = refundTemplate(replacements7);
      content = refund;
      break;

    case 'refund-approved':
      var filePath8 = path.join(__dirname, 'html', 'refundapproved.handlebars');
      var source8 = fs.readFileSync(filePath8, 'utf-8').toString();
      var refund_approvedTemplate = handlebars.compile(source8);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli17 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli18 = _slicedToArray(_trip$pickUpTime$spli17, 2),
          hours9 = _trip$pickUpTime$spli18[0],
          minutes9 = _trip$pickUpTime$spli18[1];

      var period9 = "AM";

      if (hours9 >= 12) {
        period9 = "PM";

        if (hours9 > 12) {
          hours9 -= 12;
        }
      }

      var time9 = "".concat(hours9, ":").concat(minutes9.toString().padStart(2, "0"), " ").concat(period9);
      var replacements8 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time9,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions,
        Amount: refunded.refundAmount,
        Reason: refunded.refundReason
      };
      var refund_approved = refund_approvedTemplate(replacements8);
      content = refund_approved;
      break;

    case 'refund-denied':
      var filePath9 = path.join(__dirname, 'html', 'refunddenied.handlebars');
      var source9 = fs.readFileSync(filePath9, 'utf-8').toString();
      var refund_deniedTemplate = handlebars.compile(source9);
      var modifiedDate = new Date(trip.tripDate);
      modifiedDate.setHours(modifiedDate.getHours() + 4);
      var options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };

      var _trip$pickUpTime$spli19 = trip.pickUpTime.split(":").map(Number),
          _trip$pickUpTime$spli20 = _slicedToArray(_trip$pickUpTime$spli19, 2),
          hours10 = _trip$pickUpTime$spli20[0],
          minutes10 = _trip$pickUpTime$spli20[1];

      var period10 = "AM";

      if (hours10 >= 12) {
        period10 = "PM";

        if (hours10 > 12) {
          hours10 -= 12;
        }
      }

      var time10 = "".concat(hours10, ":").concat(minutes10.toString().padStart(2, "0"), " ").concat(period10);
      var replacements9 = {
        Name: trip.tripUserName,
        Book: trip.tripCode,
        Pick: trip.pickUpAddress,
        Drop: trip.dropOffAddress,
        Date: modifiedDate.toLocaleString('en-US', options),
        Time: time10,
        Travel: trip.travelTime,
        Pass: trip.num_of_passengers,
        Price: trip.price,
        Special: trip.specialInstructions,
        Amount: refunded.refundAmount,
        Reason: refunded.refundReason
      };
      var refund_denied = refund_deniedTemplate(replacements9);
      content = refund_denied;
      break;
  }

  ;
  var mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to: to,
    subject: subject,
    html: content,
    contentType: 'text/html'
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

function sendReset(to, subject, template, link) {
  var content;

  switch (template) {
    case 'reset':
      content = 'You have requested to reset your password. Please use the following link to reset your password: \n' + link + '\nThis link will expire in 1 hour.' + '\nIf you did not request to reset your password, please ignore this email.';
      break;
  }

  var mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to: to,
    subject: subject,
    text: content
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

module.exports.sendEmail = sendEmail;
module.exports.sendContact = sendContact;
module.exports.sendReset = sendReset;