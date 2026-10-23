/**
 * EmergencyDisplay — Full-screen emergency overlay for Fire TV / Dashboard
 *
 * Shows during any emergency event:
 * - Large warning indicator
 * - Caregiver contact info (photo + phone)
 * - Live Ring camera snapshot
 * - Help dispatch status and ETA
 * - Pulsing animation to grab attention
 */

import React, { useEffect, useState } from "react";
import {
  Container, Typography, Box, Avatar, Chip, LinearProgress,
  Paper, Fade, Zoom, IconButton,
} from "@mui/material";
import {
  WarningAmber, EmergencyShare, Phone, LocalHospital,
  ArrowBack, Refresh, NotificationsActive,
} from "@mui/icons-material";

const EMERGENCY_TYPES = {
  fall: { label: "Fall Detected", icon: "🚶‍♀️💥", color: "#D32F2F" },
  medical: { label: "Medical Alert", icon: "🏥", color: "#F57C00" },
  intrusion: { label: "Unauthorized Entry", icon: "🚨", color: "#1565C0" },
};

function EmergencyDisplay({ emergency, onDismiss, onAcknowledge }) {
  const [elapsed, setElapsed] = useState(0);
  const [snapshotRotating, setSnapshotRotating] = useState(false);

  useEffect(() => {
    if (!emergency?.active) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [emergency?.active]);

  if (!emergency?.active) return null;

  const type = EMERGENCY_TYPES[emergency.type] || EMERGENCY_TYPES.fall;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <Fade in={emergency.active} timeout={300}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          bgcolor: "rgba(0,0,0,0.92)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 3,
        }}
      >
        {/* Pulsing warning header */}
        <Zoom in timeout={500}>
          <Box textAlign="center" mb={3}>
            <Box
              sx={{
                width: 120, height: 120, borderRadius: "50%",
                bgcolor: type.color, display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 16px",
                animation: "pulse 1.5s infinite",
                fontSize: 56,
                boxShadow: `0 0 60px ${type.color}80`,
                "@keyframes pulse": {
                  "0%, 100%": { transform: "scale(1)", opacity: 1 },
                  "50%": { transform: "scale(1.08)", opacity: 0.85 },
                },
              }}
            >
              {type.icon}
            </Box>
            <Typography variant="h3" fontWeight="900" color="error.main" sx={{ letterSpacing: 3 }}>
              {type.label.toUpperCase()}
            </Typography>
            <Typography variant="subtitle1" color="grey.400" sx={{ mt: 1 }}>
              {emergency.timestamp} · {emergency.location}
            </Typography>
            <Typography variant="h5" color="warning.main" sx={{ mt: 1 }}>
              ⏱ Elapsed: {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </Typography>
          </Box>
        </Zoom>

        {/* Caregiver contact card */}
        <Paper
          elevation={8}
          sx={{
            bgcolor: "background.paper", borderRadius: 4, p: 3, mb: 3,
            maxWidth: 480, width: "100%", textAlign: "center",
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Caregiver Notified
          </Typography>
          <Avatar
            src={emergency.caregiver?.photoUrl}
            sx={{ width: 80, height: 80, mx: "auto", mb: 1, border: "3px solid", borderColor: "primary.main" }}
          />
          <Typography variant="h5" fontWeight="700">{emergency.caregiver?.name}</Typography>
          <Typography variant="body1" color="text.secondary">
            {emergency.caregiver?.phone}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
            <Chip
              icon={<Phone />}
              label={`Called · ${emergency.contactHistory?.callTime || "Just now"}`}
              color="success"
              size="small"
            />
            {emergency.helpDispatched && (
              <Chip
                icon={<LocalHospital />}
                label={`Help ETA: ${emergency.helpEtaMinutes} min`}
                color="info"
                size="small"
              />
            )}
          </Box>
        </Paper>

        {/* Ring camera snapshot */}
        {emergency.snapshotUrl && (
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="subtitle2" color="grey.400" gutterBottom>
              Ring Doorbell — Latest Snapshot
            </Typography>
            <Box
              component="img"
              src={emergency.snapshotUrl}
              alt="Emergency snapshot"
              sx={{
                width: 400, maxWidth: "90vw", borderRadius: 2,
                border: "2px solid #D32F2F", boxShadow: "0 0 30px rgba(211,47,47,0.4)",
              }}
            />
            <IconButton
              size="small"
              onClick={() => {
                setSnapshotRotating(true);
                setTimeout(() => setSnapshotRotating(false), 1000);
              }}
              sx={{ mt: 1 }}
            >
              <Refresh sx={{ color: "grey.400" }} />
            </IconButton>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <IconButton
            size="large"
            sx={{
              bgcolor: "success.main", color: "white",
              "&:hover": { bgcolor: "success.dark" },
              px: 3, py: 1.5,
            }}
            onClick={onAcknowledge}
          >
            <EmergencyShare fontSize="large" />
            <Typography sx={{ ml: 1, fontWeight: "bold" }}>I'm OK</Typography>
          </IconButton>
          <IconButton
            size="large"
            sx={{
              bgcolor: "primary.main", color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              px: 3, py: 1.5,
            }}
            onClick={() => window.open(`tel:${emergency.caregiver?.phone}`)}
          >
            <Phone fontSize="large" />
            <Typography sx={{ ml: 1, fontWeight: "bold" }}>Call Caregiver</Typography>
          </IconButton>
          <IconButton
            size="large"
            sx={{
              bgcolor: "error.main", color: "white",
              "&:hover": { bgcolor: "error.dark" },
              px: 3, py: 1.5,
            }}
            onClick={() => window.open("tel:911")}
          >
            <WarningAmber fontSize="large" />
            <Typography sx={{ ml: 1, fontWeight: "bold" }}>Call 911</Typography>
          </IconButton>
        </Box>

        {/* Dispatch log */}
        {emergency.dispatchLog && emergency.dispatchLog.length > 0 && (
          <Paper sx={{ mt: 3, p: 2, maxWidth: 480, width: "100%", bgcolor: "grey.900" }}>
            <Typography variant="caption" color="grey.500" gutterBottom display="block">
              <NotificationsActive fontSize="inherit" /> Dispatch Log
            </Typography>
            {emergency.dispatchLog.map((entry, i) => (
              <Typography key={i} variant="body2" color="grey.300" sx={{ fontFamily: "monospace" }}>
                [{entry.time}] {entry.action}
              </Typography>
            ))}
          </Paper>
        )}
      </Box>
    </Fade>
  );
}

export default EmergencyDisplay;
