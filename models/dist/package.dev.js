"use strict";

var mongoose = require("mongoose");

var packageSchema = mongoose.Schema({
  packageDate: {
    type: Date,
    required: true
  },
  // date
  packageUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  // user id
  packageUserEmail: {
    type: String,
    required: true
  },
  // user email
  packageUserPhone: {
    type: String,
    required: true
  },
  // user phone
  packageUserName: {
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
  price: {
    type: Number,
    required: false
  },
  // price
  specialInstructions: {
    type: String,
    required: false
  },
  // special instructions
  packageStatus: {
    type: String,
    "default": "Pending"
  },
  // package approved status
  paid: {
    type: Boolean,
    "default": false
  },
  // package paid status
  tripCode: {
    type: String,
    required: true
  },
  // package code
  paymentId: {
    type: String,
    required: false
  } // payment id

}, {
  timestamps: true
});
module.exports = mongoose.model("Package", packageSchema);