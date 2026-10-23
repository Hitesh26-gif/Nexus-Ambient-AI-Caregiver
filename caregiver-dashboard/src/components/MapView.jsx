/**
 * MapView Component — Home floor plan with motion tracking
 * Shows Ruth's location, fall location, and movement trail
 */

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Tooltip,
} from '@mui/material';
import {
  LocationOn, NavigateNext, History, Home,
  Warning, CheckCircle,
} from '@mui/icons-material';
import { HOME_FLOOR_PLAN } from '../api/mockData';

function MapView() {
  const [showTrail, setShowTrail] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const plan = HOME_FLOOR_PLAN;

  const roomColors = {
    living: '#6366f1',
    kitchen: '#10b981',
    bedroom: '#f59e0b',
    bathroom: '#3b82f6',
    hallway: '#8b5cf6',
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(selectedRoom === room.id ? null : room.id);
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Home color="primary" />
          <Typography variant="h6">Home Activity Map</Typography>
        </Box>
        <Chip
          label={showTrail ? "📍 Showing movement trail" : "📍 Trail hidden"}
          size="small"
          color="primary"
          onClick={() => setShowTrail(!showTrail)}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      {/* Floor plan */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          bgcolor: '#0d0d14',
          borderRadius: 3,
          border: '2px solid',
          borderColor: 'grey.800',
          overflow: 'hidden',
        }}
      >
        {/* Rooms */}
        {plan.rooms.map(room => (
          <Box
            key={room.id}
            sx={{
              position: 'absolute',
              left: `${room.x}%`,
              top: `${room.y}%`,
              width: `${room.w}%`,
              height: `${room.h}%`,
              bgcolor: selectedRoom === room.id ? `${roomColors[room.id]}30` : `${roomColors[room.id]}10`,
              border: `2px solid ${selectedRoom === room.id ? roomColors[room.id] : `${roomColors[room.id]}40`}`,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: `${roomColors[room.id]}25`,
                borderColor: roomColors[room.id],
              },
            }}
            onClick={() => handleRoomClick(room)}
          >
            <Typography
              variant="caption"
              sx={{
                color: roomColors[room.id],
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {room.name}
            </Typography>
          </Box>
        ))}

        {/* Fall location marker */}
        {plan.fallLocation && (
          <Tooltip title={`Fall location — ${plan.fallLocation.room}`}>
            <Box
              sx={{
                position: 'absolute',
                left: `${plan.fallLocation.x}%`,
                top: `${plan.fallLocation.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <Box
                sx={{
                  width: 24, height: 24, borderRadius: '50%',
                  bgcolor: '#ef4444',
                  border: '3px solid white',
                  boxShadow: '0 0 20px rgba(239,68,68,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s infinite',
                }}
              >
                <Warning fontSize="small" color="white" />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
                  bgcolor: 'rgba(0,0,0,0.8)', px: 1, borderRadius: 1, whiteSpace: 'nowrap',
                  fontSize: '0.65rem',
                }}
              >
                Fall Location
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Motion trail */}
        {showTrail && plan.motionTrail && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Trail line */}
            <polyline
              points={plan.motionTrail.map(p =>
                `${p.x + 2}% ${p.y + 2}%`
              ).join(' ')}
              fill="none"
              stroke="url(#trail-grad)"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
            />
            {/* Trail dots */}
            {plan.motionTrail.map((point, i) => (
              <circle
                key={i}
                cx={`${point.x + 2}%`}
                cy={`${point.y + 2}%`}
                r={i === plan.motionTrail.length - 1 ? 6 : 4}
                fill={i === plan.motionTrail.length - 1 ? '#ef4444' : '#6366f1'}
                opacity={i === plan.motionTrail.length - 1 ? 1 : 0.6}
              />
            ))}
          </svg>
        )}

        {/* Current position */}
        {plan.lastKnownPosition && (
          <Tooltip title={`Last known: ${plan.lastKnownPosition.room} at ${plan.lastKnownPosition.timestamp}`}>
            <Box
              sx={{
                position: 'absolute',
                left: `${plan.lastKnownPosition.x}%`,
                top: `${plan.lastKnownPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <Box
                sx={{
                  width: 20, height: 20, borderRadius: '50%',
                  bgcolor: '#10b981',
                  border: '3px solid white',
                  boxShadow: '0 0 15px rgba(16,185,129,0.6)',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
                  bgcolor: 'rgba(0,0,0,0.8)', px: 1, borderRadius: 1, whiteSpace: 'nowrap',
                  fontSize: '0.6rem',
                }}
              >
                Current
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Room details */}
      {selectedRoom && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.900', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="600">
            {plan.rooms.find(r => r.id === selectedRoom)?.name}
          </Typography>
          <Typography variant="body2" color="grey.400">
            Last activity: 14:32 · 3 people detected
          </Typography>
        </Paper>
      )}

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[
          { color: '#10b981', label: 'Current Location' },
          { color: '#ef4444', label: 'Fall Location' },
          { color: '#6366f1', label: 'Movement Trail' },
        ].map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
            <Typography variant="caption" color="grey.500">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default MapView;
