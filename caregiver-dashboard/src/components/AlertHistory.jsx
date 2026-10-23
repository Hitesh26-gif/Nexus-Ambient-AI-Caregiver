/**
 * AlertHistory Component — Timeline of all events
 * Shows falls, medication alerts, system notifications
 */

import React from 'react';
import {
  Box, Typography, Paper, Chip,
  List, ListItem, ListItemText, ListItemIcon, Divider,
} from '@mui/material';
import {
  Warning, CheckCircle, Error, Medication, Schedule,
  Phone, Videocam,
} from '@mui/icons-material';
import { generateFallEvents, generateAlertHistory } from '../api/mockData';

function TimelineItem({ time, color, icon, content, hasMore, alternate = false }) {
  return (
    <Box sx={{ display: 'flex', mb: 2, flexDirection: alternate ? 'row-reverse' : 'row' }}>
      <Box sx={{ width: 60, flexShrink: 0, textAlign: 'center', alignSelf: 'flex-start', mt: 1 }}>
        <Typography variant="caption" color="grey.500">{time}</Typography>
      </Box>
      <Box sx={{ width: 24, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <Box sx={{
          width: 16, height: 16, borderRadius: '50%',
          bgcolor: color || '#6366f1',
          border: '3px solid #13131f',
          zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        {hasMore && (
          <Box sx={{ width: 2, height: 'calc(100% + 8px)', bgcolor: 'grey.700', position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)' }} />
        )}
      </Box>
      <Box sx={{ flex: 1 }}>{content}</Box>
    </Box>
  );
}

function AlertHistory() {
  const fallEvents = generateFallEvents();
  const alertHistory = generateAlertHistory(7);

  const severityConfig = {
    critical: { color: '#ef4444', icon: <Error fontSize="small" />, label: 'Critical' },
    warning: { color: '#f59e0b', icon: <Warning fontSize="small" />, label: 'Warning' },
    info: { color: '#3b82f6', icon: <CheckCircle fontSize="small" />, label: 'Info' },
  };

  const typeConfig = {
    fall: { icon: <Warning fontSize="small" />, color: '#ef4444' },
    possible_fall: { icon: <Warning fontSize="small" />, color: '#f59e0b' },
    medication_missed: { icon: <Medication fontSize="small" />, color: '#f59e0b' },
    medication_taken: { icon: <CheckCircle fontSize="small" />, color: '#10b981' },
    system: { icon: <Schedule fontSize="small" />, color: '#3b82f6' },
  };

  return (
    <Box>
      {/* Fall Events Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" />
          Fall Events
          <Chip label={fallEvents.length} color="error" size="small" sx={{ ml: 1 }} />
        </Typography>

        {fallEvents.map((event, idx) => {
          const cfg = severityConfig[event.severity];
          const time = new Date(event.timestamp).toLocaleString();
          return (
            <TimelineItem
              key={event.id}
              time={time}
              color={cfg.color}
              icon={cfg.icon}
              hasMore={idx < fallEvents.length - 1}
              content={
                <Paper sx={{ p: 2, bgcolor: 'grey.900', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="600">
                        {event.description}
                      </Typography>
                      {event.location && (
                        <Typography variant="caption" color="grey.500">
                          📍 {event.location}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={`${(event.confidence * 100).toFixed(0)}%`}
                        size="small"
                        sx={{ fontWeight: '700', bgcolor: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}` }}
                      />
                      <Chip label={cfg.label} size="small" color={cfg.color === '#ef4444' ? 'error' : cfg.color === '#f59e0b' ? 'warning' : 'info'} />
                    </Box>
                  </Box>

                  {event.response && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.800' }}>
                      <Typography variant="caption" color="grey.400" display="block" mb={1}>
                        RESPONSE TIMELINE
                      </Typography>
                      <List dense>
                        {Object.entries(event.response).map(([key, value]) => (
                          <ListItem key={key} dense sx={{ py: 0.3 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              {key.includes('alexa') && <Videocam fontSize="small" color="primary" />}
                              {key.includes('snapshot') && <Videocam fontSize="small" color="info" />}
                              {key.includes('alert') && <Phone fontSize="small" color="warning" />}
                              {key.includes('help') && <CheckCircle fontSize="small" color="success" />}
                              {key.includes('false') && <CheckCircle fontSize="small" color="success" />}
                            </ListItemIcon>
                            <ListItemText
                              primaryTypographyProps={{ variant: 'body2', color: 'grey.300' }}
                              secondaryTypographyProps={{ variant: 'caption', color: 'grey.500' }}
                              primary={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              secondary={String(value)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Paper>
              }
            />
          );
        })}
      </Paper>

      {/* Alert History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule color="primary" />
          Alert History
          <Chip label={alertHistory.length} color="primary" size="small" sx={{ ml: 1 }} />
        </Typography>
        <List>
          {alertHistory.slice(0, 10).map((alert, i) => {
            const cfg = severityConfig[alert.severity];
            const time = new Date(alert.timestamp).toLocaleString();
            return (
              <React.Fragment key={alert.id}>
                <ListItem
                  sx={{
                    borderRadius: 1,
                    bgcolor: alert.read ? 'transparent' : 'grey.900',
                    mb: 0.5,
                  }}
                >
                  <ListItemIcon>
                    <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={alert.read ? 400 : 600}>
                        {alert.message}
                      </Typography>
                    }
                    secondary={time}
                  />
                  <Chip label={cfg.label} size="small" color={cfg.color === '#ef4444' ? 'error' : cfg.color === '#f59e0b' ? 'warning' : 'info'} variant="outlined" />
                </ListItem>
                {i < alertHistory.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}

export default AlertHistory;
