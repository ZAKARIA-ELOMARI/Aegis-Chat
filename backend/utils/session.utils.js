/**
 * Parse user agent string to extract device information
 * @param {string} userAgent - The user agent string from the request
 * @returns {object} Parsed device information
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };
  }

  try {
    const browser = getBrowserInfo(userAgent);
    const os = getOSInfo(userAgent);
    const device = getDeviceType(userAgent);
    
    return {
      browser,
      os,
      device
    };
  } catch (error) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };
  }
}

/**
 * Extract browser information from user agent
 * @param {string} userAgent - The user agent string
 * @returns {string} Browser name and version
 */
function getBrowserInfo(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('firefox')) {
    const match = userAgent.match(/Firefox\/([\d.]+)/);
    return `Firefox ${match ? match[1] : ''}`.trim();
  }
  
  if (ua.includes('chrome') && !ua.includes('edge')) {
    const match = userAgent.match(/Chrome\/([\d.]+)/);
    return `Chrome ${match ? match[1] : ''}`.trim();
  }
  
  if (ua.includes('safari') && !ua.includes('chrome')) {
    const match = userAgent.match(/Version\/([\d.]+)/);
    return `Safari ${match ? match[1] : ''}`.trim();
  }
  
  if (ua.includes('edge')) {
    const match = userAgent.match(/Edg\/([\d.]+)/);
    return `Edge ${match ? match[1] : ''}`.trim();
  }
  
  if (ua.includes('opera')) {
    const match = userAgent.match(/Opera\/([\d.]+)/);
    return `Opera ${match ? match[1] : ''}`.trim();
  }
  
  return 'Unknown Browser';
}

/**
 * Extract OS information from user agent
 * @param {string} userAgent - The user agent string
 * @returns {string} Operating system name
 */
function getOSInfo(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows nt 10')) return 'Windows 10/11';
  if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
  if (ua.includes('windows nt 6.2')) return 'Windows 8';
  if (ua.includes('windows nt 6.1')) return 'Windows 7';
  if (ua.includes('windows')) return 'Windows';
  
  if (ua.includes('mac os x')) {
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }
  
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Unknown OS';
}

/**
 * Determine device type from user agent
 * @param {string} userAgent - The user agent string
 * @returns {string} Device type
 */
function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'Mobile';
  }
  
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  }
  
  return 'Desktop';
}

/**
 * Get a human-readable description of the session
 * @param {object} session - Session object with deviceInfo
 * @returns {string} Human-readable session description
 */
function getSessionDescription(session) {
  const { browser, os, device } = session.deviceInfo || {};
  return `${browser || 'Unknown Browser'} on ${os || 'Unknown OS'} (${device || 'Unknown Device'})`;
}

/**
 * Check if two sessions are from the same device/browser
 * @param {object} session1 - First session
 * @param {object} session2 - Second session
 * @returns {boolean} True if sessions are from the same device
 */
function isSameDevice(session1, session2) {
  return session1.ipAddress === session2.ipAddress &&
         session1.userAgent === session2.userAgent;
}

module.exports = {
  parseUserAgent,
  getDeviceType,
  getSessionDescription,
  isSameDevice
};
