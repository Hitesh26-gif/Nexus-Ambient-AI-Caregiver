/**
 * FamilyFeed — Photo gallery and family updates component
 *
 * Displays rotating family photos and recent family messages.
 * Used in both Fire TV ambient mode and the caregiver dashboard.
 */

import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Avatar, Grid, Chip,
  IconButton, Tooltip,
} from "@mui/material";
import {
  PhotoLibrary, Heart, ChatBubble, Refresh,
  AddPhotoAlternate,
} from "@mui/icons-material";

const FAMILY_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400", caption: "Family picnic", date: "Jun 15, 2024", liked: true },
  { id: 2, url: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=400", caption: "Birthday celebration", date: "Mar 3, 2024", liked: false },
  { id: 3, url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400", caption: "Thanksgiving dinner", date: "Nov 28, 2023", liked: true },
  { id: 4, url: "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=400", caption: "Christmas morning", date: "Dec 25, 2023", liked: true },
  { id: 5, url: "https://images.unsplash.com/photo-1529156069898-49955e5fcd1e?w=400", caption: "Summer at the lake", date: "Aug 10, 2023", liked: false },
  { id: 6, url: "https://images.unsplash.com/photo-1476703993599-0035a21177dc?w=400", caption: "Spring garden", date: "Apr 22, 2024", liked: true },
];

const FAMILY_MESSAGES = [
  { id: 1, from: "Mark", avatar: "M", text: "Mom, love the new garden flowers! 🌸", time: "2h ago", unread: true },
  { id: 2, from: "Sarah", avatar: "S", text: "Grandma, can't wait to visit this weekend!", time: "5h ago", unread: true },
  { id: 3, from: "Nurse Jen", avatar: "N", text: "Reminder: Doctor appointment tomorrow at 10 AM.", time: "1d ago", unread: false },
];

function FamilyFeed({ compact = false }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [photos, setPhotos] = useState(FAMILY_PHOTOS);

  useEffect(() => {
    if (compact) return;
    const timer = setInterval(() => {
      setActivePhoto(i => (i + 1) % photos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [compact, photos.length]);

  if (compact) {
    return (
      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "grey.800" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <PhotoLibrary color="primary" />
          <Typography variant="subtitle1" fontWeight="600">Recent Photos</Typography>
          <Chip label={`${photos.length} photos`} size="small" color="secondary" sx={{ ml: "auto" }} />
        </Box>
        <Grid container spacing={1}>
          {photos.slice(0, 4).map((photo, i) => (
            <Grid item xs={3} key={photo.id}>
              <Box
                component="img"
                src={photo.url}
                alt={photo.caption}
                sx={{
                  width: "100%", aspectRatio: "1", objectFit: "cover",
                  borderRadius: 2, cursor: "pointer", opacity: 0.8,
                  "&:hover": { opacity: 1 },
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Featured photo */}
      <Paper
        sx={{
          borderRadius: 4, overflow: "hidden", mb: 3, position: "relative",
          height: 300, boxShadow: 4,
        }}
      >
        <Box
          component="img"
          src={photos[activePhoto].url}
          alt={photos[activePhoto].caption}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Box
          sx={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            p: 3,
          }}
        >
          <Typography variant="h6" fontWeight="600">{photos[activePhoto].caption}</Typography>
          <Typography variant="body2" color="grey.300">{photos[activePhoto].date}</Typography>
        </Box>
        <IconButton
          sx={{ position: "absolute", top: 16, right: 16, bgcolor: "rgba(0,0,0,0.5)", color: "white" }}
          onClick={() => setActivePhoto(i => (i + 1) % photos.length)}
        >
          <Refresh />
        </IconButton>
      </Paper>

      {/* Photo grid */}
      <Typography variant="h6" fontWeight="600" gutterBottom>
        All Photos <Chip label={photos.length} size="small" sx={{ ml: 1 }} />
      </Typography>
      <Grid container spacing={2} mb={3}>
        {photos.map((photo) => (
          <Grid item xs={4} key={photo.id}>
            <Box sx={{ position: "relative" }}>
              <Box
                component="img"
                src={photo.url}
                alt={photo.caption}
                sx={{
                  width: "100%", aspectRatio: "1", objectFit: "cover",
                  borderRadius: 2, cursor: "pointer",
                  border: activePhoto === photos.indexOf(photo) ? "3px solid" : "3px solid transparent",
                  borderColor: "primary.main",
                }}
                onClick={() => setActivePhoto.photos.indexOf(photo)}
              />
              <Tooltip title={photo.liked ? "Unlike" : "Like"}>
                <IconButton
                  sx={{
                    position: "absolute", top: 4, right: 4,
                    bgcolor: "rgba(0,0,0,0.6)", color: photo.liked ? "error.main" : "white",
                  }}
                  size="small"
                >
                  <Heart fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Family messages */}
      <Typography variant="h6" fontWeight="600" gutterBottom>
        Family Messages <Chip label={FAMILY_MESSAGES.filter(m => m.unread).length} size="small" color="primary" sx={{ ml: 1 }} />
      </Typography>
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {FAMILY_MESSAGES.map((msg, i) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex", alignItems: "center", gap: 2, p: 2,
              bgcolor: msg.unread ? "primary.main" : "grey.900",
              borderBottom: i < FAMILY_MESSAGES.length - 1 ? "1px solid" : "none",
              borderColor: "grey.700", cursor: "pointer",
              "&:hover": { bgcolor: msg.unread ? "primary.dark" : "grey.800" },
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main" }}>{msg.avatar}</Avatar>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={msg.unread ? "700" : "400"}>
                {msg.from}
              </Typography>
              <Typography variant="body2" color="grey.400" noWrap>
                {msg.text}
              </Typography>
            </Box>
            <Typography variant="caption" color="grey.500">{msg.time}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}

export default FamilyFeed;
