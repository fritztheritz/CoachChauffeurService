"use strict";

var mongoose = require("mongoose");

var tripSchema = mongoose.Schema({
  tripDate: {
    type: Date,
    required: true
  },
  // date
  tripUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  // user id
  tripUserEmail: {
    type: String,
    required: true
  },
  // user email
  tripUserPhone: {
    type: String,
    required: true
  },
  // user phone
  tripUserName: {
    type: String,
    required: true
  },
  // user name
  pickUpAddress: {
    type: String,
    required: true
  },
  // pick up address
  dropOffAddress: {
    type: String,
    required: true
  },
  // drop off address
  pickUpTime: {
    type: String,
    required: true
  },
  // pick up time (changed from Time)
  travelTime: {
    type: String,
    required: false
  },
  // travel time (changed required to false)
  price: {
    type: Number,
    required: false
  },
  // price
  num_of_passengers: {
    type: Number,
    required: true
  },
  // number of passengers
  specialInstructions: {
    type: String,
    required: false
  },
  // special instructions
  tripStatus: {
    type: String,
    "default": "Pending"
  },
  // trip approved status
  paid: {
    type: Boolean,
    "default": false
  },
  // trip paid status
  tripCode: {
    type: String,
    required: true
  },
  // trip code
  paymentId: {
    type: String,
    required: false
  },
  // payment id
  idempotencyKey: {
    type: String,
    required: false
  },
  // idempotency key
  refunded: {
    type: Boolean,
    "default": false
  },
  // trip refunded status
  tripType: {
    type: String,
    required: false
  },
  // trip type (was true)
  carType: {
    type: String,
    "default": "4-Passenger"
  },
  // car type
  priceUpdated: {
    type: Boolean,
    "default": false
  } // price updated status

}, {
  timestamps: true
});
module.exports = mongoose.model("Trip", tripSchema);