const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
	{
		sourceId: { type: String, required: true },
		locationId: { type: String, required: true },
		idempotencyKey: { type: String, required: true },
		verificationToken: { type: String },
		customerId: { type: String },
		amount: { type: Number },
	}
);

module.exports = mongoose.model("Payment", paymentSchema);