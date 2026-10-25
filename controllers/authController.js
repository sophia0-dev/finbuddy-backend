const { User, Student } = require('../models/User'); // Import both models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SIGNUP LOGIC
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, matricNumber, institution, degreeProgram } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });

    // 2. Encrypt the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save to MongoDB based on Role
    let newUser;
    if (role === 'Student') {
      // If it's a student, require the student-specific fields
      if (!matricNumber || !institution || !degreeProgram) {
        return res.status(400).json({ message: "Student accounts require matric number, institution, and degree program." });
      }
      newUser = new Student({
        name,
        email,
        passwordHash: hashedPassword, // Matches your new schema
        role,
        matricNumber,
        institution,
        degreeProgram
      });
    } else {
      // Generic fallback for Sponsors or Admins
      newUser = new User({
        name,
        email,
        passwordHash: hashedPassword,
        role
      });
    }

    await newUser.save();
    res.status(201).json({ message: `${role} account created successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN LOGIC
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found." });

    // 2. Verify the password against the passwordHash
    const isMatch = await bcrypt.compare(password, user.passwordHash); // Matches your new schema
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    // 3. Generate the JWT Secret Token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};