const mongoose = require("mongoose");

const cardSchema = mongoose.Schema(
	{
		sourceId: { type: String, required: true },
		locationId: { type: String, required: true },
		idempotencyKey: { type: String, required: true },
		customerId: { type: String, required: true },
		verificationToken: { type: String },
	}
);

module.exports = mongoose.model("Card", cardSchema);