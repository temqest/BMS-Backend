const prisma = require('../../util/db');
const validate = require('../../util/validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const checkOtp = require('../../services/otpServices');
const { sendEmail } = require('../../services/sendProvider');
const { sendNotificationToUser: sendPushToUser } = require('../../services/pushNotificationService');

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

        if (!first_name || !last_name || !role || !password || !email) {
            return res.status(400).json({ error: 'Missing required staff details: first name, last name, role, email, and password are required.' });
        }

        const isSuper = req.user?.role === 'SystemAdmin' || req.user?.role === 'SuperAdmin';
        const allowedStaffRoles = ['Admin', 'Doctor', 'Nurse', 'Midwife', 'HealthWorker', 'Staff'];

        if (!allowedStaffRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid staff role specified' });
        }

        if (role === "Admin" && !isSuper && req.user?.role !== "Admin") {
            return res.status(403).json({ error: "Only Super Admin or Facility Admin can create an Admin account" });
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

        if (isSuper) {
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

const contactAdmin = async (req, res, next) => {
    try {
        const { adminEmail, senderName, senderEmail, senderPhone, senderContact, facilityName, subject, message, priority } = req.body;

        const effectiveSenderEmail = (senderEmail || senderContact || "").trim().toLowerCase();
        const trimmedAdminEmail = (adminEmail || "").trim().toLowerCase();
        const trimmedSenderName = (senderName || "").trim();
        const trimmedSenderPhone = (senderPhone || "").trim();
        const trimmedFacility = (facilityName || "").trim();
        const trimmedSubject = (subject || "Account & Access Assistance Request").trim();
        const trimmedMessage = (message || "").trim();
        const isUrgent = priority === "urgent";

        if (!trimmedAdminEmail || !trimmedSenderName || !effectiveSenderEmail || !trimmedMessage) {
            return res.status(400).json({ error: "Please fill in all required fields: Admin Email, Your Name, Your Email Address, and Message." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedAdminEmail)) {
            return res.status(400).json({ error: "Please enter a valid administrator email address." });
        }

        if (!emailRegex.test(effectiveSenderEmail)) {
            return res.status(400).json({ error: "Please enter a valid email address for yourself." });
        }

        const formattedSenderContact = trimmedSenderPhone
            ? `${effectiveSenderEmail} (Phone: ${trimmedSenderPhone})`
            : effectiveSenderEmail;

        const targetAdmin = await prisma.user.findFirst({
            where: {
                email: {
                    equals: trimmedAdminEmail,
                    mode: 'insensitive'
                }
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                role: true,
                email: true,
                facility_id: true
            }
        });

        let inSystemNotificationCreated = false;
        let createdNotification = null;

        if (targetAdmin) {
            createdNotification = await prisma.notification.create({
                data: {
                    user_id: targetAdmin.user_id,
                    notification_type: isUrgent ? 'URGENT_ADMIN_ASSISTANCE' : 'ADMIN_ASSISTANCE_REQUEST',
                    notification_message: `[${isUrgent ? 'URGENT ' : ''}Support Request] From ${trimmedSenderName} (${formattedSenderContact})${trimmedFacility ? ` [${trimmedFacility}]` : ''}: "${trimmedSubject} - ${trimmedMessage.slice(0, 120)}${trimmedMessage.length > 120 ? '...' : ''}"`,
                    notification_date: new Date()
                }
            });

            inSystemNotificationCreated = true;

            const socketService = req.socketService || require('../../services/socketService');
            if (socketService?.emitToUser) {
                socketService.emitToUser(targetAdmin.user_id, 'notification:new', createdNotification);
            }

            sendPushToUser(
                targetAdmin.user_id,
                `Support Request: ${trimmedSenderName}`,
                `${trimmedSubject} - ${trimmedMessage.slice(0, 100)}`,
                { notification_id: createdNotification.notification_id, type: 'ADMIN_SUPPORT' }
            ).catch((err) => {
                console.warn('[ContactAdmin] Push notification dispatch skipped:', err.message);
            });
        }

        const emailSubject = `[Pili Health Support${isUrgent ? ' - URGENT' : ''}] ${trimmedSubject} (From: ${trimmedSenderName})`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; color: #1e293b; background-color: #ffffff;">
                <div style="background-color: #003f2c; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">Pili Municipal Health Office</h2>
                    <p style="color: #94d3a2; margin: 4px 0 0; font-size: 13px;">Clinical Network & Access Administration</p>
                </div>
                <div style="padding: 24px 8px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <h3 style="color: #0f172a; margin: 0; font-size: 17px;">User Access Assistance Request</h3>
                        ${isUrgent ? '<span style="background-color: #fee2e2; color: #b91c1c; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid #fca5a5;">URGENT</span>' : ''}
                    </div>
                    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 0;">
                        A healthcare worker or facility staff member has submitted a request from the sign-in portal. Please review their details below:
                    </p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 10px; font-weight: bold; width: 150px; border-bottom: 1px solid #e2e8f0; color: #475569;">Requester Name:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${trimmedSenderName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Requester Email:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;"><a href="mailto:${effectiveSenderEmail}" style="color: #003f2c; text-decoration: underline;">${effectiveSenderEmail}</a></td>
                        </tr>
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Requester Phone:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${trimmedSenderPhone || 'Not provided (Optional)'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Facility / Station:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${trimmedFacility || 'Unspecified Facility'}</td>
                        </tr>
                        <tr style="background-color: #f8fafc;">
                            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Subject / Category:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${trimmedSubject}</td>
                        </tr>
                    </table>
                    <div style="background-color: #f1f5f9; padding: 18px; border-radius: 8px; border-left: 4px solid #003f2c; margin-top: 16px;">
                        <p style="margin: 0; font-weight: bold; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Message Content:</p>
                        <p style="margin: 8px 0 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${trimmedMessage}</p>
                    </div>
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
                    <p style="margin: 0;">Dispatched automatically from Pili Birth Monitoring & Clinical Portal</p>
                    <p style="margin: 4px 0 0;">${inSystemNotificationCreated ? 'An in-system notification was logged directly to your administrator dashboard.' : 'Administrator email was contacted directly.'}</p>
                </div>
            </div>
        `;

        let emailDispatched = false;
        try {
            await sendEmail(trimmedAdminEmail, trimmedMessage, emailSubject, { html: emailHtml, replyTo: effectiveSenderEmail });
            emailDispatched = true;
        } catch (emailErr) {
            console.error('[ContactAdmin] Failed to send email via Resend:', emailErr.message);
        }

        return res.status(200).json({
            message: "Assistance request processed successfully",
            emailSent: emailDispatched,
            inSystemNotificationSent: inSystemNotificationCreated,
            adminFound: Boolean(targetAdmin),
            adminName: targetAdmin ? `${targetAdmin.first_name} ${targetAdmin.last_name}` : null
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
    contactAdmin,
};