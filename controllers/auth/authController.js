const prisma = require('../../util/db');
const validate = require('../../util/validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkOtp = require('../../services/otpServices');

const SYSTEM_ADMIN_BYPASS_CODE = process.env.BYPASSCODE;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable is missing.");
}

const register = async (req, res, next) => {
    try {
        const { first_name, middle_name, last_name, role, phone_number, email, password, address, facility_id, otp, bypassCode } = req.body;

        if (!first_name || !last_name || !role || (!email && !phone_number) || !password || !otp) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        const restrictedRoles = ['SystemAdmin', 'Admin', 'HealthWorker', 'Doctor', 'Nurse', 'Midwife', 'Staff'];

        if (restrictedRoles.includes(role)) {
            if (role === "SystemAdmin" || role === "Admin") {
                if (!SYSTEM_ADMIN_BYPASS_CODE || bypassCode !== SYSTEM_ADMIN_BYPASS_CODE) {
                    return res.status(403).json({ error: "Bypass code is invalid or missing for privileged accounts." });
                }
            } else {
                return res.status(403).json({ error: "Staff accounts must be created by a facility admin." });
            }
        }

        const duplicateCheckConditions = [];

        if (phone_number && phone_number.trim()) {
            duplicateCheckConditions.push({ phone_number: phone_number.trim() });
        }

        if (email && email.trim()) {
            duplicateCheckConditions.push({ email: email.trim() });
        }

        const existingUser = duplicateCheckConditions.length > 0 
            ? await prisma.user.findFirst({ where: { OR: duplicateCheckConditions } }) 
            : null;

        if (existingUser) {
            if (existingUser.role === 'Mother' && !existingUser.password) {
                const purpose = 'registration';
                const identifier = (email && email.trim()) ? email.trim() : (phone_number ? phone_number.trim() : '');

                const isValidOtp = await checkOtp.verifyOTP(identifier, otp, purpose);

                if (!isValidOtp) {
                    return res.status(400).json({ error: "Invalid OTP code" });
                }

                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(password, salt);

                const updatedUser = await prisma.user.update({
                    where: { user_id: existingUser.user_id },
                    data: {
                        first_name: first_name ? first_name.trim() : existingUser.first_name,
                        last_name: last_name ? last_name.trim() : existingUser.last_name,
                        phone_number: phone_number ? phone_number.trim() : existingUser.phone_number,
                        email: email ? email.trim() : existingUser.email,
                        address: (address && address.trim()) ? address.trim() : existingUser.address,
                        password: hashedPassword,
                    }
                });

                const token = jwt.sign(
                    { user_id: updatedUser.user_id, role: updatedUser.role, facility_id: updatedUser.facility_id },
                    JWT_SECRET,
                    { expiresIn: "30d" }
                );

                return res.status(200).json({
                    message: "Account setup completed successfully",
                    token: token,
                    user: {
                        user_id: updatedUser.user_id,
                        first_name: updatedUser.first_name,
                        middle_name: updatedUser.middle_name || "",
                        last_name: updatedUser.last_name,
                        role: updatedUser.role,
                        facility_id: updatedUser.facility_id,
                    },
                });
            }

            return res.status(400).json({ error: 'Phone number or email already registered' });
        }

        const purpose = 'registration';
        const identifier = email ? email : phone_number;

        const isValidOtp = await checkOtp.verifyOTP(identifier, otp, purpose);

        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid OTP code" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    first_name,
                    middle_name: middle_name || undefined,
                    last_name,
                    role,
                    phone_number,
                    email: email || undefined,
                    password: hashedPassword,
                    address: (address && address.trim()) ? address.trim() : "Not specified",
                    facility_id: facility_id || undefined,
                    sync_status: 'synced',
                },
            });

            if (role === "Mother") {
                await tx.mother.create({
                    data: {
                        user_id: newUser.user_id,
                        birth_date: new Date("1995-01-01"),
                        civil_status: "Single",
                        blood_type: "Unknown",
                        sync_status: "synced",
                    }
                });
            }

            return newUser;
        });

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, facility_id: user.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        let facilityName = "";

        if (facility_id) {
            const facility = await prisma.facility.findUnique({
                where: { facility_id }
            });
            if (facility) {
                facilityName = facility.facility_name;
            }
        }

        return res.status(201).json({
            message: "Account registered succesfully",
            token: token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                middle_name: user.middle_name || "",
                last_name: user.last_name,
                role: user.role,
                facility_id: user.facility_id,
            },
        });

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: "Please enter your email/phone and password" });
        }

        const cleanIdentifier = identifier.trim();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone_number: cleanIdentifier },
                    { email: { equals: cleanIdentifier, mode: 'insensitive' } },
                ],
                is_active: true
            },
            include: { facility: true },
        });

        if (!user) {
            return res.status(401).json({ error: "User account not found" });
        }

        if (!user.password) {
            return res.status(400).json({
                error: "PASSWORD_NOT_SET",
                message: "Account exists but password is not set yet. Verify OTP first.",
                requiresPasswordSetup: true,
                identifier: user.email || user.phone_number || cleanIdentifier
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ error: "Incorrect password, please try again" });
        }

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, facility_id: user.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(200).json({
            message: "Login Successful",
            token: token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                role: user.role,
                facility_id: user.facility ? user.facility.facility_id : null,
            },
        });

    } catch (error) {
        next(error);
    }
};

const setupPassword = async (req, res, next) => {
    try {
        const { identifier, otp, newPassword } = req.body;

        if (!identifier || !otp || !newPassword) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const cleanIdentifier = identifier.trim();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone_number: cleanIdentifier },
                    { email: { equals: cleanIdentifier, mode: 'insensitive' } },
                ],
                is_active: true
            },
            include: { facility: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User account not found" });
        }

        const purpose = 'registration';
        let isValidOtp = await checkOtp.verifyOTP(cleanIdentifier, otp, purpose);
        if (!isValidOtp) {
            isValidOtp = await checkOtp.verifyOTP(cleanIdentifier, otp, 'reset_password');
        }

        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid OTP code" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updatedUser = await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                password: hashedPassword
            }
        });

        const token = jwt.sign(
            { user_id: updatedUser.user_id, role: updatedUser.role, facility_id: updatedUser.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(200).json({
            message: "Password set successfully. Account activated.",
            token: token,
            user: {
                user_id: updatedUser.user_id,
                first_name: updatedUser.first_name,
                middle_name: updatedUser.middle_name || "",
                last_name: updatedUser.last_name,
                role: updatedUser.role,
                facility_id: user.facility ? user.facility.facility_id : null,
            }
        });

    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { identifier, otp, newPassword } = req.body;

        if (!identifier || !otp || !newPassword) {
            return res.status(400).json({ error: "Please enter identifier, OTP and new password" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        const cleanIdentifier = identifier.trim();

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone_number: cleanIdentifier },
                    { email: { equals: cleanIdentifier, mode: 'insensitive' } },
                ],
                is_active: true
            },
            include: { facility: true }
        });

        if (!user) {
            return res.status(404).json({ error: "No account found with this email or phone" });
        }

        let isValidOtp = await checkOtp.verifyOTP(cleanIdentifier, otp, 'reset_password');
        if (!isValidOtp) {
            isValidOtp = await checkOtp.verifyOTP(cleanIdentifier, otp, 'registration');
        }

        if (!isValidOtp) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const updatedUser = await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                password: hashedPassword
            }
        });

        const token = jwt.sign(
            { user_id: updatedUser.user_id, role: updatedUser.role, facility_id: updatedUser.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(200).json({
            message: "Password reset successfully!",
            token: token,
            user: {
                user_id: updatedUser.user_id,
                first_name: updatedUser.first_name,
                middle_name: updatedUser.middle_name || "",
                last_name: updatedUser.last_name,
                role: updatedUser.role,
                email: updatedUser.email || "",
                phone_number: updatedUser.phone_number || "",
                address: updatedUser.address || "",
                facility_id: user.facility ? user.facility.facility_id : null,
                facility_name: user.facility ? user.facility.facility_name : "",
                profile_url: updatedUser.profile_url || null,
            }
        });

    } catch (error) {
        next(error);
    }
};

const createStaff = async (req, res, next) => {
    try {
        const { first_name, middle_name, last_name, role, phone_number, email, password, address, facility_id } = req.body;

        if (!first_name || !last_name || !role || !password) {
            return res.status(400).json({ error: 'Missing required staff details' });
        }

        const allowedStaffRoles = ['Admin', 'Doctor', 'Nurse', 'Midwife', 'HealthWorker', 'Staff'];

        if (!allowedStaffRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid staff role specified' });
        }

        if (role === "Admin" && req.user?.role !== "Admin") {
            return res.status(403).json({ error: "Only Admin can create another Admin" });
        }

        const sanitizedPhone = phone_number && typeof phone_number === 'string' && phone_number.trim() !== '' ? phone_number.trim() : null;
        const sanitizedEmail = email && typeof email === 'string' && email.trim() !== '' ? email.trim().toLowerCase() : null;

        if (sanitizedPhone || sanitizedEmail) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        sanitizedPhone ? { phone_number: sanitizedPhone } : undefined,
                        sanitizedEmail ? { email: sanitizedEmail } : undefined,
                    ].filter(Boolean)
                }
            });

            if (existingUser) {
                return res.status(400).json({ error: 'Phone number or email is already registered' });
            }
        }

        let targetFacilityId = req.user?.facility_id || null;

        if (req.user?.role === 'SystemAdmin') {
            targetFacilityId = facility_id || req.user?.facility_id || null;
        } else if (facility_id && facility_id !== req.user?.facility_id) {
            return res.status(403).json({ error: "Cannot assign staff to a different facility." });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const staffUser = await prisma.user.create({
            data: {
                first_name: first_name.trim(),
                middle_name: middle_name ? middle_name.trim() : null,
                last_name: last_name.trim(),
                role,
                phone_number: sanitizedPhone,
                email: sanitizedEmail,
                password: hashedPassword,
                address: address || '',
                facility_id: targetFacilityId,
                sync_status: 'synced',
            },
        });

        let facilityName = "";

        if (targetFacilityId) {
            const facility = await prisma.facility.findUnique({
                where: { facility_id: targetFacilityId }
            });
            if (facility) {
                facilityName = facility.facility_name;
            }
        }

        return res.status(201).json({
            message: "Staff account created successfully",
            user: {
                user_id: staffUser.user_id,
                first_name: staffUser.first_name,
                middle_name: staffUser.middle_name || "",
                last_name: staffUser.last_name,
                role: staffUser.role,
                email: staffUser.email,
                phone_number: staffUser.phone_number,
                facility_name: facilityName,
            },
        });

    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user_id = req.user?.user_id;

        if (!user_id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters long" });
        }

        const user = await prisma.user.findUnique({
            where: { user_id }
        });

        if (!user) {
            return res.status(404).json({ error: "User account not found" });
        }

        if (user.password) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "Incorrect current password" });
            }
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { user_id },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            message: "Password updated successfully!"
        });

    } catch (error) {
        next(error);
    }
};

const googleAuth = async (req, res, next) => {
    try {
        const { idToken, accessToken, access_token, role: requestedRole, is_signup, auto_register, address: bodyAddress } = req.body;

        const effectiveAccessToken = accessToken || access_token;

        if (!idToken && !effectiveAccessToken) {
            return res.status(401).json({ error: "Google authentication token is missing." });
        }

        let verifiedEmail = null;
        let firstName = "Google";
        let lastName = "User";
        let profileUrl = null;

        if (idToken) {
            try {
                const { OAuth2Client } = require('google-auth-library');
                const googleClientId = process.env.GOOGLE_CLIENT_ID;
                const client = new OAuth2Client(googleClientId);
                
                const validAudiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
                const ticket = await client.verifyIdToken({
                    idToken: idToken,
                    audience: validAudiences.length > 0 ? validAudiences : undefined,
                });
                const payload = ticket.getPayload();

                if (payload && payload.email) {
                    verifiedEmail = payload.email;
                    firstName = payload.given_name || firstName;
                    lastName = payload.family_name || lastName;
                    profileUrl = payload.picture || profileUrl;
                }
            } catch (tokenErr) {
                console.warn("[GoogleAuth] Google idToken verification failed with google-auth-library:", tokenErr.message);

                try {
                    const { getAuth, initFirebase } = require('../../services/firebaseService');
                    const app = initFirebase();
                    if (app) {
                        const decoded = await getAuth(app).verifyIdToken(idToken);
                        if (decoded && decoded.email) {
                            verifiedEmail = decoded.email;
                            firstName = decoded.name?.split(' ')[0] || firstName;
                            lastName = decoded.name?.split(' ').slice(1).join(' ') || lastName;
                            profileUrl = decoded.picture || profileUrl;
                        }
                    }
                } catch (fbErr) {
                    console.warn("[GoogleAuth] Firebase idToken verification failed:", fbErr.message);
                }
            }
        }

        if (!verifiedEmail && effectiveAccessToken) {
            try {
                const fetchRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${effectiveAccessToken}` }
                });
                if (fetchRes.ok) {
                    const googleUser = await fetchRes.json();
                    if (googleUser && googleUser.email && googleUser.email_verified !== false) {
                        verifiedEmail = googleUser.email;
                        firstName = googleUser.given_name || googleUser.name || firstName;
                        lastName = googleUser.family_name || lastName;
                        profileUrl = googleUser.picture || profileUrl;
                    }
                } else {
                    console.warn(`[GoogleAuth] Google userinfo API status: ${fetchRes.status}`);
                }
            } catch (fetchErr) {
                console.warn("[GoogleAuth] Failed to verify access token:", fetchErr.message);
            }
        }

        if (!verifiedEmail) {
            return res.status(401).json({ error: "Invalid or expired Google token." });
        }

        const cleanEmail = verifiedEmail.trim().toLowerCase();

        let user = await prisma.user.findFirst({
            where: {
                email: { equals: cleanEmail, mode: 'insensitive' }
            },
            include: { facility: true }
        });

        const targetRole = requestedRole || (is_signup ? "Mother" : undefined);

        if (!user) {
            if (targetRole === "Mother" || is_signup || auto_register) {
                user = await prisma.$transaction(async (tx) => {
                    const newUser = await tx.user.create({
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            email: cleanEmail,
                            role: "Mother",
                            address: bodyAddress || "Not specified",
                            profile_url: profileUrl,
                            is_active: true,
                            sync_status: "synced",
                        },
                        include: { facility: true }
                    });

                    await tx.mother.create({
                        data: {
                            user_id: newUser.user_id,
                            birth_date: new Date("1995-01-01"),
                            civil_status: "Single",
                            blood_type: "Unknown",
                            sync_status: "synced",
                        }
                    });

                    return newUser;
                });
            } else {
                return res.status(404).json({
                    error: "ACCOUNT_NOT_FOUND",
                    message: "No account found for this Google email."
                });
            }
        }

        if (profileUrl && !user.profile_url) {
            user = await prisma.user.update({
                where: { user_id: user.user_id },
                data: { profile_url: profileUrl },
                include: { facility: true }
            });
        }

        if (user.role === "Mother") {
            let mother = await prisma.mother.findUnique({
                where: { user_id: user.user_id }
            });

            if (!mother) {
                await prisma.mother.create({
                    data: {
                        user_id: user.user_id,
                        birth_date: new Date("1995-01-01"),
                        civil_status: "Single",
                        blood_type: "Unknown",
                    }
                });
            }
        }

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, facility_id: user.facility_id },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        let facilityName = user.facility ? user.facility.facility_name : "";
        if (!facilityName && user.facility_id) {
            const facility = await prisma.facility.findUnique({
                where: { facility_id: user.facility_id }
            });
            if (facility) {
                facilityName = facility.facility_name;
            }
        }

        return res.status(200).json({
            message: "Google authentication successful",
            token: token,
            user: {
                user_id: user.user_id,
                first_name: user.first_name,
                middle_name: user.middle_name || "",
                last_name: user.last_name,
                role: user.role,
                email: user.email,
                phone_number: user.phone_number || "",
                address: user.address,
                facility_id: user.facility_id,
                facility_name: facilityName,
                profile_url: user.profile_url,
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    setupPassword,
    resetPassword,
    createStaff,
    changePassword,
    googleAuth,
};