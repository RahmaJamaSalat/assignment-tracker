/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login
     * @example cy.login()
     */
    login(): Chainable<void>;

    /**
     * Custom command to wait for API calls
     * @example cy.waitForApi('@getAssignments')
     */
    waitForApi(alias: string): Chainable<void>;
  }
}
