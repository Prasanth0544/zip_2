// frontend/src/pages/HomePage.jsx (REORGANIZED LAYOUT)

import React, { useState } from 'react';
import './HomePage.css';

function HomePage({
  trainData,
  journeyStarted,
  loading,
  onStartJourney,
  onNextStation,
  onReset,
  onMarkNoShow,
  onNavigate
}) {
  const [pnrInput, setPnrInput] = useState('');

  if (!trainData) return null;

  const handleMarkNoShow = () => {
    if (!pnrInput.trim()) {
      alert("Please enter a PNR");
      return;
    }
    onMarkNoShow(pnrInput);
    setPnrInput('');
  };

  const isLastStation = trainData.currentStationIdx >= trainData.stations.length - 1;

  return (
    <div className="home-page">
      {/* Train Configuration Info */}
      <div className="train-config-banner">
        <div className="config-item">
          <span className="config-label">Train:</span>
          <span className="config-value">{trainData.trainNo} - {trainData.trainName}</span>
        </div>
        <div className="config-item">
          <span className="config-label">Journey Date:</span>
          <span className="config-value">{trainData.journeyDate}</span>
        </div>
        <div className="config-item">
          <span className="config-label">Route:</span>
          <span className="config-value">
            {trainData.stations[0]?.name} → {trainData.stations[trainData.stations.length - 1]?.name}
          </span>
        </div>
      </div>

      {/* 1. TRAIN SIMULATION - Journey Progress Timeline */}
      <div className="journey-section">
        <h2>🚉 Train Simulation - Journey Progress</h2>

        <div className="timeline-container">
          <div className="timeline-scroll">
            {trainData.stations.map((station, idx) => (
              <div key={station.code} className="timeline-station">
                {/* Connecting Line (before station, except first) */}
                {idx > 0 && (
                  <div className={`timeline-line ${idx <= trainData.currentStationIdx ? 'completed' : 'upcoming'
                    }`}></div>
                )}

                {/* Station Circle */}
                <div className={`timeline-circle ${idx < trainData.currentStationIdx ? 'completed' :
                    idx === trainData.currentStationIdx ? 'current' : 'upcoming'
                  }`}>
                  {idx < trainData.currentStationIdx ? '✓' : station.sno}
                </div>

                {/* Station Info */}
                <div className="timeline-info">
                  <div className="timeline-station-name">{station.name}</div>
                  <div className="timeline-station-code">{station.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. START JOURNEY BUTTON */}
      {!journeyStarted && (
        <button
          onClick={onStartJourney}
          disabled={loading}
          className="btn-start-journey"
        >
          {loading ? 'Starting...' : '🚀 Start Journey'}
        </button>
      )}

      {/* 3. COMPACT ACTION GRID - 3 Main Controls */}
      <div className="main-actions-grid">
        {/* 1. Train Simulation */}
        <div className="action-card-compact simulation-card">
          <div className="card-header">
            <span className="card-icon">🚂</span>
            <h4>Train Controls</h4>
          </div>
          <button
            onClick={onNextStation}
            disabled={loading || !journeyStarted || isLastStation}
            className="btn-compact primary"
          >
            {loading ? 'Processing...' : isLastStation ? 'Complete' : 'Next Station'}
          </button>
          <button
            onClick={onReset}
            disabled={loading}
            className="btn-compact secondary"
          >
            Reset
          </button>
        </div>

        {/* 2. Phase 1 */}
        <div className="action-card-compact phase1-card" onClick={() => onNavigate('phase1')}>
          <div className="card-header">
            <span className="card-icon">🎯</span>
            <h4>Phase 1</h4>
          </div>
          <p className="card-description">Initial reallocation phase</p>
          <div className="card-arrow">→</div>
        </div>

        {/* 3. Apply Reallocation */}
        <div className="action-card-compact reallocation-card" onClick={() => onNavigate('reallocation')}>
          <div className="card-header">
            <span className="card-icon">🔄</span>
            <h4>Reallocation</h4>
          </div>
          <p className="card-description">Upgrade RAC passengers</p>
          <div className="card-arrow">→</div>
        </div>
      </div>

      {/* 4. MARK NO-SHOW SECTION */}
      <div className="noshow-section">
        <h3>❌ Mark Passenger as No-Show</h3>
        <div className="noshow-input-row">
          <input
            type="text"
            placeholder="Enter 10-digit PNR"
            value={pnrInput}
            onChange={(e) => setPnrInput(e.target.value)}
            maxLength="10"
            className="input-pnr"
          />
          <button
            onClick={handleMarkNoShow}
            disabled={loading || !pnrInput.trim()}
            className="btn-noshow"
          >
            Mark No-Show
          </button>
        </div>
      </div>

      {/* 5. ACTION CARDS - Statistics & Navigation */}
      <div className="action-cards-section">
        <h3 className="section-title">📊 Quick Statistics & Navigation</h3>

        <div className="stats-action-grid">
          {/* Stat Cards */}
          <div className="stat-box">
            <div className="stat-label">Total Passengers</div>
            <div className="stat-value">{trainData.stats.totalPassengers}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Confirmed (CNF)</div>
            <div className="stat-value">{trainData.stats.cnfPassengers}</div>
          </div>

          <div className="stat-box clickable" onClick={() => onNavigate('rac-queue')}>
            <div className="stat-label">RAC Queue</div>
            <div className="stat-value">{trainData.stats.racPassengers}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Currently Onboard</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.currentOnboard : '-'}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Vacant Berths</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.vacantBerths : '-'}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Occupied Berths</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.occupiedBerths : '-'}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">Total Deboarded</div>
            <div className="stat-value">{journeyStarted ? trainData.stats.totalDeboarded : '-'}</div>
          </div>

          {/* Add Passenger Card - MOVED HERE */}
          <div className="nav-card add-passenger-nav-card" onClick={() => onNavigate('add-passenger')}>
            <span className="nav-icon">👤➕</span>
            <span className="nav-text">Add Passenger</span>
          </div>

          {/* Navigation Cards */}
          <div className="nav-card" onClick={() => onNavigate('coaches')}>
            <span className="nav-icon">🚂</span>
            <span className="nav-text">Coaches & Berths</span>
          </div>

          <div className="nav-card" onClick={() => onNavigate('passengers')}>
            <span className="nav-icon">👥</span>
            <span className="nav-text">Passenger List</span>
          </div>

          <div className="nav-card" onClick={() => onNavigate('visualization')}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Segment View</span>
          </div>

          <div className="nav-card" onClick={() => onNavigate('config')}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Update Config</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;