require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json()); 
app.use(cors());

const authController = require('./controllers/authController');
const optimizationController = require('./controllers/optimizationController');
const { 
  transferFunds, grantAmenity, logExpense, getStudentRecords, 
  requestSponsorship, getAllSponsorshipRequests, claimAmenity, getSponsorTrackRecord 
} = require('./controllers/walletController'); 
const { protect, authorize } = require('./middleware/authMiddleware'); 

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finbuddy';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Successfully connected to the Finbuddy MongoDB Database.'))
  .catch((error) => console.error('❌ MongoDB connection failed:', error.message));

app.post('/api/signup', authController.signup);
app.post('/api/login', authController.login);
app.post('/api/optimize', optimizationController.runFinancialOptimization);

app.post('/api/v1/wallet/transfer', protect, authorize('Sponsor'), transferFunds);
app.post('/api/v1/amenity/grant', protect, authorize('Sponsor'), grantAmenity); 

app.post('/api/v1/student/log-expense', protect, authorize('Student'), logExpense);
app.get('/api/v1/sponsor/records/:matricNumber', protect, authorize('Sponsor'), getStudentRecords);
app.post('/api/v1/student/request-sponsorship', protect, authorize('Student'), requestSponsorship);
app.get('/api/v1/sponsor/all-requests', protect, authorize('Sponsor'), getAllSponsorshipRequests);
app.post('/api/v1/student/claim-amenity', protect, authorize('Student'), claimAmenity);
// NEW ROUTE
app.get('/api/v1/sponsor/track-record', protect, authorize('Sponsor'), getSponsorTrackRecord);

app.get('/api/status', (req, res) => res.json({ message: "Database Sync Complete!" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Finbuddy API running on port ${PORT}`));