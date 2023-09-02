const router = require('express').Router();
const tripController = require('../controllers/tripController');
const paymentController = require('../controllers/paymentController');
const refundController = require('../controllers/refundController');

router.get('/', tripController.index, tripController.indexView);
router.get('/admin', tripController.admin, tripController.adminView);

router.get('/new', tripController.new);
router.post('/create', tripController.validate, tripController.create, tripController.redirectView);
router.get('/refund-requests', refundController.index, refundController.indexView);

router.get('/:id/verify-edit', tripController.showVerifyEditForm);
router.put('/:id/update', tripController.validateUpdate, tripController.update, tripController.redirectView);

router.post('/:id/verify-edit', tripController.verifyEdit, tripController.edit);
router.put('/trips/:id/edit', (req, res) => {
    const tripId = req.params.id;
    const isAdmin = req.user && req.user.isAdmin;
    const updatedFields = isAdmin ? { price: req.body.price } : req.body;
  
    Trip.findByIdAndUpdate(tripId, updatedFields, { new: true })
      .then((updatedTrip) => {
        res.redirect(`/trips/${updatedTrip._id}`);
      })
      .catch((error) => {
        console.log(`Error updating trip: ${error.message}`);
        res.redirect(`/trips/${tripId}`);
      });
  });

router.get('/:id/verify-cancel', tripController.showVerifyCancelForm);
router.post('/:id/verify-cancel', tripController.verifyCancel, tripController.delete, tripController.redirectView);
router.get("/:id/cancel", tripController.displayCancelForm);
router.post("/:id/cancel", tripController.processCancelForm);
router.post('/:id/complete', tripController.completeTrip)

router.get('/search', tripController.search);
router.get('/:id', tripController.show, tripController.showView);
router.delete('/:id/delete', tripController.delete);

router.get('/:id/payment', paymentController.index);
router.post('/:id/payment', paymentController.processPayment);
router.get('/:id/payment/completePayment', paymentController.captureDelayedPayment);
router.get('/:id/payment/updatePayment', paymentController.getUpdateForm);
router.post('/:id/payment/updatePayment', paymentController.updatePayment);

router.get('/:id/refund', refundController.new);
router.post('/:id/refund', refundController.create, refundController.redirectView);
router.get('/:id/refund/:refundId', refundController.show, refundController.showView);
router.get('/:id/refund/:refundId/edit', refundController.edit);
router.put('/:id/refund/:refundId/update', refundController.update, refundController.redirectView);
router.post('/refunds/:id/deny', refundController.denyRefund);
router.post('/refunds/:id/approve', refundController.approveRefund);
router.delete('/:id/refund/:refundId/delete', refundController.delete, refundController.redirectView);
router.post('/:id/in-progress', tripController.updateTripStatusToInProgress);






module.exports = router;
