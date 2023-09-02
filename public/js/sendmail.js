const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'noreplycoachchauffeur@gmail.com', // google username
    pass: process.env.apass, // google app pass
  },
});



function sendContact(to, subject, template, firstName, lastName, bookingNumber, reason, email) {
  let content;

  switch (template) {
    case 'contact':
    const filePath = path.join(__dirname, 'html', 'contact.handlebars');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const reservationTemplate = handlebars.compile(source);
    const replacements = {
    First: firstName,
    Last: lastName,
    Book: bookingNumber,
    Email: email,
    Reason: reason,
    
    };
    const htmlToSend = reservationTemplate(replacements);
    content = htmlToSend;        
    break;
  }

  const mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to,
    subject,
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
  let content;

  switch (template) {
    case 'signup':
      
    const filePath10 = path.join(__dirname, 'html', 'signup.handlebars');
    const source10 = fs.readFileSync(filePath10, 'utf-8').toString();
    const signUpTemplate = handlebars.compile(source10);
    const replacements10 = {
    Name: user.fullName,
    First: user.firstName,
    Last: user.lastName,
    Email: user.email,
    Phone: user.phoneNumber,
    };
    const sign_up = signUpTemplate(replacements10);
    content = sign_up;        
    break;



    case 'reservation':
      const filePath = path.join(__dirname, 'html', 'reservation.handlebars');
      const source = fs.readFileSync(filePath, 'utf-8').toString();
      const reservationTemplate = handlebars.compile(source);
	  var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours, minutes] = trip.pickUpTime.split(":").map(Number);
		let period = "AM";
		
		if (hours >= 12) {
			period = "PM";
			if (hours > 12) {
				hours -= 12;
			}
		}

		let time = `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
      const replacements = {
      Name: trip.tripUserName,
      Type: trip.tripType,
      BookingNumber: trip.tripCode,
      PickUpAddress: trip.pickUpAddress,
      DropOffAddress: trip.dropOffAddress,
      PickUpDate: modifiedDate.toLocaleString('en-US', options),
      PickUpTime: time,
      TravelTime: trip.travelTime,
      NumberOfPassengers: trip.num_of_passengers,
      Link: "http://" + req.headers.host + "/trips/" + trip._id + "/verify-edit",
      };
      const htmlToSend = reservationTemplate(replacements);
      content = htmlToSend;        
      break;

    case 'approval':
      const filePath1 = path.join(__dirname, 'html', 'approve.handlebars');
      const source1 = fs.readFileSync(filePath1, 'utf-8').toString();
      const approvalTemplate = handlebars.compile(source1);
	  var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours2, minutes2] = trip.pickUpTime.split(":").map(Number);
		let period2 = "AM";
		
		if (hours2 >= 12) {
			period2 = "PM";
			if (hours2 > 12) {
				hours2 -= 12;
			}
		}

		let time2 = `${hours2}:${minutes2.toString().padStart(2, "0")} ${period2}`;
		
      const replacements1 = {
      Name: trip.tripUserName,
      Book: trip.tripCode,
      Type: trip.tripType,
      Pick: trip.pickUpAddress,
      Drop: trip.dropOffAddress,
      Date: modifiedDate.toLocaleString('en-US', options),
      Time: time2,
      Travel: trip.travelTime,
      Pass: trip.num_of_passengers,
      Price: trip.price,
      Special: trip.specialInstructions,
      Link: "http://" + req.headers.host + "/trips/" + trip._id + "/payment",
      };
      const approve = approvalTemplate(replacements1);
      content = approve;        
      break;
  
    case 'cancellation':
      if (cancellationReason == null) cancellationReason = 'Cancelled By User.';

      const filePath2 = path.join(__dirname, 'html', 'cancellation.handlebars');
      const source2 = fs.readFileSync(filePath2, 'utf-8').toString();
      const cancellationTemplate = handlebars.compile(source2);
	  var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours3, minutes3] = trip.pickUpTime.split(":").map(Number);
		let period3 = "AM";
		
		if (hours3 >= 12) {
			period3 = "PM";
			if (hours3 > 12) {
				hours3 -= 12;
			}
		}

		let time3 = `${hours3}:${minutes3.toString().padStart(2, "0")} ${period3}`;
      const replacements2 = {
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
      Cancel: cancellationReason,
      };
      const cancellation = cancellationTemplate(replacements2);
      content = cancellation;        
      break;

    case 'cancel':
      const filePath3 = path.join(__dirname, 'html', 'cancel.handlebars');
      const source3 = fs.readFileSync(filePath3, 'utf-8').toString();
      const cancelTemplate = handlebars.compile(source3);
	  var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours4, minutes4] = trip.pickUpTime.split(":").map(Number);
		let period4 = "AM";
		
		if (hours4 >= 12) {
			period4 = "PM";
			if (hours4 > 12) {
				hours4 -= 12;
			}
		}

		let time4 = `${hours4}:${minutes4.toString().padStart(2, "0")} ${period4}`;
      const replacements3 = {
      Name: trip.tripUserName,
      Book: trip.tripCode,
      Pick: trip.pickUpAddress,
      Drop: trip.dropOffAddress,
      Date: modifiedDate.toLocaleString('en-US', options),
      Time: time4,
      Travel: trip.travelTime,
      Pass: trip.num_of_passengers,
      Price: trip.price,
      Special: trip.specialInstructions,
      };
      const cancel = cancelTemplate(replacements3);
      content = cancel;        
      break;
      
    case 'payment':
    const filePath4 = path.join(__dirname, 'html', 'payment.handlebars');
    const source4 = fs.readFileSync(filePath4, 'utf-8').toString();
    const paymentTemplate = handlebars.compile(source4);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours5, minutes5] = trip.pickUpTime.split(":").map(Number);
		let period5 = "AM";
		
		if (hours5 >= 12) {
			period5 = "PM";
			if (hours5 > 12) {
				hours5 -= 12;
			}
		}

		let time5 = `${hours5}:${minutes5.toString().padStart(2, "0")} ${period5}`;
    const replacements4 = {
    Name: trip.tripUserName,
    Book: trip.tripCode,
    Pick: trip.pickUpAddress,
    Drop: trip.dropOffAddress,
    Date: modifiedDate.toLocaleString('en-US', options),
    Time: time5,
    Travel: trip.travelTime,
    Pass: trip.num_of_passengers,
    Price: trip.price,
    Special: trip.specialInstructions,
    };
    const payment = paymentTemplate(replacements4);
    content = payment;        
    break;

    case 'update':
    const filePath5 = path.join(__dirname, 'html', 'update.handlebars');
    const source5 = fs.readFileSync(filePath5, 'utf-8').toString();
    const updateTemplate = handlebars.compile(source5);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours6, minutes6] = trip.pickUpTime.split(":").map(Number);
		let period6 = "AM";
		
		if (hours6 >= 12) {
			period6 = "PM";
			if (hours6 > 12) {
				hours6 -= 12;
			}
		}

		let time6 = `${hours6}:${minutes6.toString().padStart(2, "0")} ${period6}`;
    const replacements5 = {
    Name: trip.tripUserName,
    Book: trip.tripCode,
    Pick: trip.pickUpAddress,
    Drop: trip.dropOffAddress,
    Date: modifiedDate.toLocaleString('en-US', options),
    Time: time6,
    Travel: trip.travelTime,
    Pass: trip.num_of_passengers,
    Price: trip.price,
    Special: trip.specialInstructions,
    };
    const update = updateTemplate(replacements5);
    content = update;        
    break;


    case 'complete':
    const filePath6 = path.join(__dirname, 'html', 'complete.handlebars');
    const source6 = fs.readFileSync(filePath6, 'utf-8').toString();
    const completeTemplate = handlebars.compile(source6);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours7, minutes7] = trip.pickUpTime.split(":").map(Number);
		let period7 = "AM";

		if (hours7 >= 12) {
			period7 = "PM";
			if (hours7 > 12) {
				hours7 -= 12;
			}
		}

		let time7 = `${hours7}:${minutes7.toString().padStart(2, "0")} ${period7}`;
    const replacements6 = {
    Name: trip.tripUserName,
    Book: trip.tripCode,
    Pick: trip.pickUpAddress,
    Drop: trip.dropOffAddress,
    Date: modifiedDate.toLocaleString('en-US', options),
    Time: time7,
    Travel: trip.travelTime,
    Pass: trip.num_of_passengers,
    Price: trip.price,
    Special: trip.specialInstructions,
    };
    const complete = completeTemplate(replacements6);
    content = complete;        
    break;

	case 'refund':
	  const filePath7 = path.join(__dirname, 'html', 'refund.handlebars');
    const source7 = fs.readFileSync(filePath7, 'utf-8').toString();
    const refundTemplate = handlebars.compile(source7);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours8, minutes8] = trip.pickUpTime.split(":").map(Number);
		let period8 = "AM";
		
		if (hours8 >= 12) {
			period8 = "PM";
			if (hours8 > 12) {
				hours8 -= 12;
			}
		}

		let time8 = `${hours8}:${minutes8.toString().padStart(2, "0")} ${period8}`;
    const replacements7 = {
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
    Reason: refunded.refundReason,
    };
    const refund = refundTemplate(replacements7);
    content = refund;        
    break;


	case 'refund-approved':
	  const filePath8 = path.join(__dirname, 'html', 'refundapproved.handlebars');
    const source8 = fs.readFileSync(filePath8, 'utf-8').toString();
    const refund_approvedTemplate = handlebars.compile(source8);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours9, minutes9] = trip.pickUpTime.split(":").map(Number);
		let period9 = "AM";

		if (hours9 >= 12) {
			period9 = "PM";
			if (hours9 > 12) {
				hours9 -= 12;
			}
		}

		let time9 = `${hours9}:${minutes9.toString().padStart(2, "0")} ${period9}`;
    const replacements8 = {
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
    Reason: refunded.refundReason,
    };
    const refund_approved = refund_approvedTemplate(replacements8);
    content = refund_approved;        
    break;


	case 'refund-denied':
	  const filePath9 = path.join(__dirname, 'html', 'refunddenied.handlebars');
    const source9 = fs.readFileSync(filePath9, 'utf-8').toString();
    const refund_deniedTemplate = handlebars.compile(source9);
	var modifiedDate = new Date(trip.tripDate);
		modifiedDate.setHours(modifiedDate.getHours() + 4);
		var options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

		let [hours10, minutes10] = trip.pickUpTime.split(":").map(Number);
		let period10 = "AM";

		if (hours10 >= 12) {
			period10 = "PM";
			if (hours10 > 12) {
				hours10 -= 12;
			}
		}

		let time10 = `${hours10}:${minutes10.toString().padStart(2, "0")} ${period10}`;

    const replacements9 = {
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
    Reason: refunded.refundReason,
    };
    const refund_denied = refund_deniedTemplate(replacements9);
    content = refund_denied;        
    break;

  };



  const mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to,
    subject,
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

function sendReset(to, subject, template, link){
	let content;

  switch (template) {
    case 'reset':
      content =
        'You have requested to reset your password. Please use the following link to reset your password: \n' +
		link +
		'\nThis link will expire in 1 hour.' +
		'\nIf you did not request to reset your password, please ignore this email.';
      break;
  }

  const mailOptions = {
    from: 'no-reply@coachchauffeur.com',
    to,
    subject,
    text: content,
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
