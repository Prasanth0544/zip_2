// backend/routes/api.js (WITH MIDDLEWARE)

const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trainController');
const reallocationController = require('../controllers/reallocationController');
const passengerController = require('../controllers/passengerController');
const visualizationController = require('../controllers/visualizationController');
const configController = require('../controllers/configController');
const validationMiddleware = require('../middleware/validation');

// ========== TRAIN ROUTES ==========
router.get('/trains', (req, res) => trainController.list(req, res));
// Dynamic configuration setup (from frontend)
router.post('/config/setup',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateDynamicConfig,
  (req, res) => configController.setup(req, res)
);

router.post('/train/initialize', 
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateTrainInit,
  (req, res) => trainController.initializeTrain(req, res)
);

router.post('/train/start-journey',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.startJourney(req, res)
);

router.get('/train/state',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getTrainState(req, res)
);

router.post('/train/next-station',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.checkJourneyStarted,
  (req, res) => trainController.moveToNextStation(req, res)
);

router.post('/train/reset',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.resetTrain(req, res)
);

router.get('/train/stats',
  validationMiddleware.checkTrainInitialized,
  (req, res) => trainController.getTrainStats(req, res)
);

// ========== REALLOCATION ROUTES ==========
router.post('/passenger/no-show',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validatePNR,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.markPassengerNoShow(req, res)
);

router.get('/train/rac-queue',
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.getRACQueue(req, res)
);

router.get('/train/vacant-berths',
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.getVacantBerths(req, res)
);

router.get('/passenger/search/:pnr',
  validationMiddleware.validatePNR,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.searchPassenger(req, res)
);

router.get('/reallocation/eligibility',
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.getEligibilityMatrix(req, res)
);

router.post('/reallocation/apply',
  validationMiddleware.sanitizeBody,
  validationMiddleware.validateReallocation,
  validationMiddleware.checkTrainInitialized,
  (req, res) => reallocationController.applyReallocation(req, res)
);

// ========== PASSENGER ROUTES ==========
router.get('/passengers/all',
  validationMiddleware.checkTrainInitialized,
  validationMiddleware.validatePagination,
  (req, res) => passengerController.getAllPassengers(req, res)
);

router.get('/passengers/status/:status',
  validationMiddleware.checkTrainInitialized,
  (req, res) => passengerController.getPassengersByStatus(req, res)
);

router.get('/passengers/counts',
  validationMiddleware.checkTrainInitialized,
  (req, res) => passengerController.getPassengerCounts(req, res)
);

// ========== VISUALIZATION ROUTES ==========
router.get('/visualization/station-schedule',
  (req, res) => visualizationController.getStationSchedule(req, res)
);

router.get('/visualization/segment-matrix',
  validationMiddleware.checkTrainInitialized,
  (req, res) => visualizationController.getSegmentMatrix(req, res)
);

router.get('/visualization/graph',
  validationMiddleware.checkTrainInitialized,
  (req, res) => visualizationController.getGraphData(req, res)
);

router.get('/visualization/heatmap',
  validationMiddleware.checkTrainInitialized,
  (req, res) => visualizationController.getHeatmap(req, res)
);

router.get('/visualization/berth-timeline/:coach/:berth',
  validationMiddleware.checkTrainInitialized,
  (req, res) => visualizationController.getBerthTimeline(req, res)
);

router.post('/passengers/add', validationMiddleware.validatePassengerAdd, validationMiddleware.checkTrainInitialized, 
  (req, res) => passengerController.addPassenger(req, res)
);

router.get('/visualization/vacancy-matrix',
  validationMiddleware.checkTrainInitialized,
  (req, res) => visualizationController.getVacancyMatrix(req, res)
);

module.exports = router;