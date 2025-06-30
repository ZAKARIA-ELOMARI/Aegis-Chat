const User = require('../models/user.model');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// @desc   Generate a new 2FA secret for the logged-in user
// @route  POST /api/2fa/generate
// @access Private
exports.generateSecret = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: `Aegis Chat (${req.user.username})`, // Shows up in the user's authenticator app
        });

        // Save the temporary secret to the user's document
        await User.findByIdAndUpdate(req.user.id, { twoFactorSecret: secret.base32 });

        // Generate a QR code for the user to scan
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) throw new Error('Could not generate QR code.');
            res.json({ secret: secret.base32, qrCodeUrl: data_url });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while generating 2FA secret." });
    }
};

// @desc   Verify a 2FA token and enable 2FA for the user
// @route  POST /api/2fa/verify
// @access Private
exports.verifyAndEnable = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA secret not generated yet." });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
        });

        if (verified) {
            // If token is valid, permanently enable 2FA
            user.isTwoFactorEnabled = true;
            await user.save();
            res.json({ message: "Two-factor authentication has been enabled successfully." });
        } else {
            res.status(400).json({ message: "Invalid 2FA token." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while verifying 2FA token." });
    }
};