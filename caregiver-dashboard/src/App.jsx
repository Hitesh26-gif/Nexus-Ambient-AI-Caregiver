import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, AppBar, Toolbar,
  IconButton, Badge, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider, Avatar,
  Chip, Button, Collapse, Card, CardContent,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Alert,
  Tab, Tabs, useMediaQuery,
} from '@mui/material';
import {
  Home, Favorite, Notifications, Medication, Map as MapIcon,
  Menu, Person, Settings, Logout, VideoCall,
  Warning as AlertIcon, CheckCircle, TrendingUp,
  ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import LiveFeed from './components/LiveFeed';
import VitalMonitor from './components/VitalMonitor';
import AlertHistory from './components/AlertHistory';
import MedicationLog from './components/MedicationLog';
import MapView from './components/MapView';
import { MOCK_USER, CARE_REPORTS } from './api/mockData';

// ─── Styles ───────────────────────────────────────────────────────────────────
const NavButton = styled(Button)(({ active }) => ({
  borderRadius: 12,
  textAlign: 'left',
  padding: '12px 16px',
  backgroundColor: active ? 'rgba(99,102,241,0.2)' : 'transparent',
  color: active ? '#818cf8' : '#9ca3af',
  '&:hover': { backgroundColor: 'rgba(99,102,241,0.1)' },
}));

const StatCard = styled(Paper)(({ color }) => ({
  padding: '20px',
  background: `linear-gradient(135deg, ${color}15, ${color}05)`,
  border: `1px solid ${color}30`,
}));

const SECTION_COLORS = {
  vitals: '#10b981',
  alerts: '#ef4444',
  medication: '#f59e0b',
  map: '#6366f1',
};

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [emergencyActive, setEmergencyActive] = useState(true); // Demo starts with emergency
  const [emergencyExpanded, setEmergencyExpanded] = useState(true);
  const [reports] = useState(CARE_REPORTS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const isMobile = useMediaQuery('(max-width:900px)');

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate emergency auto-dismiss after demo period
  useEffect(() => {
    if (emergencyActive) {
      const timer = setTimeout(() => {
        setEmergencyActive(false);
        showSnackbar('Emergency resolved — help arrived safely.', 'success');
      }, 45000); // 45 seconds for demo
      return () => clearTimeout(timer);
    }
  }, [emergencyActive]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNavClick = (section) => {
    setActiveSection(section);
    if (isMobile) setMobileOpen(false);
  };

  const handleDismissEmergency = () => {
    setEmergencyActive(false);
    showSnackbar('Emergency acknowledged. All clear.', 'success');
  };

  // Navigation items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'vitals', label: 'Vital Signs', icon: <Favorite /> },
    { id: 'alerts', label: 'Alert History', icon: <Notifications /> },
    { id: 'medication', label: 'Medications', icon: <Medication /> },
    { id: 'map', label: 'Activity Map', icon: <MapIcon /> },
  ];

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.800' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'primary.main', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1rem',
          }}>N</Box>
          <Typography variant="h6" fontWeight="800" letterSpacing={2}>
            NEXUS
          </Typography>
        </Box>
        <Typography variant="caption" color="grey.500">
          Ambient AI Caregiver
        </Typography>
      </Box>

      {/* Patient profile */}
      <Box sx={{ p: 2, mx: 2, mt: 2, bgcolor: 'grey.900', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={MOCK_USER.photo} sx={{ width: 40, height: 40 }} />
          <Box>
            <Typography variant="body2" fontWeight="600">{MOCK_USER.name}</Typography>
            <Typography variant="caption" color="grey.500">
              {MOCK_USER.age} yrs · {MOCK_USER.status === 'stable' ? 'All Well' : 'Monitoring'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1, py: 2, flex: 1 }}>
        {navItems.map(item => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <NavButton
              fullWidth
              active={activeSection === item.id}
              onClick={() => handleNavClick(item.id)}
              startIcon={
                <Box sx={{ color: activeSection === item.id ? 'primary.main' : 'grey.600' }}>
                  {item.icon}
                </Box>
              }
            >
              {item.label}
              {item.id === 'alerts' && (
                <Badge badgeContent={2} color="error" sx={{ ml: 1 }}>
                  <Chip size="small" />
                </Badge>
              )}
            </NavButton>
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.800' }}>
        <NavButton fullWidth startIcon={<Settings />} onClick={() => showSnackbar('Settings coming soon', 'info')}>
          Settings
        </NavButton>
        <NavButton fullWidth startIcon={<Logout />} onClick={() => showSnackbar('Logged out', 'info')}>
          Sign Out
        </NavButton>
      </Box>
    </Box>
  );

  // ─── Section Renderers ──────────────────────────────────────────────────────
  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Emergency Banner */}
      {emergencyActive && (
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              bgcolor: 'rgba(239,68,68,0.1)',
              border: '2px solid',
              borderColor: 'error.main',
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  bgcolor: 'error.main', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 1.5s infinite',
                }}>
                  <AlertIcon color="white" />
                </Box>
                <Box>
                  <Typography variant="h5" color="error.main" fontWeight="800">
                    FALL DETECTED
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    Kitchen · 2 minutes ago · Confidence: 94.7%
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleDismissEmergency}
                startIcon={<CheckCircle />}
              >
                Resolve
              </Button>
            </Box>
          </Paper>
        </Grid>
      )}

      {/* Key Stats */}
      <Grid item xs={12} md={3}>
        <StatCard color={SECTION_COLORS.vitals}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="grey.500">Heart Rate</Typography>
              <Typography variant="h3" fontWeight="800" color="success.main">72</Typography>
              <Typography variant="caption" color="grey.500">bpm · Normal</Typography>
            </Box>
            <Favorite color="success" sx={{ fontSize: 40 }} />
          </Box>
        </StatCard>
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard color={SECTION_COLORS.alerts}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="grey.500">Alerts Today</Typography>
              <Typography variant="h3" fontWeight="800" color="error.main">1</Typography>
              <Typography variant="caption" color="grey.500">1 fall resolved</Typography>
            </Box>
            <Notifications color="error" sx={{ fontSize: 40 }} />
          </Box>
        </StatCard>
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard color={SECTION_COLORS.medication}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="grey.500">Meds Compliance</Typography>
              <Typography variant="h3" fontWeight="800" color="warning.main">98%</Typography>
              <Typography variant="caption" color="grey.500">This week</Typography>
            </Box>
            <Medication color="warning" sx={{ fontSize: 40 }} />
          </Box>
        </StatCard>
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard color={SECTION_COLORS.map}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="grey.500">Caregiver</Typography>
              <Typography variant="h5" fontWeight="700" color="primary.light">Mark M.</Typography>
              <Typography variant="caption" color="grey.500">Online · 200 mi away</Typography>
            </Box>
            <Person color="primary" sx={{ fontSize: 40 }} />
          </Box>
        </StatCard>
      </Grid>

      {/* Main Content Grid */}
      <Grid item xs={12} md={7}>
        <LiveFeed emergencyActive={emergencyActive} onDismiss={handleDismissEmergency} />
      </Grid>
      <Grid item xs={12} md={5}>
        <Grid container spacing={3} sx={{ height: '100%' }}>
          <Grid item xs={12}>
            <MedicationLog />
          </Grid>
          <Grid item xs={12}>
            <MapView />
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <AlertHistory />
      </Grid>
    </Grid>
  );

  const renderVitals = () => <VitalMonitor />;
  const renderAlerts = () => <AlertHistory />;
  const renderMedication = () => <MedicationLog />;
  const renderMap = () => <MapView />;

  const sectionRenderers = {
    overview: renderOverview,
    vitals: renderVitals,
    alerts: renderAlerts,
    medication: renderMedication,
    map: renderMap,
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0a0f' }}>
      {/* Desktop Sidebar */}
      <Box
        sx={{
          width: 260, flexShrink: 0,
          bgcolor: '#0d0d14', borderRight: '1px solid', borderColor: 'grey.800',
          display: { xs: 'none', md: 'block' },
          position: 'fixed', height: '100vh', overflow: 'auto',
        }}
      >
        {drawer}
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 260, bgcolor: '#0d0d14' },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, ml: { md: 260 }, minHeight: '100vh' }}>
        {/* Top Bar */}
        <AppBar
          position="sticky"
          sx={{
            bgcolor: 'rgba(13,13,20,0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid',
            borderColor: 'grey.800',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{ display: { md: 'none' } }}
              >
                <Menu />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: 'primary.main', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '0.8rem',
                }}>N</Box>
                <Typography variant="h6" fontWeight="800" letterSpacing={2} sx={{ display: { xs: 'none', sm: 'block' } }}>
                  NEXUS
                </Typography>
              </Box>
              <Chip
                label={emergencyActive ? "🚨 EMERGENCY" : "● LIVE"}
                size="small"
                color={emergencyActive ? "error" : "success"}
                sx={{ ml: 2 }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="grey.400" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Typography>
              <IconButton color="inherit">
                <Badge badgeContent={emergencyActive ? 3 : 0} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton color="inherit">
                <VideoCall />
              </IconButton>
              <Avatar src={MOCK_USER.emergencyContact.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} sx={{ width: 32, height: 32, border: '2px solid primary.main' }} />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          {/* Page Title */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight="800">
              {navItems.find(n => n.id === activeSection)?.label || 'Overview'}
            </Typography>
            <Typography variant="body2" color="grey.500">
              Monitoring Ruth Martinez · Last sync: just now
            </Typography>
          </Box>

          {/* Section Content */}
          {sectionRenderers[activeSection]?.()}
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </Box>
  );
}

export default App;
