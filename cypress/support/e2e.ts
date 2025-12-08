// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import { addClerkCommands } from "@clerk/testing/cypress";

/// <reference types="cypress" />
addClerkCommands({ Cypress, cy });

// Handle uncaught exceptions from Clerk/Next.js initialization
Cypress.on("uncaught:exception", (err) => {
  // Ignore common errors during authentication flow
  if (
    err.message.includes("document") ||
    err.message.includes("window") ||
    err.message.includes("Clerk") ||
    err.message.includes("loaded")
  ) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

export {};
