/**
 * AutoBazaar — server.js
 * Node.js + Express + MongoDB (Mongoose) Backend
 *
 * === SETUP INSTRUCTIONS ===
 * 1. Install dependencies:
 *    npm init -y
 *    npm install express mongoose bcryptjs jsonwebtoken cors dotenv
 *
 * 2. Create a .env file in the same directory:
 *    PORT=5000
 *    MONGO_URI=mongodb://localhost:27017/autobazaar
 *    JWT_SECRET=your_super_secret_key_here_change_this
 *
 *    For MongoDB Atlas (cloud), use:
 *    MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/autobazaar?retryWrites=true&w=majority
 *
 * 3. Run:
 *    node server.js   OR   nodemon server.js
 *
 * 4. Server starts on http://localhost:5000
 * ==========================================
 */

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autobazaar';
const JWT_SECRET = process.env.JWT_SECRET || 'autobazaar_dev_secret_change_me';

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html from same folder

// ---- DEBUG: log every incoming request ----
app.use((req, res, next) => {
    console.log(`📥  ${req.method} ${req.path}`, req.body || '');
    next();
});

// =============================================
// DATABASE CONNECTION
// =============================================
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log(`✅ MongoDB connected: ${MONGO_URI}`);
        seedVehicles(); // Seed sample data on first run
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('⚠️  Running without DB — endpoints will return errors.');
    });

// =============================================
// SCHEMAS & MODELS
// =============================================

// ----- User -----
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

// ----- Vehicle -----
const vehicleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, enum: ['car', 'bike', 'scooter', 'truck'], required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    year: { type: Number, required: true },
    km: { type: Number, required: true },
    fuel: { type: String, default: 'Petrol' },
    transmission: { type: String, default: 'Manual' },
    color: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    location: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// ----- Appointment -----
const appointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    vehicleId: { type: String, required: true },
    vehicleName: { type: String, default: '' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// =============================================
// JWT MIDDLEWARE
// =============================================
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch { /* ignore */ }
    }
    next();
}

// =============================================
// HELPER: sign token
// =============================================
function signToken(user) {
    return jwt.sign(
        { _id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// =============================================
// ROUTES
// =============================================

// ----- Health Check -----
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// AUTH ROUTES
// =============================================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ message: 'Name, email, and password are required.' });

        if (password.length < 8)
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists)
            return res.status(409).json({ message: 'An account with this email already exists.' });

        const user = await User.create({ name, email, phone, password });
        const token = signToken(user);

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required.' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ message: 'No account found with this email.' });

        const valid = await user.comparePassword(password);
        if (!valid)
            return res.status(401).json({ message: 'Incorrect password.' });

        const token = signToken(user);

        res.json({
            message: 'Login successful!',
            token,
            user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET /api/auth/me — get current user info
app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// =============================================
// VEHICLE ROUTES
// =============================================

// GET /api/vehicles — list all vehicles (with optional filters)
app.get('/api/vehicles', async (req, res) => {
    try {
        const { category, maxPrice, minPrice, search, limit = 50, page = 1 } = req.query;
        const query = {};

        if (category) query.category = category;
        if (maxPrice || minPrice) {
            query.price = {};
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
            if (minPrice) query.price.$gte = parseInt(minPrice);
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [vehicles, total] = await Promise.all([
            Vehicle.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Vehicle.countDocuments(query)
        ]);

        res.json({ vehicles, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('Vehicles error:', err);
        res.status(500).json({ message: 'Server error fetching vehicles.' });
    }
});

// GET /api/vehicles/:id — single vehicle
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/vehicles — add a vehicle (admin only)
app.post('/api/vehicles', authenticate, async (req, res) => {
    try {
        const vehicle = await Vehicle.create({ ...req.body, seller: req.user._id });
        res.status(201).json(vehicle);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// =============================================
// APPOINTMENT ROUTES
// =============================================

// POST /api/appointments — book an appointment
app.post('/api/appointments', optionalAuth, async (req, res) => {
    try {
        const { name, email, phone, vehicleId, vehicleName, date, time, location, notes } = req.body;

        if (!name || !email || !phone || !vehicleId || !date || !time)
            return res.status(400).json({ message: 'Required fields: name, email, phone, vehicleId, date, time.' });

        // Prevent duplicate booking (same email + vehicle + date)
        const duplicate = await Appointment.findOne({ email: email.toLowerCase(), vehicleId, date });
        if (duplicate)
            return res.status(409).json({ message: 'You already have an appointment for this vehicle on this date.' });

        const appointment = await Appointment.create({
            userId: req.user?._id || null,
            vehicleId,
            vehicleName: vehicleName || vehicleId,
            name,
            email: email.toLowerCase(),
            phone,
            date,
            time,
            location: location || '',
            notes: notes || '',
            status: 'pending'
        });

        res.status(201).json({
            message: 'Appointment booked successfully!',
            appointment
        });
    } catch (err) {
        console.error('Appointment error:', err);
        res.status(500).json({ message: 'Server error booking appointment.' });
    }
});

// GET /api/appointments/mine — current user's appointments
app.get('/api/appointments/mine', authenticate, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ appointments });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/appointments — all appointments (admin only)
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin')
            return res.status(403).json({ message: 'Admin access required.' });

        const appointments = await Appointment.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');

        res.json({ appointments, total: appointments.length });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/appointments/:id/status — update appointment status
app.patch('/api/appointments/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ message: 'Invalid status value.' });

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

        // Allow owner or admin
        const isOwner = appointment.userId?.toString() === req.user._id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin)
            return res.status(403).json({ message: 'Not authorized.' });

        appointment.status = status;
        await appointment.save();
        res.json({ message: 'Status updated.', appointment });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE /api/appointments/:id — cancel appointment
app.delete('/api/appointments/:id', authenticate, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });

        const isOwner = appointment.userId?.toString() === req.user._id;
        if (!isOwner && req.user.role !== 'admin')
            return res.status(403).json({ message: 'Not authorized.' });

        await appointment.deleteOne();
        res.json({ message: 'Appointment cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// =============================================
// SEED VEHICLES (runs once if collection empty)
// =============================================
async function seedVehicles() {
    try {
        const count = await Vehicle.countDocuments();
        if (count > 0) {
            console.log(`📦 ${count} vehicles already in DB — skipping seed.`);
            return;
        }

        const sampleVehicles = [
            { title: 'Honda City VX', category: 'car', brand: 'Honda', price: 695000, year: 2019, km: 42000, fuel: 'Petrol', transmission: 'Manual', color: 'Pearl White', description: 'Well-maintained Honda City VX with full service history. Single owner, no accidents.', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=500&q=80', location: 'Pune', verified: true },
            { title: 'Royal Enfield Classic 350', category: 'bike', brand: 'Royal Enfield', price: 155000, year: 2020, km: 18000, fuel: 'Petrol', transmission: 'Manual', color: 'Stealth Black', description: 'Classic 350 in excellent condition. Low mileage, fully serviced.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', location: 'Mumbai', verified: true },
            { title: 'Maruti Swift ZXI+', category: 'car', brand: 'Maruti Suzuki', price: 520000, year: 2021, km: 28000, fuel: 'Petrol', transmission: 'Automatic', color: 'Magma Grey', description: 'Top variant Swift with sunroof. Excellent city car, very fuel efficient.', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&q=80', location: 'Pune', verified: true },
            { title: 'Honda Activa 6G', category: 'scooter', brand: 'Honda', price: 68000, year: 2022, km: 8500, fuel: 'Petrol', transmission: 'Automatic', color: 'Pearl Siren Blue', description: 'Almost new Honda Activa 6G. Under 10k km, first owner.', image: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80', location: 'Nagpur', verified: false },
            { title: 'Hyundai Creta SX', category: 'car', brand: 'Hyundai', price: 1350000, year: 2022, km: 22000, fuel: 'Diesel', transmission: 'Automatic', color: 'Typhoon Silver', description: 'Loaded Creta SX with panoramic sunroof, 360° camera, Bose audio. 1 owner, corporate-maintained.', image: 'https://images.unsplash.com/photo-1571987502051-3ab5e7e1c1b4?w=500&q=80', location: 'Pune', verified: true },
            { title: 'KTM Duke 390', category: 'bike', brand: 'KTM', price: 185000, year: 2021, km: 14000, fuel: 'Petrol', transmission: 'Manual', color: 'White', description: 'Sporty KTM Duke 390 with all original parts. Regularly serviced at KTM service center.', image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500&q=80', location: 'Mumbai', verified: true },
            { title: 'Tata Nexon EV Max', category: 'car', brand: 'Tata', price: 1620000, year: 2023, km: 12000, fuel: 'Electric', transmission: 'Automatic', color: 'Pristine White', description: 'Brand new condition Nexon EV Max with 437km range. Under full warranty.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=500&q=80', location: 'Pune', verified: true },
            { title: 'Yamaha FZ-S V3', category: 'bike', brand: 'Yamaha', price: 98000, year: 2022, km: 9200, fuel: 'Petrol', transmission: 'Manual', color: 'Metallic Black', description: 'Yamaha FZ-S V3 FI in mint condition. Connected instrument cluster, single owner.', image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=500&q=80', location: 'Nashik', verified: false },
            { title: 'Tata Ace HT Pickup', category: 'truck', brand: 'Tata', price: 490000, year: 2020, km: 55000, fuel: 'Diesel', transmission: 'Manual', color: 'Arctic White', description: 'Tata Ace in good running condition. Perfect for last-mile delivery.', image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=500&q=80', location: 'Pune', verified: true },
        ];

        await Vehicle.insertMany(sampleVehicles);
        console.log(`🌱 Seeded ${sampleVehicles.length} sample vehicles into MongoDB.`);
    } catch (err) {
        console.error('Seed error:', err.message);
    }
}

// =============================================
// 404 Handler
// =============================================
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
    console.log('');
    console.log('🚗  ================================');
    console.log(`🚗  AutoBazaar Server running!`);
    console.log(`🚗  http://localhost:${PORT}`);
    console.log('🚗  ================================');
    console.log('');
    console.log('📌  API Endpoints:');
    console.log(`   POST  /api/auth/signup`);
    console.log(`   POST  /api/auth/login`);
    console.log(`   GET   /api/auth/me`);
    console.log(`   GET   /api/vehicles`);
    console.log(`   GET   /api/vehicles/:id`);
    console.log(`   POST  /api/vehicles`);
    console.log(`   POST  /api/appointments`);
    console.log(`   GET   /api/appointments/mine`);
    console.log(`   PATCH /api/appointments/:id/status`);
    console.log(`   DELETE /api/appointments/:id`);
    console.log('');
});

module.exports = app;