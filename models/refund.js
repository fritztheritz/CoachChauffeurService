const mongoose = require("mongoose");
const refundSchema = mongoose.Schema(
	{
	  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" }, // trip id
	  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // user id
	  refundAmount: { type: Number, required: true }, // refund amount
	  refundReason: { type: String, required: true }, // refund reason
	  refundStatus: { type: String, default: "Pending" }, // refund status (either Pending, Approved, or Rejected)
	  refundNotes: { type: String }, // refund notes
	},
	{
	  timestamps: true,
	}
  );
  

module.exports = mongoose.model("Refund", refundSchema);
