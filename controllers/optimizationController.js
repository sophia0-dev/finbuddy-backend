const { calculateAHPWeights, optimizeBudgetILP } = require('../solvers/finOptimization');

exports.runFinancialOptimization = async (req, res) => {
  try {
    const { totalIncome, pairwiseMatrix, expenseItems } = req.body;

    if (!totalIncome || !expenseItems) {
      return res.status(400).json({ error: "Missing required financial parameters." });
    }

    // Run AHP if preference matrix is provided, otherwise use default weights
    let criteriaWeights = [0.5, 0.3, 0.2]; // Default fallback
    if (pairwiseMatrix && pairwiseMatrix.length > 0) {
      criteriaWeights = calculateAHPWeights(pairwiseMatrix);
    }

    // Run ILP optimization model
    const optimizationResult = optimizeBudgetILP(totalIncome, expenseItems);

    res.status(200).json({
      success: true,
      message: "Financial optimization model executed successfully.",
      data: {
        criteriaWeights,
        ...optimizationResult
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};