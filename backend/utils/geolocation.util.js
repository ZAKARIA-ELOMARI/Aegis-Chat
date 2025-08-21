const axios = require('axios');
const logger = require('../config/logger');

/**
 * Get location information from IP address using a free geolocation service
 * @param {string} ip - IP address to lookup
 * @returns {object} Location information
 */
async function getLocationFromIP(ip) {
    try {
        // Skip localhost and private IPs
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            return {
                country: 'Local',
                region: 'Local Network',
                city: 'Localhost',
                timezone: 'Local',
                isp: 'Local Network'
            };
        }

        // Use ip-api.com (free service, no API key required)
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,timezone,isp,query`, {
            timeout: 5000
        });

        if (response.data.status === 'success') {
            return {
                country: response.data.country || 'Unknown',
                region: response.data.regionName || 'Unknown',
                city: response.data.city || 'Unknown',
                timezone: response.data.timezone || 'Unknown',
                isp: response.data.isp || 'Unknown'
            };
        } else {
            logger.warn('Geolocation lookup failed', { ip, error: response.data.message });
            return getDefaultLocation();
        }
    } catch (error) {
        logger.warn('Error during IP geolocation lookup', { 
            ip, 
            error: error.message 
        });
        return getDefaultLocation();
    }
}

/**
 * Get default location when geolocation fails
 * @returns {object} Default location object
 */
function getDefaultLocation() {
    return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
        isp: 'Unknown'
    };
}

/**
 * Format location for display
 * @param {object} location - Location object
 * @returns {string} Formatted location string
 */
function formatLocation(location) {
    if (!location) return 'Unknown';
    
    const parts = [];
    if (location.city && location.city !== 'Unknown') parts.push(location.city);
    if (location.region && location.region !== 'Unknown') parts.push(location.region);
    if (location.country && location.country !== 'Unknown') parts.push(location.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Unknown';
}

/**
 * Get the real IP address from request, handling proxies
 * @param {object} req - Express request object
 * @returns {string} Real IP address
 */
function getRealIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           'Unknown';
}

module.exports = {
    getLocationFromIP,
    formatLocation,
    getRealIP,
    getDefaultLocation
};
