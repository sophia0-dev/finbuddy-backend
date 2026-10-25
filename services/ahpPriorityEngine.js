// services/ahpPriorityEngine.js

// Random Index (RI) table for AHP consistency calculations based on matrix size (n)
const RI_TABLE = { 1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32 };

/**
 * Step 1: Calculate Criteria Weights and Consistency Ratio
 * @param {Array<Array<number>>} matrix - Pairwise comparison matrix of criteria
 * @returns {Object} { weights, consistencyRatio, isConsistent }
 */
function calculateAHPWeights(matrix) {
  const n = matrix.length;
  
  // 1. Calculate column sums
  const colSums = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  // 2. Normalize the matrix and calculate the principal eigenvector (Weights)
  const weights = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] / colSums[j];
    }
    weights[i] = rowSum / n;
  }

  // 3. Calculate Consistency Ratio (CR) to ensure logical prioritization
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let weightedSum = 0;
    for (let j = 0; j < n; j++) {
      weightedSum += matrix[i][j] * weights[j];
    }
    lambdaMax += weightedSum / weights[i];
  }
  lambdaMax /= n;

  const CI = (lambdaMax - n) / (n - 1);
  const CR = n > 2 ? (CI / RI_TABLE[n]) : 0;

  return {
    weights,
    consistencyRatio: CR,
    isConsistent: CR < 0.1 // A CR < 0.1 indicates acceptable consistency
  };
}

/**
 * Step 2: Rank Anonymous Student Requests using AHP Weights
 * @param {Array<Object>} requests - Array of anonymous student sponsorship requests
 * @param {Array<number>} weights - The calculated AHP criteria weights
 * @returns {Array<Object>} Sorted array of requests based on priority score
 */
function rankSponsorshipRequests(requests, weights) {
  const rankedRequests = requests.map(req => {
    // Calculate the weighted priority score for each anonymous request
    // Assumes request scores are pre-normalized on a scale of 0 to 1
    const finalScore = 
      (req.normalizedScores.academicUrgency * weights[0]) +
      (req.normalizedScores.spendingDiscipline * weights[1]) +
      (req.normalizedScores.parentalIncomeNeed * weights[2]);

    return {
      ...req,
      priorityScore: Number(finalScore.toFixed(4))
    };
  });

  // Sort descending: highest priority score appears at the top of the Sponsor Feed
  return rankedRequests.sort((a, b) => b.priorityScore - a.priorityScore);
}

module.exports = { calculateAHPWeights, rankSponsorshipRequests };