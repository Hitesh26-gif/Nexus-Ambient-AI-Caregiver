/**
 * VitalMonitor Component — 24h scrollable charts
 * Heart rate, BP, SpO2, and accelerometer magnitude trends
 */

import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, ToggleButton, ToggleButtonGroup,
  FormControlLabel, Switch,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import { generateVitalsData } from '../api/mockData';

const VITAL_CONFIG = {
  heartRate: { label: 'Heart Rate', unit: 'bpm', color: '#ef4444', min: 50, max: 130, normLow: 60, normHigh: 100 },
  bpSystolic: { label: 'Systolic BP', unit: 'mmHg', color: '#3b82f6', min: 90, max: 180, normLow: 90, normHigh: 120 },
  bpDiastolic: { label: 'Diastolic BP', unit: 'mmHg', color: '#8b5cf6', min: 50, max: 110, normLow: 60, normHigh: 80 },
  spo2: { label: 'SpO2', unit: '%', color: '#10b981', min: 90, max: 100, normLow: 95, normHigh: 100 },
  temperature: { label: 'Temperature', unit: '°F', color: '#f59e0b', min: 96, max: 101, normLow: 97, normHigh: 99 },
  magnitude: { label: 'Movement', unit: 'g', color: '#ec4899', min: 0, max: 2, normLow: 0, normHigh: 0.8 },
};

function VitalMonitor() {
  const [data] = useState(() => generateVitalsData(24));
  const [selectedVitals, setSelectedVitals] = useState(['heartRate', 'bpSystolic', 'spo2']);
  const [showNormalRange, setShowNormalRange] = useState(true);

  const toggleVital = (key) => {
    setSelectedVitals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Favorite color="primary" />
          <Typography variant="h6">Vital Signs — 24 Hours</Typography>
        </Box>
        <FormControlLabel
          control={<Switch size="small" checked={showNormalRange} onChange={e => setShowNormalRange(e.target.checked)} />}
          label="Show normal range"
          labelPlacement="start"
          sx={{ mr: 2 }}
        />
      </Box>

      {/* Vital toggles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {Object.entries(VITAL_CONFIG).map(([key, config]) => (
          <ToggleButton
            key={key}
            value={key}
            selected={selectedVitals.includes(key)}
            onClick={() => toggleVital(key)}
            sx={{
              border: `1px solid ${config.color}40`,
              color: config.color,
              '&.Mui-selected': {
                bgcolor: `${config.color}20`,
                borderColor: config.color,
              },
              px: 1.5, py: 0.5, fontSize: '0.75rem',
            }}
          >
            {config.label}
          </ToggleButton>
        ))}
      </Box>

      {/* Charts */}
      <Box sx={{ height: 320, mb: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          {selectedVitals.length === 1 ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${selectedVitals[0]}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VITAL_CONFIG[selectedVitals[0]].color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={VITAL_CONFIG[selectedVitals[0]].color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis
                dataKey="timeLabel"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[VITAL_CONFIG[selectedVitals[0]].min, VITAL_CONFIG[selectedVitals[0]].max]}
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{ bgcolor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value, name) => [`${value} ${VITAL_CONFIG[name]?.unit || ''}`, VITAL_CONFIG[name]?.label || name]}
              />
              {showNormalRange && VITAL_CONFIG[selectedVitals[0]] && (
                <ReferenceArea
                  y1={VITAL_CONFIG[selectedVitals[0]].normLow}
                  y2={VITAL_CONFIG[selectedVitals[0]].normHigh}
                  fill={VITAL_CONFIG[selectedVitals[0]].color}
                  fillOpacity={0.08}
                />
              )}
              <Area
                type="monotone"
                dataKey={selectedVitals[0]}
                stroke={VITAL_CONFIG[selectedVitals[0]].color}
                fill={`url(#grad-${selectedVitals[0]})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis
                dataKey="timeLabel"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#6b7280" fontSize={11} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{ bgcolor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              {selectedVitals.map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={VITAL_CONFIG[key].color}
                  strokeWidth={2}
                  dot={false}
                  name={VITAL_CONFIG[key].label}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </Box>

      {/* Summary stats */}
      <Grid container spacing={2}>
        {selectedVitals.map(key => {
          const config = VITAL_CONFIG[key];
          const values = data.map(d => d[key]);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          const isNormal = avg >= config.normLow && avg <= config.normHigh;
          return (
            <Grid item xs={4} key={key}>
              <Paper sx={{ p: 2, bgcolor: 'grey.900', textAlign: 'center' }}>
                <Typography variant="caption" color="grey.500" display="block">{config.label}</Typography>
                <Typography variant="h4" fontWeight="700" color={config.color}>
                  {key === 'temperature' ? avg.toFixed(1) : Math.round(avg)}
                </Typography>
                <Typography variant="caption" color="grey.500">
                  Avg ({min}–{max} {config.unit})
                </Typography>
                <Chip
                  label={isNormal ? "Normal" : "Review"}
                  size="small"
                  color={isNormal ? "success" : "warning"}
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

export default VitalMonitor;
