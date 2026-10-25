// solvers/optimizationEngine.js
const solver = require('javascript-lp-solver');

/**
 * Executes the Integer Linear Programming (ILP) optimization model.
 * 
 * @param {number} availableCapital - Total disposable capital C in Naira (₦)
 * @param {Array<Object>} categories - Expense categories with constraints and weights
 *   Structure: [
 *     { id: 'tuition', name: 'Tuition', utility: 10, minAmount: 45000, maxAmount: 45000, isHard: true },
 *     { id: 'feeding', name: 'Feeding', utility: 9, minAmount: 20000, maxAmount: 35000, isHard: true },
 *     { id: 'transport', name: 'Transport', utility: 7, minAmount: 5000, maxAmount: 12000, isHard: false },
 *     { id: 'books', name: 'Books/Materials', utility: 6, minAmount: 4000, maxAmount: 10000, isHard: false },
 *     { id: 'leisure', name: 'Leisure', utility: 2, minAmount: 0, maxAmount: 8000, isHard: false }
 *   ]
 * @returns {Object} Optimized budget allocation, utility score, or deficit alert
 */
function runBudgetOptimization(availableCapital, categories) {
  // Step 1: Validate input parameters
  if (typeof availableCapital !== 'number' || availableCapital < 0) {
    throw new Error('Invalid capital: Capital must be a non-negative number.');
  }

  // Step 2: Check for Unresolvable Deficit (Hard Constraints Evaluation)
  const totalMandatoryDeficit = categories
    .filter(cat => cat.isHard)
    .reduce((sum, cat) => sum + (cat.minAmount || 0), 0);

  if (totalMandatoryDeficit > availableCapital) {
    const deficitAmount = totalMandatoryDeficit - availableCapital;
    return {
      status: 'INFEASIBLE_DEFICIT',
      message: 'Available capital cannot satisfy mandatory survival constraints.',
      availableCapital,
      mandatoryRequired: totalMandatoryDeficit,
      deficitAmount,
      triggerSponsorship: true, // Flags frontend to prompt Anonymous Sponsorship Form
      allocations: null
    };
  }

  // Step 3: Construct the ILP Model for solver
  const model = {
    optimize: 'totalUtility',
    opType: 'max',
    constraints: {
      totalBudget: { max: availableCapital }
    },
    variables: {},
    ints: {}
  };

  categories.forEach((cat) => {
    const varName = cat.id;

    // Register category variables and their contribution to constraints
    model.variables[varName] = {
      totalUtility: cat.utility, // Ui weight
      totalBudget: 1             // Xi consumes 1 unit of capital per allocation unit
    };

    // Add per-category lower bound (Hard constraint Hi)
    if (cat.minAmount > 0) {
      model.constraints[`min_${varName}`] = { min: cat.minAmount };
      model.variables[varName][`min_${varName}`] = 1;
    }

    // Add per-category upper bound (Soft constraint Mi)
    if (cat.maxAmount && cat.maxAmount > 0) {
      model.constraints[`max_${varName}`] = { max: cat.maxAmount };
      model.variables[varName][`max_${varName}`] = 1;
    }

    // Enforce Integer constraint (Xi ∈ Z+)
    model.ints[varName] = 1;
  });

  // Step 4: Execute the Branch-and-Bound / Simplex Solver
  const solution = solver.Solve(model);

  if (!solution.feasible) {
    return {
      status: 'INFEASIBLE',
      message: 'Optimization failed to converge on an integer solution within constraints.',
      triggerSponsorship: true,
      allocations: null
    };
  }

  // Step 5: Format the optimized output
  let totalAllocated = 0;
  const allocations = categories.map((cat) => {
    const allocated = solution[cat.id] || cat.minAmount || 0;
    totalAllocated += allocated;
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      allocatedAmount: Math.round(allocated),
      minRequired: cat.minAmount,
      maxAllowed: cat.maxAmount,
      utilityScore: cat.utility
    };
  });

  const remainingSurplus = availableCapital - totalAllocated;

  // Calculate Financial Health Metric (1 - 100)
  const healthScore = Math.min(
    100,
    Math.round(((totalAllocated / availableCapital) * 50) + ((solution.result / (categories.length * 10)) * 5))
  );

  return {
    status: 'OPTIMAL',
    availableCapital,
    totalAllocated,
    remainingSurplus,
    overallUtility: solution.result,
    financialHealthScore: healthScore,
    triggerSponsorship: false,
    allocations
  };
}

module.exports = { runBudgetOptimization };