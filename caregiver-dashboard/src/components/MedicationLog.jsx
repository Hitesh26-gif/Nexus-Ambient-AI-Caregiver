/**
 * MedicationLog Component — Weekly compliance tracking
 * Grid view showing daily medication adherence
 */

import React from 'react';
import {
  Box, Typography, Paper, Grid, Chip, LinearProgress,
  Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import {
  Medication, CheckCircle, Cancel, Schedule,
  TrendingUp, CalendarToday,
} from '@mui/icons-material';
import { generateMedicationLog } from '../api/mockData';

function MedicationLog() {
  const weeklyLog = generateMedicationLog();
  const totalDoses = weeklyLog.reduce((sum, day) =>
    sum + (day.doses?.length || 0), 0
  );
  const takenDoses = weeklyLog.reduce((sum, day) =>
    sum + (day.doses?.filter(d => d.taken).length || 0), 0
  );
  const complianceRate = Math.round((takenDoses / totalDoses) * 100);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Medication color="primary" />
          <Typography variant="h6">Medication Compliance</Typography>
        </Box>
        <Chip
          label={`${complianceRate}% this week`}
          color={complianceRate >= 90 ? 'success' : complianceRate >= 70 ? 'warning' : 'error'}
          sx={{ fontWeight: '700', fontSize: '0.875rem' }}
        />
      </Box>

      {/* Compliance meter */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="grey.500">Weekly Adherence</Typography>
          <Typography variant="caption" color="grey.500">
            {takenDoses}/{totalDoses} doses
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={complianceRate}
          sx={{
            height: 12, borderRadius: 6,
            bgcolor: 'grey.800',
            '& .MuiLinearProgress-bar': {
              bgcolor: complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444',
              borderRadius: 6,
            },
          }}
        />
      </Box>

      {/* Weekly Grid */}
      <Typography variant="subtitle2" color="grey.400" sx={{ mb: 1.5 }}>
        <CalendarToday fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
        This Week
      </Typography>
      <TableContainer sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'grey.900', color: 'grey.400', fontSize: '0.7rem' }}>Medication</TableCell>
              {weeklyLog.filter(d => d.date).map(day => (
                <TableCell key={day.day} align="center" sx={{ bgcolor: 'grey.900', color: 'grey.400', fontSize: '0.7rem' }}>
                  {day.day}
                </TableCell>
              ))}
              <TableCell sx={{ bgcolor: 'grey.900', color: 'grey.400', fontSize: '0.7rem', textAlign: 'right' }}>Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyLog[0]?.doses.map((_, medIdx) => (
              <TableRow key={medIdx}>
                <TableCell sx={{ bgcolor: 'grey.900', fontWeight: 600, fontSize: '0.8rem' }}>
                  {['Aspirin 81mg', 'Lisinopril 10mg', 'Metformin 500mg'][medIdx]}
                </TableCell>
                {weeklyLog.filter(d => d.date).map((day, dayIdx) => {
                  const dose = day.doses[medIdx];
                  return (
                    <TableCell key={day.day} align="center">
                      <Tooltip title={dose?.takenAt || 'Not taken'}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '50%',
                            bgcolor: dose?.taken ? `${dose.color}30` : 'grey.800',
                            border: `2px solid ${dose?.taken ? dose.color : 'grey.700'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', cursor: 'pointer',
                          }}
                        >
                          {dose?.taken ? (
                            <CheckCircle fontSize="small" sx={{ color: dose.color }} />
                          ) : (
                            <Cancel fontSize="small" sx={{ color: 'grey.600' }} />
                          )}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  );
                })}
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="600" color="success.main">
                    {Math.round((weeklyLog.filter(d => d.date).reduce((sum, day) =>
                      sum + (day.doses?.[medIdx]?.taken ? 1 : 0), 0
                    ) / Math.max(weeklyLog.filter(d => d.date).length, 1)) * 100)}%
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Medication list */}
      <Typography variant="subtitle2" color="grey.400" sx={{ mb: 1.5 }}>
        <Schedule fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
        Today's Schedule
      </Typography>
      {[
        { name: 'Aspirin 81mg', time: '8:00 AM', taken: true, takenAt: '8:02 AM', color: '#6366f1' },
        { name: 'Lisinopril 10mg', time: '12:00 PM', taken: false, takenAt: null, color: '#10b981' },
        { name: 'Metformin 500mg', time: '6:00 PM', taken: false, takenAt: null, color: '#f59e0b' },
      ].map((med, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 1,
            bgcolor: 'grey.900', borderRadius: 2,
            border: '1px solid',
            borderColor: med.taken ? 'success.main' : 'grey.800',
          }}
        >
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: `${med.color}20`, border: `2px solid ${med.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            💊
          </Box>
          <Box flex={1}>
            <Typography variant="body2" fontWeight={med.taken ? 400 : 600}
              sx={{ textDecoration: med.taken ? 'line-through' : 'none', opacity: med.taken ? 0.6 : 1 }}>
              {med.name}
            </Typography>
            <Typography variant="caption" color="grey.500">{med.time}</Typography>
          </Box>
          {med.taken ? (
            <Chip label={`✓ ${med.takenAt}`} size="small" color="success" />
          ) : (
            <Chip label="Pending" size="small" color="warning" />
          )}
        </Box>
      ))}

      {/* Trending */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.900', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TrendingUp color="success" />
        <Box>
          <Typography variant="body2" fontWeight="600">Trending Up</Typography>
          <Typography variant="caption" color="grey.500">
            Compliance improved 5% from last week
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default MedicationLog;
