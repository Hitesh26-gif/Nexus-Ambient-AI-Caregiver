/**
 * LiveFeed Component — Real-time camera and vitals overview
 * Shows current status, Ring camera snapshots, and quick vitals
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Avatar, Grid, Chip,
  IconButton, Badge, linearProgressClasses,
} from '@mui/material';
import {
  Videocam, Favorite, Refresh, LiveTv, Wifi,
  NotificationsActive, CheckCircle, Warning,
} from '@mui/icons-material';
import { MOCK_USER, CAMERA_SNAPSHOTS } from '../api/mockData';

function LiveFeed({ emergencyActive, onDismissEmergency }) {
  const [activeCamera, setActiveCamera] = useState('kitchen');
  const [lastUpdate, setLastUpdate] = useState('Just now');
  const [snapshotKey, setSnapshotKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate('Just now');
      setSnapshotKey(k => k + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const cameras = [
    { id: 'frontDoor', name: 'Front Door', url: CAMERA_SNAPSHOTS.frontDoor },
    { id: 'kitchen', name: 'Kitchen', url: CAMERA_SNAPSHOTS.kitchen },
    { id: 'livingRoom', name: 'Living Room', url: CAMERA_SNAPSHOTS.livingRoom },
  ];

  const currentCamera = cameras.find(c => c.id === activeCamera) || cameras[0];
  const user = MOCK_USER;
  const latestVital = {
    heartRate: 72,
    bp: '128/82',
    spo2: 98,
    temp: '98.4°F',
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Videocam color="primary" />
          <Typography variant="h6">Live Overview</Typography>
          <Badge color="error" variant="dot" invisible={!emergencyActive}>
            <Chip
              label={emergencyActive ? "🚨 EMERGENCY" : "● LIVE"}
              size="small"
              color={emergencyActive ? "error" : "success"}
              sx={{ ml: 1 }}
            />
          </Badge>
        </Box>
        <IconButton size="small" onClick={() => setSnapshotKey(k => k + 1)}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      {/* User Profile Card */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'grey.900', borderRadius: 2 }}>
        <Avatar src={user.photo} sx={{ width: 56, height: 56, border: '2px solid', borderColor: emergencyActive ? 'error.main' : 'success.main' }} />
        <Box flex={1}>
          <Typography variant="h6" fontWeight="700">{user.name}</Typography>
          <Typography variant="body2" color="grey.400">
            {user.age} years old · Enrolled since {new Date(user.enrolledSince).toLocaleDateString()}
          </Typography>
          <Chip
            label={emergencyActive ? "🚨 Emergency Active" : "✅ All Well"}
            size="small"
            color={emergencyActive ? "error" : "success"}
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Box textAlign="right">
          <Typography variant="caption" color="grey.500">Last update</Typography>
          <Typography variant="body2">{lastUpdate}</Typography>
        </Box>
      </Box>

      {/* Camera Grid */}
      <Grid container spacing={2} mb={3}>
        {cameras.map(cam => (
          <Grid item xs={12} sm={4} key={cam.id}>
            <Box
              sx={{
                position: 'relative', borderRadius: 2, overflow: 'hidden',
                cursor: 'pointer', border: activeCamera === cam.id ? '2px solid' : '2px solid transparent',
                borderColor: 'primary.main', aspectRatio: '16/9',
              }}
              onClick={() => setActiveCamera(cam.id)}
            >
              <Box
                component="img"
                src={cam.url}
                alt={cam.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                p: 1, display: 'flex', alignItems: 'center', gap: 0.5,
              }}>
                <Videocam fontSize="small" color="primary" />
                <Typography variant="caption" color="white">{cam.name}</Typography>
                <Wifi fontSize="small" color="success" sx={{ ml: 'auto' }} />
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Current Vitals Quick View */}
      <Typography variant="subtitle2" color="grey.400" sx={{ mb: 1.5 }}>Current Vitals</Typography>
      <Grid container spacing={1.5}>
        {[
          { label: 'Heart Rate', value: `${latestVital.heartRate}`, unit: 'bpm', icon: <Favorite color="error" />, color: 'error' },
          { label: 'Blood Pressure', value: latestVital.bp, unit: '', icon: <NotificationsActive color="info" />, color: 'info' },
          { label: 'SpO2', value: `${latestVital.spo2}`, unit: '%', icon: <CheckCircle color="success" />, color: 'success' },
          { label: 'Temp', value: latestVital.temp, unit: '', icon: <Warning color="warning" />, color: 'warning' },
        ].map(v => (
          <Grid item xs={6} key={v.label}>
            <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'grey.900' }}>
              {v.icon}
              <Box>
                <Typography variant="caption" color="grey.500" display="block">{v.label}</Typography>
                <Typography variant="h6" fontWeight="700">
                  {v.value}<Typography component="span" variant="caption" color="grey.500"> {v.unit}</Typography>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Emergency Dismiss */}
      {emergencyActive && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="grey.400" mb={1}>Emergency Response Status:</Typography>
          <Grid container spacing={1}>
            {[
              { label: 'Alexa Notified', done: true },
              { label: 'Snapshots Captured', done: true },
              { label: 'Alerts Sent (SMS/Email)', done: true },
              { label: 'Fire TV Alerted', done: true },
              { label: 'Caregiver Confirmed', done: true },
              { label: 'Help Dispatched', done: true },
            ].map(item => (
              <Grid item xs={6} key={item.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {item.done ? (
                    <CheckCircle fontSize="small" color="success" />
                  ) : (
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'grey.600' }} />
                  )}
                  <Typography variant="caption" color={item.done ? 'success.main' : 'grey.500'}>{item.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
}

export default LiveFeed;
