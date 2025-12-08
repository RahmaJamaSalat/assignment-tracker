/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to bypass Clerk authentication in tests
// Note: For production tests, you'd want to implement proper auth
Cypress.Commands.add("login", () => {
  // This is a placeholder. In a real scenario, you would:
  // 1. Use Clerk's testing tokens
  // 2. Or set up a test user and use cy.session()
  // 3. Or mock the authentication state
  cy.log("Login command - implement based on your auth strategy");
});

// Custom command to wait for API calls
Cypress.Commands.add("waitForApi", (alias: string) => {
  cy.wait(alias);
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      waitForApi(alias: string): Chainable<void>;
    }
  }
}

export {};
