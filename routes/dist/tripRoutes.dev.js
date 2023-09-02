"use strict";

var router = require('express').Router();

var tripController = require('../controllers/tripController');

var paymentController = require('../controllers/paymentController');

var refundController = require('../controllers/refundController');

router.get('/', tripController.index, tripController.indexView);
router.get('/admin', tripController.admin, tripController.adminView);
router.get('/new', tripController["new"]);
router.post('/create', tripController.validate, tripController.create, tripController.redirectView);
router.get('/refund-requests', refundController.index, refundController.indexView);
router.get('/:id/verify-edit', tripController.showVerifyEditForm);
router.put('/:id/update', tripController.validateUpdate, tripController.update, tripController.redirectView);
router.post('/:id/verify-edit', tripController.verifyEdit, tripController.edit);
router.put('/trips/:id/edit', function (req, res) {
  var tripId = req.params.id;
  var isAdmin = req.user && req.user.isAdmin;
  var updatedFields = isAdmin ? {
    price: req.body.price
  } : req.body;
  Trip.findByIdAndUpdate(tripId, updatedFields, {
    "new": true
  }).then(function (updatedTrip) {
    res.redirect("/trips/".concat(updatedTrip._id));
  })["catch"](function (error) {
    console.log("Error updating trip: ".concat(error.message));
    res.redirect("/trips/".concat(tripId));
  });
});
router.get('/:id/verify-cancel', tripController.showVerifyCancelForm);
router.post('/:id/verify-cancel', tripController.verifyCancel, tripController["delete"], tripController.redirectView);
router.get("/:id/cancel", tripController.displayCancelForm);
router.post("/:id/cancel", tripController.processCancelForm);
router.post('/:id/complete', tripController.completeTrip);
router.get('/search', tripController.search);
router.get('/:id', tripController.show, tripController.showView);
router["delete"]('/:id/delete', tripController["delete"]);
router.get('/:id/payment', paymentController.index);
router.post('/:id/payment', paymentController.processPayment);
router.get('/:id/payment/completePayment', paymentController.captureDelayedPayment);
router.get('/:id/payment/updatePayment', paymentController.getUpdateForm);
router.post('/:id/payment/updatePayment', paymentController.updatePayment);
router.get('/:id/refund', refundController["new"]);
router.post('/:id/refund', refundController.create, refundController.redirectView);
router.get('/:id/refund/:refundId', refundController.show, refundController.showView);
router.get('/:id/refund/:refundId/edit', refundController.edit);
router.put('/:id/refund/:refundId/update', refundController.update, refundController.redirectView);
router.post('/refunds/:id/deny', refundController.denyRefund);
router.post('/refunds/:id/approve', refundController.approveRefund);
router["delete"]('/:id/refund/:refundId/delete', refundController["delete"], refundController.redirectView);
router.post('/:id/in-progress', tripController.updateTripStatusToInProgress);
module.exports = router;