// frontend/src/pages/PassengersPage.jsx

import React, { useState, useEffect } from "react";
import {
  getAllPassengers,
  getPassengerCounts,
  searchPassenger,
  getRACQueue,
} from "../services/api";
import "./PassengersPage.css";

function PassengersPage({ trainData, onClose, onNavigate }) {
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchPNR, setSearchPNR] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showVacantBerths, setShowVacantBerths] = useState(false);
  const [vacantBerths, setVacantBerths] = useState([]);
  const [filteredVacantBerths, setFilteredVacantBerths] = useState([]);
  const [vacantFromStation, setVacantFromStation] = useState("");
  const [vacantToStation, setVacantToStation] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateVacantBerths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passengers, searchPNR, filterStatus, trainData]);

  useEffect(() => {
    filterVacantBerths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacantBerths, vacantFromStation, vacantToStation]);

  const calculateVacantBerths = () => {
    if (!trainData || !trainData.coaches || !trainData.journeyStarted) {
      setVacantBerths([]);
      return;
    }

    const currentIdx = trainData.currentStationIdx;
    const stations = trainData.stations;
    const vacant = [];

    trainData.coaches.forEach((coach) => {
      coach.berths.forEach((berth) => {
        // Check if berth is vacant at current station
        if (
          berth.segmentOccupancy &&
          berth.segmentOccupancy[currentIdx] === null
        ) {
          // Find the station where it becomes vacant (last occupied segment before current)
          let vacantFromIdx = currentIdx;
          for (let i = currentIdx - 1; i >= 0; i--) {
            if (berth.segmentOccupancy[i] !== null) {
              vacantFromIdx = i + 1;
              break;
            }
            if (i === 0) {
              vacantFromIdx = 0; // Vacant from start
            }
          }

          // Find the station where it will become occupied (next occupied segment)
          let vacantToIdx = berth.segmentOccupancy.length;
          for (let i = currentIdx + 1; i < berth.segmentOccupancy.length; i++) {
            if (berth.segmentOccupancy[i] !== null) {
              vacantToIdx = i;
              break;
            }
          }

          vacant.push({
            coach: coach.coachNo,
            berthNo: berth.berthNo,
            fullBerthNo: `${coach.coachNo}-${berth.berthNo}`,
            type: berth.type,
            class: coach.class,
            currentStation: stations[currentIdx]?.code || "N/A",
            vacantFromStation: stations[vacantFromIdx]?.code || "N/A",
            vacantToStation:
              vacantToIdx < stations.length
                ? stations[vacantToIdx]?.code
                : "END",
            vacantFromStationName: stations[vacantFromIdx]?.name || "N/A",
            vacantToStationName:
              vacantToIdx < stations.length
                ? stations[vacantToIdx]?.name
                : "Journey End",
          });
        }
      });
    });

    setVacantBerths(vacant);
  };

  const filterVacantBerths = () => {
    let filtered = [...vacantBerths];

    // Filter by "from" station
    if (vacantFromStation.trim()) {
      filtered = filtered.filter(
        (berth) =>
          berth.vacantFromStation
            .toLowerCase()
            .includes(vacantFromStation.toLowerCase()) ||
          berth.vacantFromStationName
            .toLowerCase()
            .includes(vacantFromStation.toLowerCase()),
      );
    }

    // Filter by "to" station
    if (vacantToStation.trim()) {
      filtered = filtered.filter(
        (berth) =>
          berth.vacantToStation
            .toLowerCase()
            .includes(vacantToStation.toLowerCase()) ||
          berth.vacantToStationName
            .toLowerCase()
            .includes(vacantToStation.toLowerCase()),
      );
    }

    setFilteredVacantBerths(filtered);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [passengersRes, countsRes, racRes] = await Promise.all([
        getAllPassengers(),
        getPassengerCounts(),
        getRACQueue(),
      ]);

      if (passengersRes.success) {
        const berthPassengers = passengersRes.data.passengers || [];
        let racPassengers = [];
        if (racRes?.success) {
          racPassengers = (racRes.data.queue || [])
            .filter((r) => r.pnrStatus === "RAC")
            .map((r) => ({
              pnr: r.pnr,
              name: r.name,
              age: r.age,
              gender: r.gender,
              from: r.from,
              to: r.to,
              fromIdx: r.fromIdx,
              toIdx: r.toIdx,
              pnrStatus: r.pnrStatus,
              racStatus: r.racStatus,
              class: r.class,
              coach: r.coach,
              berth: r.seatNo ? `${r.coach}-${r.seatNo}` : "RAC",
              berthType: r.berthType,
              boarded: false,
              noShow: false,
            }));
        }
        setPassengers([...berthPassengers, ...racPassengers]);
      }

      if (countsRes.success) {
        setCounts(countsRes.data);
      }
    } catch (error) {
      console.error("Error loading passengers:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...passengers];

    // Search by PNR
    if (searchPNR.trim()) {
      filtered = filtered.filter((p) =>
        String(p.pnr).includes(searchPNR.trim()),
      );
    }

    // Filter by status
    switch (filterStatus) {
      case "cnf":
        filtered = filtered.filter((p) => p.pnrStatus === "CNF");
        break;
      case "rac":
        filtered = filtered.filter((p) => p.pnrStatus === "RAC");
        break;
      case "boarded":
        filtered = filtered.filter((p) => p.boarded === true && !p.noShow);
        break;
      case "no-show":
        filtered = filtered.filter((p) => p.noShow === true);
        break;
      case "upcoming":
        filtered = filtered.filter(
          (p) =>
            p.fromIdx > trainData.currentStationIdx && !p.noShow && !p.boarded,
        );
        break;
      default:
        break;
    }

    setFilteredPassengers(filtered);
  };

  const handleSearch = async () => {
    if (!searchPNR.trim()) {
      alert("Please enter a PNR");
      return;
    }

    try {
      const response = await searchPassenger(searchPNR.trim());

      if (response.success) {
        const p = response.data;
        alert(
          `Passenger Found:\n\nName: ${p.name}\nPNR: ${p.pnr}\nStatus: ${p.pnrStatus}\nAge/Gender: ${p.age}/${p.gender}\nClass: ${p.class}\nFrom: ${p.from} → To: ${p.to}\nCoach-Berth: ${p.berth}\nBoarded: ${p.boarded ? "Yes" : "No"}\nNo-Show: ${p.noShow ? "Yes" : "No"}`,
        );
      }
    } catch (error) {
      alert(error.message || "Passenger not found");
    }
  };

  if (loading) {
    return (
      <div className="passengers-page">
        <div className="page-header">
          <button className="back-btn" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            ◄
          </button>
          <h2>👥 Passenger List</h2>
        </div>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading passengers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="passengers-page">
      <div className="page-header">
        <button className="back-btn" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          ◄
        </button>
        <h2>
          👥 Passenger List ({counts ? counts.total : passengers.length} total)
        </h2>
      </div>

      {/* Statistics - Compact */}
      {counts && (
        <div className="pass-stats">
          <div className="pass-stat" onClick={() => setFilterStatus("all")}>
            <div className="pass-stat-label">Total</div>
            <div className="pass-stat-value">{counts.total}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("cnf")}>
            <div className="pass-stat-label">CNF</div>
            <div className="pass-stat-value">{counts.cnf}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("rac")}>
            <div className="pass-stat-label">RAC</div>
            <div className="pass-stat-value">{counts.rac}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("boarded")}>
            <div className="pass-stat-label">Boarded</div>
            <div className="pass-stat-value">{counts.boarded}</div>
          </div>
          <div className="pass-stat" onClick={() => setFilterStatus("no-show")}>
            <div className="pass-stat-label">No-Show</div>
            <div className="pass-stat-value">{counts.noShow}</div>
          </div>
        </div>
      )}

      {/* Filters - Compact */}
      <div className="filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Enter PNR"
            value={searchPNR}
            onChange={(e) => setSearchPNR(e.target.value)}
            className="filter-input"
          />
          <button onClick={handleSearch} className="filter-btn">
            Search
          </button>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All</option>
          <option value="cnf">CNF</option>
          <option value="rac">RAC</option>
          <option value="boarded">Boarded</option>
          <option value="no-show">No-Show</option>
          <option value="upcoming">Upcoming</option>
        </select>

        <button
          onClick={() => {
            setSearchPNR("");
            setFilterStatus("all");
          }}
          className="filter-reset"
        >
          Reset
        </button>
      </div>

      {/* Vacant Berths Toggle Button - Separate Row */}
      {trainData && trainData.journeyStarted && (
        <div className="vacant-toggle-section">
          <button
            onClick={() => setShowVacantBerths(!showVacantBerths)}
            className="vacant-toggle-btn"
          >
            {showVacantBerths ? "👥 Show Passengers" : "🛏️ Show Vacant Berths"}
            {!showVacantBerths && (
              <span className="toggle-count">
                ({vacantBerths.length} vacant at{" "}
                {trainData.stations[trainData.currentStationIdx]?.code})
              </span>
            )}
          </button>
        </div>
      )}

      {/* Vacant Berths Section */}
      {showVacantBerths && trainData && trainData.journeyStarted && (
        <div className="vacant-berths-section">
          <div className="section-header">
            <h3>
              🛏️ Vacant Berths at{" "}
              {trainData.stations[trainData.currentStationIdx]?.name}
            </h3>
            <span className="badge-count">{vacantBerths.length} vacant</span>
          </div>

          {/* Vacant Berths Filter */}
          <div className="vacant-filters">
            <div className="vacant-filter-group">
              <label className="filter-label">🔍 Filter by Stations</label>
              <div className="vacant-filter-inputs">
                <input
                  type="text"
                  placeholder="From Station: (Enter: station code/name)"
                  value={vacantFromStation}
                  onChange={(e) => setVacantFromStation(e.target.value)}
                  className="vacant-filter-input"
                />
                <input
                  type="text"
                  placeholder="To Station: (Enter: station code/name)"
                  value={vacantToStation}
                  onChange={(e) => setVacantToStation(e.target.value)}
                  className="vacant-filter-input"
                />
                <button
                  onClick={() => {
                    setVacantFromStation("");
                    setVacantToStation("");
                  }}
                  className="vacant-filter-reset"
                  title="Clear Filters"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          </div>

          {vacantBerths.length === 0 ? (
            <div className="empty-state">
              <p>✅ All berths are occupied at this station!</p>
            </div>
          ) : (
            <>
              {filteredVacantBerths.length === 0 ? (
                <div className="empty-state">
                  <p>🔍 No berths match your filter criteria</p>
                </div>
              ) : (
                <div className="table-container">
                  <div className="filter-result-info">
                    Showing <strong>{filteredVacantBerths.length}</strong> of{" "}
                    <strong>{vacantBerths.length}</strong> vacant berths
                  </div>
                  <table className="vacant-berths-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Berth</th>
                        <th>Type</th>
                        <th>Class</th>
                        <th>Current Station</th>
                        <th>Vacant From</th>
                        <th>Will Occupy At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVacantBerths.map((berth, idx) => (
                        <tr key={berth.fullBerthNo}>
                          <td className="td-no">{idx + 1}</td>
                          <td className="td-berth">{berth.fullBerthNo}</td>
                          <td className="td-type">{berth.type}</td>
                          <td className="td-class">{berth.class}</td>
                          <td className="td-station">
                            <span className="station-code current">
                              {berth.currentStation}
                            </span>
                          </td>
                          <td className="td-station">
                            <span
                              className="station-code vacant-from"
                              title={berth.vacantFromStationName}
                            >
                              {berth.vacantFromStation}
                            </span>
                          </td>
                          <td className="td-station">
                            <span
                              className="station-code vacant-to"
                              title={berth.vacantToStationName}
                            >
                              {berth.vacantToStation}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Add Passenger Button - Always visible at bottom of vacant berths section */}
          <div className="add-passenger-button-container">
            <button
              onClick={() => onNavigate("add-passenger")}
              className="btn-add-passenger-bottom"
              title="Add a new passenger to vacant berths"
            >
              ➕ Add New Passenger
            </button>
            <p className="add-passenger-hint">
              Check vacant berths above and add passengers to available berths
            </p>
          </div>
        </div>
      )}

      {/* Table - Compact & Tabular */}
      {!showVacantBerths && (
        <div className="table-container">
          {filteredPassengers.length === 0 ? (
            <div className="empty-state">
              <p>No passengers match your filters</p>
            </div>
          ) : (
            <>
              <table className="pass-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>PNR</th>
                    <th>Name</th>
                    <th className="th-age">Age</th>
                    <th className="th-gender">Gender</th>
                    <th className="th-status">Status</th>
                    <th className="th-rac">RAC Que_no</th>
                    <th>Class</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Berth</th>
                    <th>Boarded</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassengers.map((p, idx) => (
                    <tr key={p.pnr} className={p.noShow ? "no-show-row" : ""}>
                      <td className="td-no">{idx + 1}</td>
                      <td className="td-pnr">{p.pnr}</td>
                      <td className="td-name">{p.name}</td>
                      <td className="td-age">{p.age}</td>
                      <td className="td-gender">{p.gender}</td>
                      <td className="td-status">
                        <span
                          className={`badge ${p.pnrStatus.toLowerCase().replace(" ", "-")}`}
                        >
                          {p.pnrStatus}
                        </span>
                      </td>
                      <td className="td-rac">{p.racStatus || '-'}</td>
                      <td className="td-class">{p.class}</td>
                      <td className="td-from">{p.from}</td>
                      <td className="td-to">{p.to}</td>
                      <td className="td-berth">{p.berth}</td>
                      <td className="td-boarded">
                        {p.noShow ? "❌" : p.boarded ? "✅" : "⏳"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-footer">
                Showing {filteredPassengers.length} of {passengers.length}{" "}
                passengers
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PassengersPage;
