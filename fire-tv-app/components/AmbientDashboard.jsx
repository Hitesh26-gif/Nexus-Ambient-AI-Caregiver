/**
 * AmbientDashboard — The normal-state Fire TV display
 *
 * Shows:
 * - Weather widget
 * - Medication schedule (with compliance status)
 * - Caregiver quick info
 * - Greeting based on time of day
 */

import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Chip, Grid, Avatar,
  LinearProgress, CircularProgress,
} from "@mui/material";
import {
  WaetherPartlyCloudy, Mediation, Schedule, Person,
  Thermometer, WaterDrop, Heart, AccessTime,
} from "@mui/icons-material";

// Mock weather data (in production, fetch from weather API)
const WEATHER = {
  location: "Austin, TX",
  temp: 78,
  condition: "Partly Cloudy",
  high: 84,
  low: 65,
  humidity: 55,
  icon: "⛅",
};

const MEDICATIONS = [
  { name: "Aspirin 81mg", time: "8:00 AM", taken: true, takenAt: "8:02 AM" },
  { name: "Lisinopril 10mg", time: "12:00 PM", taken: false, takenAt: null },
  { name: "Metformin 500mg", time: "6:00 PM", taken: false, takenAt: null },
];

const CAREGIVER = {
  name: "Mark Martinez",
  phone: "(555) 123-4567",
  distance: "200 mi",
  photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
  status: "online",
};

function AmbientDashboard() {
  const [now, setNow] = useState(new Date());
  const [photoIndex, setPhotoIndex] = useState(0);

  // Rotating family photos (cycle every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setPhotoIndex(i => (i + 1) % 4);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const familyPhotos = [
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600",
    "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=600",
    "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600",
    "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=600",
  ];
  const photoCaptions = [
    "Family picnic, Summer 2024",
    "Ruth's 75th Birthday",
    "Thanksgiving with Grandkids",
    "Mark's Promotion Celebration",
  ];

  const medProgress = Math.round((MEDICATIONS.filter(m => m.taken).length / MEDICATIONS.length) * 100);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "grey.900",
        color: "white",
        p: 4,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* Header: Greeting + Time */}
      <Box textAlign="center" mb={2}>
        <Typography variant="h2" fontWeight="300" color="grey.300">
          {greeting}, Ruth
        </Typography>
        <Typography variant="h1" fontWeight="700" sx={{ letterSpacing: 2 }}>
          {timeStr}
        </Typography>
        <Typography variant="subtitle1" color="grey.400">
          {dateStr}
        </Typography>
      </Box>

      {/* Main grid */}
      <Grid container spacing={3}>
        {/* Family Photo Carousel */}
        <Grid item xs={12} md={7}>
          <Paper
            sx={{
              borderRadius: 4, overflow: "hidden", position: "relative",
              height: 360, boxShadow: 6,
            }}
          >
            <Box
              component="img"
              src={familyPhotos[photoIndex]}
              alt={photoCaptions[photoIndex]}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box
              sx={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                bgcolor: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                p: 3,
              }}
            >
              <Typography variant="h5" fontWeight="500">
                {photoCaptions[photoIndex]}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                {familyPhotos.map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: i === photoIndex ? 24 : 8,
                      height: 4, borderRadius: 2,
                      bgcolor: i === photoIndex ? "primary.main" : "grey.500",
                      transition: "all 0.3s",
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right column: Weather + Meds + Caregiver */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Weather Widget */}
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: "grey.800" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="h3">{WEATHER.icon}</Typography>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {WEATHER.temp}°F
                  </Typography>
                  <Typography color="grey.400">{WEATHER.condition}</Typography>
                </Box>
                <Box sx={{ ml: "auto", textAlign: "right" }}>
                  <Typography variant="body2" color="grey.400">{WEATHER.location}</Typography>
                  <Typography variant="body2">
                    H:{WEATHER.high}° L:{WEATHER.low}° · 💧 {WEATHER.humidity}%
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Medication Status */}
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: "grey.800" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Mediation color="primary" />
                <Typography variant="h6">Today's Medications</Typography>
                <Chip label={`${medProgress}%`} color={medProgress === 100 ? "success" : "warning"} size="small" />
              </Box>
              {MEDICATIONS.map((med, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                  <Box sx={{
                    width: 24, height: 24, borderRadius: "50%",
                    bgcolor: med.taken ? "success.main" : "grey.600",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14,
                  }}>
                    {med.taken ? "✓" : ""}
                  </Box>
                  <Typography flex={1} sx={{ textDecoration: med.taken ? "line-through" : "none", opacity: med.taken ? 0.6 : 1 }}>
                    {med.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "grey.400" }}>
                    <AccessTime fontSize="small" />
                    <Typography variant="body2">{med.time}</Typography>
                  </Box>
                  {med.takenAt && (
                    <Typography variant="caption" color="success.main">
                      {med.takenAt}
                    </Typography>
                  )}
                </Box>
              ))}
            </Paper>

            {/* Caregiver Card */}
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: "grey.800" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar src={CAREGIVER.photoUrl} sx={{ width: 56, height: 56 }} />
                <Box flex={1}>
                  <Typography variant="h6">{CAREGIVER.name}</Typography>
                  <Typography variant="body2" color="grey.400">
                    {CAREGIVER.distance} away · {CAREGIVER.phone}
                  </Typography>
                  <Chip
                    label="● Online"
                    size="small"
                    color="success"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            </Paper>

          </Box>
        </Grid>
      </Grid>

      {/* Bottom: Vital signs strip */}
      <Paper sx={{ p: 2, borderRadius: 4, bgcolor: "grey.800", mt: "auto" }}>
        <Grid container spacing={3} justifyContent="center">
          {[
            { label: "Heart Rate", value: "72 bpm", icon: <Heart color="error" />, status: "normal" },
            { label: "Blood Pressure", value: "128/82", icon: <WaterDrop color="primary" />, status: "normal" },
            { label: "SpO2", value: "98%", icon: <Thermometer color="info" />, status: "normal" },
            { label: "Temperature", value: "98.4°F", icon: <Thermometer color="warning" />, status: "normal" },
          ].map((vital, i) => (
            <Grid item key={i}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {vital.icon}
                <Typography variant="body2" color="grey.400">{vital.label}</Typography>
                <Typography variant="h6" fontWeight="700">{vital.value}</Typography>
                <Chip label={vital.status} size="small" color={vital.status === "normal" ? "success" : "warning"} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

export default AmbientDashboard;
