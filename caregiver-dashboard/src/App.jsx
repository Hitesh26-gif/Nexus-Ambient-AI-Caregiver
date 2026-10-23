import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, AppBar, Toolbar,
  IconButton, Badge, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Avatar,
  Chip, Button, useMediaQuery,
} from '@mui/material';
import {
  Home, Favorite, Notifications, Medication, Map as MapIcon,
  Menu, Settings, Logout, Videocam, CheckCircle,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import LiveFeed from './components/LiveFeed';
import VitalMonitor from './components/VitalMonitor';
import AlertHistory from './components/AlertHistory';
import MedicationLog from './components/MedicationLog';
import MapView from './components/MapView';
import { MOCK_USER } from './api/mockData';

const NavButton = styled(Button)(({ active }) => ({
  borderRadius: 12,
  textAlign: 'left',
  padding: '12px 16px',
  backgroundColor: active ? 'rgba(99,102,241,0.2)' : 'transparent',
  color: active ? '#818cf8' : '#9ca3af',
  '&:hover': { backgroundColor: 'rgba(99,102,241,0.1)' },
}));

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [emergencyActive, setEmergencyActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavClick = (section) => {
    setActiveSection(section);
    if (isMobile) setMobileOpen(false);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home /> },
    { id: 'vitals', label: 'Vital Signs', icon: <Favorite /> },
    { id: 'alerts', label: 'Alert History', icon: <Notifications /> },
    { id: 'medication', label: 'Medications', icon: <Medication /> },
    { id: 'map', label: 'Activity Map', icon: <MapIcon /> },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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

      <List sx={{ px: 1, py: 2, flex: 1 }}>
        {navItems.map(item => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <NavButton
              fullWidth
              active={activeSection === item.id}
              onClick={() => handleNavClick(item.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ListItemIcon sx={{ minWidth: 36, color: activeSection === item.id ? 'primary.main' : 'grey.600' }}>
                  {item.icon}
                </ListItemIcon>
                {item.label}
              </Box>
            </NavButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.800' }}>
        <NavButton fullWidth onClick={() => console.log('Settings')}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'grey.600' }}><Settings /></ListItemIcon>
            Settings
          </Box>
        </NavButton>
        <NavButton fullWidth onClick={() => console.log('Sign out')}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ListItemIcon sx={{ minWidth: 36, color: 'grey.600' }}><Logout /></ListItemIcon>
            Sign Out
          </Box>
        </NavButton>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'vitals': return <VitalMonitor />;
      case 'alerts': return <AlertHistory />;
      case 'medication': return <MedicationLog />;
      case 'map': return <MapView />;
      default: return <LiveFeed emergencyActive={emergencyActive} />;
    }
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
        onClose={() => setMobileOpen(false)}
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
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{ display: { md: 'none' } }}
              >
                <Menu />
              </IconButton>
              <Typography variant="h6" fontWeight="800" letterSpacing={2}>
                NEXUS
              </Typography>
              <Chip
                label={emergencyActive ? "🚨 EMERGENCY" : "● LIVE"}
                size="small"
                color={emergencyActive ? "error" : "success"}
                sx={{ ml: 2 }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="grey.400" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <IconButton color="inherit">
                <Badge badgeContent={emergencyActive ? 3 : 0} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton color="inherit">
                <Videocam />
              </IconButton>
              <Avatar src={MOCK_USER.emergencyContact?.photoUrl} sx={{ width: 32, height: 32, border: '2px solid primary.main' }} />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Typography variant="h4" fontWeight="800" sx={{ mb: 1 }}>
            {navItems.find(n => n.id === activeSection)?.label || 'Overview'}
          </Typography>
          <Typography variant="body2" color="grey.500" sx={{ mb: 3 }}>
            Monitoring {MOCK_USER.name} · Last sync: just now
          </Typography>

          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}

export default App;
