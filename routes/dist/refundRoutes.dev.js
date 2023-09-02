"use strict";

var router = require('express').Router();

var refundController = require('../controllers/refundController');

router.get('/', refundController.index, refundController.indexView);