const User = require('../models/user.model');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// @desc   Generate a new 2FA secret for the logged-in user
// @route  POST /api/2fa/generate
// @access Private
// In twoFactor.controller.js

// In twoFactor.controller.js

exports.generateSecret = async (req, res) => {
    try {
        // 1. Generate a secret with a specific name for the authenticator app
        const secret = speakeasy.generateSecret({
            length: 20,
            name: `Aegis Chat (${req.user.username})` // This will show up in the user's app
        });

        // 2. Save the secret's base32 representation to the user in the database
        const user = await User.findByIdAndUpdate(
            req.user.sub,
            { twoFactorSecret: secret.base32 },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // 3. Manually construct the otpauth URL and generate the QR code
        // This is a more robust method than relying on the library's pre-built URL.
        qrcode.toDataURL(speakeasy.otpauthURL({
            secret: secret.ascii,
            label: `Aegis Chat (${user.email})`,
            issuer: 'Aegis Chat'
        }), (err, data_url) => {
            if (err) {
                console.error("QR Code generation failed:", err);
                return res.status(500).json({ message: 'Could not generate QR code.' });
            }
            // 4. Send the QR code to the user
            res.json({ qrCodeUrl: data_url });
        });
    } catch (error) {
        console.error("Error during 2FA secret generation:", error);
        res.status(500).json({ message: "Server error while generating 2FA secret." });
    }
};
// Add this entire function to twoFactor.controller.js

exports.verifyAndEnable = async (req, res) => {
    try {
        const { token } = req.body;
        // Use req.user.sub to identify the user from the JWT
        const user = await User.findById(req.user.sub);

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: "2FA secret not generated yet or user not found." });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1 // Add a window to account for time drift
        });

        if (verified) {
            user.isTwoFactorEnabled = true;
            await user.save();
            res.status(200).json({ message: "Two-factor authentication has been enabled successfully." });
        } else {
            res.status(400).json({ message: "Invalid 2FA token." });
        }
    } catch (error) {
        console.error("Error during 2FA verification:", error);
        res.status(500).json({ message: "Server error while verifying 2FA token." });
    }
};