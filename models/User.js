// models/User.js
const mongoose = require('mongoose');

/**
 * Base User Schema
 * Maps to the User Class: userID (handled by _id), name, email, passwordHash, role, walletBalance.
 */
const userOptions = { discriminatorKey: 'role', collection: 'users', timestamps: true };

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  walletBalance: {
    type: Number,
    default: 0.0
  },
  // Role Enum maps to the system's actors: Student, Sponsor, Admin
  role: {
    type: String,
    enum: ['Student', 'Sponsor', 'Admin'],
    required: true
  }
}, userOptions);

const User = mongoose.model('User', UserSchema);

/**
 * Student Discriminator Schema
 * Inherits from User Class and adds: matricNumber, institution, degreeProgram[cite: 1].
 */
const StudentSchema = new mongoose.Schema({
  matricNumber: {
    type: String,
    required: true,
    unique: true
  },
  institution: {
    type: String,
    required: true
  },
  degreeProgram: {
    type: String,
    required: true
  },
amenities: [{
    name: String,
    grantedBy: String,
    dateGranted: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' } // NEW: Tracks collection status
  }],
  fundingHistory: [{
    amount: Number,
    grantedBy: String,
    date: { type: Date, default: Date.now }
  }],
  expenseLogs: [{
    name: String,
    amount: Number,
    date: { type: Date, default: Date.now }
  }],
  sponsorshipRequests: [{
    title: String,
    amount: Number,
    status: { type: String, default: 'Pending' }, // Can be Pending or Funded
    date: { type: Date, default: Date.now }
  }]
});

// Create the Student model as a discriminator of the User model
const Student = User.discriminator('Student', StudentSchema);

module.exports = { User, Student };