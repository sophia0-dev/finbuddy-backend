// Analytic Hierarchy Process (AHP) for calculating criteria weights
function calculateAHPWeights(matrix) {
  const n = matrix.length;
  let colSums = new Array(n).fill(0);

  // Step 1: Sum each column
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      colSums[j] += matrix[i][j];
    }
  }

  // Step 2: Normalize the matrix and calculate row averages (weights)
  let weights = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      let normalizedValue = matrix[i][j] / colSums[j];
      rowSum += normalizedValue;
    }
    weights[i] = rowSum / n;
  }

  return weights; // Returns priority weights for criteria like [Academics, Feeding, Utilities]
}

// Integer Linear Programming (ILP) Budget Optimizer
function optimizeBudgetILP(totalIncome, items) {
  /*
    items structure: 
    [
      { name: 'Textbooks', cost: 15000, utility: 9, isFixed: true },
      { name: 'Groceries', cost: 20000, utility: 8, isFixed: false },
      { name: 'Submissions/Printing', cost: 5000, utility: 10, isFixed: true }
    ]
  */

  let remainingBudget = totalIncome;
  let selectedAllocation = [];
  let totalUtility = 0;

  // Step 1: Automatically allocate mandatory/fixed expenses first
  const sortedItems = items.sort((a, b) => b.utility - a.utility);

  for (let item of sortedItems) {
    if (item.isFixed) {
      if (remainingBudget >= item.cost) {
        selectedAllocation.push({ name: item.name, allocated: item.cost, status: 'Approved (Fixed)' });
        remainingBudget -= item.cost;
        totalUtility += item.utility;
      } else {
        selectedAllocation.push({ name: item.name, allocated: 0, status: 'Rejected: Exceeds Budget' });
      }
    }
  }

  // Step 2: Optimize variable expenses using utility-per-cost ratio (Greedy ILP Approximation)
  for (let item of sortedItems) {
    if (!item.isFixed) {
      if (remainingBudget >= item.cost) {
        selectedAllocation.push({ name: item.name, allocated: item.cost, status: 'Approved' });
        remainingBudget -= item.cost;
        totalUtility += item.utility;
      } else if (remainingBudget > 0) {
        // Partial allocation if budget is tight
        selectedAllocation.push({ name: item.name, allocated: remainingBudget, status: 'Partially Funded' });
        remainingBudget = 0;
      } else {
        selectedAllocation.push({ name: item.name, allocated: 0, status: 'Skipped' });
      }
    }
  }

  return {
    optimalAllocation: selectedAllocation,
    leftoverSavings: remainingBudget,
    cumulativeUtility: totalUtility
  };
}

module.exports = { calculateAHPWeights, optimizeBudgetILP };