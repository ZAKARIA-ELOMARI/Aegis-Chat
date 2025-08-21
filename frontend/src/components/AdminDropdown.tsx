// src/components/AdminDropdown.tsx
import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SecurityIcon from '@mui/icons-material/Security';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useNavigate } from 'react-router-dom';

interface AdminDropdownProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
}

const AdminDropdown: React.FC<AdminDropdownProps> = ({ anchorEl, open, onClose }) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const adminMenuItems = [
    {
      icon: <GroupIcon />,
      label: 'User Management',
      path: '/admin/users',
      description: 'Manage users and permissions'
    },
    {
      icon: <GroupIcon />,
      label: 'Role Management',
      path: '/admin/roles',
      description: 'Configure user roles'
    },
    {
      icon: <ListAltIcon />,
      label: 'System Logs',
      path: '/admin/logs',
      description: 'View system activity'
    },
    {
      icon: <SecurityIcon />,
      label: 'Security Alerts',
      path: '/admin/security',
      description: 'Monitor security events'
    },
    {
      icon: <CampaignIcon />,
      label: 'Broadcast Message',
      path: '/admin/broadcast',
      description: 'Send system-wide messages'
    }
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiPaper-root': {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '280px',
          mt: 1,
        }
      }}
      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(66, 51, 43, 0.08)' }}>
        <Typography variant="subtitle2" fontWeight={650} color="var(--color-mondo)">
          Admin Panel
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          Administrative controls
        </Typography>
      </Box>
      
      {adminMenuItems.map((item, index) => (
        <MenuItem
          key={index}
          onClick={() => handleNavigation(item.path)}
          sx={{
            py: 1.5,
            px: 2,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              background: 'rgba(142, 82, 57, 0.05)',
              transform: 'translateX(4px)',
            }
          }}
        >
          <ListItemIcon sx={{ color: 'var(--color-potters-clay)', minWidth: '36px' }}>
            {item.icon}
          </ListItemIcon>
          <Box>
            <ListItemText 
              primary={item.label}
              secondary={item.description}
              primaryTypographyProps={{
                fontWeight: 550,
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)'
              }}
            />
          </Box>
        </MenuItem>
      ))}
    </Menu>
  );
};

export default AdminDropdown;
