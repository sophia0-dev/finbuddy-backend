// controllers/budgetController.js
const { runBudgetOptimization } = require('../solvers/optimizationEngine');

/**
 * POST /api/v1/budget/optimize
 * Request Body: { capital: number, constraints: Array }
 */
exports.optimizeBudget = async (req, res) => {
  try {
    const { capital, constraints } = req.body;

    if (capital === undefined || !Array.isArray(constraints)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: capital and constraints array are required.'
      });
    }

    const optimizationResult = runBudgetOptimization(Number(capital), constraints);

    if (optimizationResult.status === 'INFEASIBLE_DEFICIT') {
      return res.status(200).json({
        success: true,
        data: optimizationResult,
        actionRequired: 'INITIATE_ANONYMOUS_SPONSORSHIP'
      });
    }

    return res.status(200).json({
      success: true,
      data: optimizationResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal optimization solver error'
    });
  }
};