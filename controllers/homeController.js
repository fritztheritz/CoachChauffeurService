const { sendContact } = require("../public/js/sendmail");
  
exports.index = (req, res) => {
  res.render("index");
}

exports.about = (req, res) => {
  res.render("about");
}

exports.contact = (req, res) => {
  res.render("contact");
}

exports.sendEmail = (req, res) => {
  console.log(req.body);
  const { firstName, lastName, bookingNumber, reason, email } = req.body;

  sendContact('noreplycoachchauffeur@gmail.com', 'Contact Form Submission', 'contact', firstName, lastName, bookingNumber, reason, email);
  sendContact(email, 'Contact Form Submission', 'contact', firstName, lastName, bookingNumber, reason, email)
  req.flash("success", "Your message has been sent!");
  res.redirect("/contact");
}



