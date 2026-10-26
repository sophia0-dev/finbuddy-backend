const { Student } = require('../models/User');

const transferFunds = async (req, res) => {
  try {
    const { matricNumber, amount } = req.body;
    if (!matricNumber || !amount || amount <= 0) return res.status(400).json({ message: "Please provide a valid matric number and amount." });

    const student = await Student.findOne({ matricNumber });
    if (!student) return res.status(404).json({ message: "Student not found with that Matric Number." });

    student.walletBalance += Number(amount);
    // Log the transaction to the Sponsor who sent it
    student.fundingHistory.push({ amount: Number(amount), grantedBy: req.user.name });
    await student.save();

    res.status(200).json({ success: true, message: `Successfully transferred ₦${amount} to ${student.name}.`, newBalance: student.walletBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const grantAmenity = async (req, res) => {
  try {
    const { matricNumber, amenityName } = req.body;
    if (!matricNumber || !amenityName) return res.status(400).json({ message: "Please provide a matric number and the amenity name." });

    const student = await Student.findOne({ matricNumber });
    if (!student) return res.status(404).json({ message: "Student not found with that Matric Number." });

    student.amenities.push({ name: amenityName, grantedBy: req.user.name });
    await student.save();

    res.status(200).json({ success: true, message: `Successfully granted '${amenityName}' to ${student.name}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const logExpense = async (req, res) => {
  try {
    const { name, amount } = req.body;
    if (!name || !amount) return res.status(400).json({ message: "Provide expense name and amount." });

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    student.expenseLogs.unshift({ name, amount: Number(amount) }); 
    student.walletBalance -= Number(amount); 
    
    await student.save();
    res.status(200).json({ success: true, message: "Expense logged and wallet updated.", newBalance: student.walletBalance, logs: student.expenseLogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStudentRecords = async (req, res) => {
  try {
    const { matricNumber } = req.params;
    const student = await Student.findOne({ matricNumber });
    if (!student) return res.status(404).json({ message: "Student not found." });

    res.status(200).json({ 
      success: true, 
      studentName: student.name,
      walletBalance: student.walletBalance,
      expenseLogs: student.expenseLogs,
      sponsorshipRequests: student.sponsorshipRequests,
      amenities: student.amenities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const requestSponsorship = async (req, res) => {
  try {
    const { title, amount } = req.body;
    if (!title || !amount) return res.status(400).json({ message: "Provide what you need and the amount." });

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    student.sponsorshipRequests.unshift({ title, amount: Number(amount) });
    await student.save();
    
    res.status(200).json({ success: true, message: "Sponsorship request submitted!", requests: student.sponsorshipRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllSponsorshipRequests = async (req, res) => {
  try {
    // Fetch students but DO NOT send raw PII to the client
    const students = await Student.find({ "sponsorshipRequests.0": { $exists: true } });
    
    const anonymizedStudents = students.map(student => {
      // Generate the anonymous identifier exactly like your ZKP engine does
      const identityPayload = `${student.matricNumber}:${student.name}`;
      const decentralizedId = crypto.createHash('sha256').update(identityPayload).digest('hex').substring(0, 16);
      
      return {
        _id: student._id,
        anonymousId: `ZKP-STUDENT-${decentralizedId}`,
        institution: student.institution,
        degreeProgram: student.degreeProgram,
        sponsorshipRequests: student.sponsorshipRequests
      };
    });

    res.status(200).json({ success: true, students: anonymizedStudents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const claimAmenity = async (req, res) => {
  try {
    const { amenityId } = req.body;
    if (!amenityId) return res.status(400).json({ message: "Amenity ID is required." });

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const amenity = student.amenities.id(amenityId);
    if (!amenity) return res.status(404).json({ message: "Amenity not found." });

    amenity.status = 'Collected';
    await student.save();

    res.status(200).json({ success: true, message: "Amenity marked as collected!", amenities: student.amenities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// NEW: Pulls a specific Sponsor's track record across all students
const getSponsorTrackRecord = async (req, res) => {
  try {
    const sponsorName = req.user.name;
    const students = await Student.find({
      $or: [
        { 'amenities.grantedBy': sponsorName },
        { 'fundingHistory.grantedBy': sponsorName }
      ]
    }).select('name matricNumber amenities fundingHistory');

    const impactRecord = students.map(student => ({
      name: student.name,
      matricNumber: student.matricNumber,
      amenitiesGranted: student.amenities.filter(a => a.grantedBy === sponsorName),
      fundsGranted: student.fundingHistory ? student.fundingHistory.filter(f => f.grantedBy === sponsorName) : []
    }));

    res.status(200).json({ success: true, impactRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  transferFunds, grantAmenity, logExpense, getStudentRecords, 
  requestSponsorship, getAllSponsorshipRequests, claimAmenity, getSponsorTrackRecord 
};