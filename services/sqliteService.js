// services/sqliteService.js
import * as SQLite from 'expo-sqlite';

// Initialize the offline SQLite database
const db = SQLite.openDatabase('finbuddy_offline.db');

/**
 * Step 1: Initialize the Database Schemas
 * Creates the required tables for Expenses and BudgetPlans if they do not exist.
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Create Expenses Table based on the Student Expense Logging Form
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          date_time TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        );`
      );

      // Create BudgetPlans Table to cache the ILP Optimization Engine output
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS budget_plans (
          planID INTEGER PRIMARY KEY AUTOINCREMENT,
          totalCapital REAL NOT NULL,
          optimizedOutput TEXT NOT NULL, 
          dateCreated TEXT NOT NULL
        );`
      );
    }, 
    (error) => {
      console.error("Database Initialization Error: ", error);
      reject(error);
    }, 
    () => {
      console.log("Offline Database successfully initialized.");
      resolve(true);
    });
  });
};

/**
 * Step 2: Log a Daily Expense Offline
 * @param {number} amount - The exact cost incurred (₦)
 * @param {string} category - Maps expense to constraints (e.g., Feeding, Tuition)
 * @param {string} description - Brief context for the expense
 */
export const logExpenseOffline = (amount, category, description = '') => {
  return new Promise((resolve, reject) => {
    const dateTime = new Date().toISOString();
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO expenses (amount, category, description, date_time) VALUES (?, ?, ?, ?);`,
        [amount, category, description, dateTime],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

/**
 * Step 3: Fetch All Local Expenses
 * Retrieves the historical spending data needed for the Sponsor Transparency Dashboard.
 */
export const getOfflineExpenses = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM expenses ORDER BY date_time DESC;`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, error) => reject(error)
      );
    });
  });
};

/**
 * Step 4: Cache the Optimized Budget Plan
 * Saves the mathematically perfect distribution from the backend so it survives app restarts.
 * @param {number} totalCapital - Total available capital (C)
 * @param {Object} optimizedOutput - The JSON response from the ILP engine
 */
export const cacheBudgetPlan = (totalCapital, optimizedOutput) => {
  return new Promise((resolve, reject) => {
    const dateCreated = new Date().toISOString();
    const stringifiedOutput = JSON.stringify(optimizedOutput);

    db.transaction(tx => {
      // Clear previous cached plans to save space (keeping only the latest active budget)
      tx.executeSql(`DELETE FROM budget_plans;`);
      
      // Insert the newly generated plan
      tx.executeSql(
        `INSERT INTO budget_plans (totalCapital, optimizedOutput, dateCreated) VALUES (?, ?, ?);`,
        [totalCapital, stringifiedOutput, dateCreated],
        (_, result) => resolve(result.insertId),
        (_, error) => reject(error)
      );
    });
  });
};

/**
 * Step 5: Retrieve the Cached Budget Plan
 * Used by Zustand on app launch to immediately display the budget progress bars.
 */
export const getLatestBudgetPlan = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM budget_plans ORDER BY dateCreated DESC LIMIT 1;`,
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            const plan = rows._array[0];
            // Parse the JSON string back into a usable JavaScript object
            plan.optimizedOutput = JSON.parse(plan.optimizedOutput);
            resolve(plan);
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};