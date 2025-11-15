// backend/controllers/trainController.js (WITH WEBSOCKET)

const DataService = require('../services/DataService');
const StationEventService = require('../services/StationEventService');
const db = require('../config/db');

let trainState = null;
let wsManager = null;

// Initialize wsManager after server starts
setTimeout(() => {
  wsManager = require('../config/websocket');
}, 1000);

class TrainController {
  /**
   * Initialize train with data from TWO MongoDB databases
   */
  async reloadTrainAfterAdd() {
    const trainNo = trainState.trainNo;
    const journeyDate = trainState.journeyDate;
    trainState = await DataService.loadTrainData(trainNo, journeyDate);
    trainState.updateStats();
    if (wsManager) {
      wsManager.broadcastStatsUpdate(trainState.stats);
    }
  }
  
  async initializeTrain(req, res) {
    try {
      const { trainNo, journeyDate, trainName } = req.body;

      // Use global config if available
      const config = global.RAC_CONFIG || {};
      
      const train = trainNo || config.trainNo;
      const date = journeyDate || config.journeyDate;
      const name = trainName || config.trainName || await DataService.getTrainName(train);

      if (!train || !date) {
        return res.status(400).json({
          success: false,
          message: 'Missing train number or journey date.'
        });
      }

      console.log(`\n🚂 Initializing train ${train} for date ${date}...`);

      trainState = await DataService.loadTrainData(train, date, name);

      const responseData = {
        trainNo: trainState.trainNo,
        trainName: trainState.trainName,
        journeyDate: trainState.journeyDate,
        totalStations: trainState.stations.length,
        totalPassengers: trainState.stats.totalPassengers,
        cnfPassengers: trainState.stats.cnfPassengers,
        racPassengers: trainState.stats.racPassengers,
        currentStation: trainState.getCurrentStation().name,
        currentStationIdx: trainState.currentStationIdx,
        journeyStarted: trainState.journeyStarted
      };

      // Broadcast train initialization
      if (wsManager) {
        wsManager.broadcastTrainUpdate('TRAIN_INITIALIZED', responseData);
      }

      res.json({
        success: true,
        message: "Train initialized successfully",
        data: responseData
      });

    } catch (error) {
      console.error("❌ Error initializing train:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Start journey
   */
  startJourney(req, res) {
    try {
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      if (trainState.journeyStarted) {
        return res.status(400).json({
          success: false,
          message: "Journey already started"
        });
      }

      trainState.startJourney();

      const responseData = {
        journeyStarted: true,
        currentStation: trainState.getCurrentStation().name,
        currentStationIdx: trainState.currentStationIdx
      };

      // Broadcast journey started
      if (wsManager) {
        wsManager.broadcastTrainUpdate('JOURNEY_STARTED', responseData);
      }

      res.json({
        success: true,
        message: "Journey started",
        data: responseData
      });

    } catch (error) {
      console.error("❌ Error starting journey:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get complete train state
   */
  getTrainState(req, res) {
    try {
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      res.json({
        success: true,
        data: {
          trainNo: trainState.trainNo,
          trainName: trainState.trainName,
          journeyDate: trainState.journeyDate,
          currentStationIdx: trainState.currentStationIdx,
          journeyStarted: trainState.journeyStarted,
          stations: trainState.stations,
          coaches: trainState.coaches.map(coach => ({
            coachNo: coach.coachNo,
            class: coach.class,
            capacity: coach.capacity,
            berths: coach.berths.map(berth => ({
              berthNo: berth.berthNo,
              fullBerthNo: berth.fullBerthNo,
              type: berth.type,
              status: berth.status,
              passengers: berth.passengers,
              segmentOccupancy: berth.segmentOccupancy
            }))
          })),
          racQueue: trainState.racQueue,
          stats: trainState.stats
        }
      });

    } catch (error) {
      console.error("❌ Error getting train state:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Move to next station
   */
  moveToNextStation(req, res) {
    try {
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      if (!trainState.journeyStarted) {
        return res.status(400).json({
          success: false,
          message: "Journey not started"
        });
      }

      if (trainState.isJourneyComplete()) {
        const finalData = {
          finalStation: trainState.stations[trainState.stations.length - 1].name,
          totalPassengers: trainState.stats.totalPassengers,
          finalOnboard: trainState.stats.currentOnboard,
          totalDeboarded: trainState.stats.totalDeboarded,
          totalNoShows: trainState.stats.totalNoShows,
          totalRACUpgraded: trainState.stats.totalRACUpgraded
        };

        // Broadcast journey complete
        if (wsManager) {
          wsManager.broadcastTrainUpdate('JOURNEY_COMPLETE', finalData);
        }

        return res.json({
          success: false,
          message: "Train has reached final destination",
          data: finalData
        });
      }

      const result = StationEventService.processStationArrival(trainState);
      trainState.currentStationIdx++;

      // Broadcast station arrival with all details
      if (wsManager) {
        wsManager.broadcastStationArrival({
          station: result.station,
          stationCode: result.stationCode,
          stationIdx: result.stationIdx,
          deboarded: result.deboarded,
          noShows: result.noShows,
          racAllocated: result.racAllocated,
          boarded: result.boarded,
          vacancies: result.vacancies,
          stats: result.stats,
          nextStation: trainState.getCurrentStation()?.name
        });

        // Broadcast updated statistics
        wsManager.broadcastStatsUpdate(trainState.stats);
      }

      res.json({
        success: true,
        message: `Processed station: ${result.station}`,
        data: result
      });

    } catch (error) {
      console.error("❌ Error moving to next station:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset train to initial state
   */
  async resetTrain(req, res) {
    try {
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const trainNo = trainState.trainNo;
      const journeyDate = trainState.journeyDate;

      console.log(`\n🔄 Resetting train ${trainNo}...`);

      trainState = await DataService.loadTrainData(trainNo, journeyDate);

      const responseData = {
        trainNo: trainState.trainNo,
        currentStation: trainState.getCurrentStation().name,
        journeyStarted: trainState.journeyStarted,
        stats: trainState.stats
      };

      // Broadcast train reset
      if (wsManager) {
        wsManager.broadcastTrainUpdate('TRAIN_RESET', responseData);
      }

      res.json({
        success: true,
        message: "Train reset to initial state",
        data: responseData
      });

    } catch (error) {
      console.error("❌ Error resetting train:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get train statistics
   */
  getTrainStats(req, res) {
    try {
      if (!trainState) {
        return res.status(400).json({
          success: false,
          message: "Train not initialized"
        });
      }

      const currentStation = trainState.getCurrentStation();

      res.json({
        success: true,
        data: {
          stats: trainState.stats,
          currentStation: {
            name: currentStation.name,
            code: currentStation.code,
            idx: trainState.currentStationIdx
          },
          progress: {
            current: trainState.currentStationIdx + 1,
            total: trainState.stations.length,
            percentage: ((trainState.currentStationIdx + 1) / trainState.stations.length * 100).toFixed(1)
          }
        }
      });

    } catch (error) {
      console.error("❌ Error getting stats:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all trains
   */
  async list(req, res) {
    try {
      const col = db.getTrainDetailsCollection();
      const docs = await col.find({}).project({ Train_No: 1, Train_Name: 1, Sleeper_Coaches_Count: 1, Three_TierAC_Coaches_Count: 1 }).sort({ Train_No: 1 }).toArray();
      const items = docs.map(d => ({
        trainNo: d.Train_No,
        trainName: d.Train_Name,
        sleeperCount: d.Sleeper_Coaches_Count,
        threeAcCount: d.Three_TierAC_Coaches_Count
      }));
      res.json({ success: true, data: items });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get global train state (for other controllers)
   */
  getGlobalTrainState() {
    return trainState;
  }
}

module.exports = new TrainController();