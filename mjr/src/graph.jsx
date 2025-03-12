import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Graph() {
  const [sensorData, setSensorData] = useState([]);
  const [cropRecommendations, setCropRecommendations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://172.20.10.5:5001/data'); // Flask backend URL
        setSensorData(response.data);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    const interval = setInterval(fetchData, 1000); // Fetch every second
    return () => clearInterval(interval);
  }, []);

  const suitableRanges = {
    temperature: { min: 20, max: 48 },
    humidity: { min: 60, max: 85 },
    soil_conductivity: { min: 100, max: 500 },
    nitrogen: { min: 30, max: 60 },
    pH: { min: 5.5, max: 7.5 },
    phosphorus: { min: 10, max: 30 },
    potassium: { min: 20, max: 50 },
  };

  const getSuggestion = (key, value) => {
    const range = suitableRanges[key];
    if (value < range.min) return `Increase ${key} to meet the minimum requirement for coconut farming.`;
    if (value > range.max) return `Reduce ${key} as it exceeds the optimal level for coconut farming.`;
    return `The ${key} value is within the optimal range.`;
  };

  const getColor = (key, value) => {
    const range = suitableRanges[key];
    if (value < range.min) return 'rgba(255,182,193,1)'; // Pink (below range)
    if (value > range.max) return 'rgba(255,99,132,1)'; // Red (above range)
    return 'rgba(75,192,192,1)'; // Green (within range)
  };

  const smoothData = (data, windowSize = 3) => {
    if (data.length < windowSize) return data; // Not enough data to smooth
    const smoothed = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const subArray = data.slice(start, i + 1);
      const average = subArray.reduce((sum, val) => sum + val, 0) / subArray.length;
      smoothed.push(average);
    }
    return smoothed;
  };

  const processData = (key) => {
    const rawData = sensorData.slice(-20).map((d) => d[key]); // Only last 20 data points
    const smoothedData = smoothData(rawData);
    return {
      labels: sensorData.slice(-20).map((d) => new Date(d.timestamp).toLocaleTimeString()), // Last 20 timestamps
      datasets: [
        {
          label: key.charAt(0).toUpperCase() + key.slice(1),
          data: smoothedData,
          borderColor: 'rgba(75,192,192,1)', // Consistent line color
          pointBackgroundColor: smoothedData.map((value) => getColor(key, value)), // Point-specific colors
          backgroundColor: 'rgba(75,192,192,0.2)',
          borderWidth: 2,
          fill: true,
        },
      ],
    };
  };

  const options = (key, data) => {
    const minValue = Math.min(...data) * 0.8; // Add margin below
    const maxValue = Math.max(...data) * 1.2; // Add margin above

    return {
      responsive: true,
      scales: {
        y: {
          min: Math.floor(minValue), // Ensure integer bounds
          max: Math.ceil(maxValue),
          title: {
            display: true,
            text: `${key.charAt(0).toUpperCase() + key.slice(1)} Value`,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Time',
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
      },
    };
  };

  const recommendCrop = async () => {
    try {
      const latestData = sensorData[sensorData.length - 1];
      if (!latestData) {
        alert('No sensor data available to make a recommendation.');
        return;
      }

      const response = await axios.post('http://172.20.10.5:5001/recommend', latestData);
      setCropRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Error recommending crops:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sensor Data Visualization</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
        }}
      >
        {Object.keys(suitableRanges).map((key) => (
          <div key={key} style={{ width: '100%' }}>
            <h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
            <Line
              data={processData(key)}
              options={options(key, sensorData.slice(-20).map((d) => d[key]))}
            />
            <p>
              {sensorData.length > 0
                ? getSuggestion(key, sensorData[sensorData.length - 1][key])
                : 'Loading data...'}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={recommendCrop}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Recommend Crops
      </button>

      {cropRecommendations.length > 0 && (
        <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}>
          <p>Recommended Crops:</p>
          <ul>
            {cropRecommendations.map((crop, index) => (
              <li key={index}>{crop}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Graph;

