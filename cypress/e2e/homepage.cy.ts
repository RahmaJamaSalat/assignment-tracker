describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should display the app title in header", () => {
    cy.get("header").contains("Assignment Tracker").should("be.visible");
    cy.wait(500);
    cy.screenshot("homepage-header");
  });

  it("should display the main heading with graduation cap icon", () => {
    cy.get("h1").contains("Assignment Tracker").should("be.visible");
    cy.get("svg").should("exist");
    cy.wait(500);
    cy.screenshot("homepage-main-heading");
  });

  it("should show sign in and sign up buttons when not authenticated", () => {
    cy.get("header button")
      .contains(/sign in/i)
      .should("be.visible");
    cy.get("header button")
      .contains(/sign up/i)
      .should("be.visible");
    cy.wait(500);
    cy.screenshot("homepage-unauthenticated-buttons");
  });

  it("should display welcome message for unauthenticated users", () => {
    cy.contains(
      /Stay organized, track progress, and never miss a deadline/
    ).should("be.visible");
    cy.wait(500);
    cy.screenshot("homepage-welcome-message");
  });

  it("should have a responsive layout", () => {
    cy.viewport("iphone-x");
    cy.contains("Assignment Tracker").should("be.visible");
    cy.wait(500);
    cy.screenshot("homepage-mobile-layout");

    cy.viewport(1280, 720);
    cy.contains("Assignment Tracker").should("be.visible");
    cy.wait(500);
    cy.screenshot("homepage-desktop-layout");
  });

  it("should not show Add Assignment button when not authenticated", () => {
    cy.contains("button", "Add Assignment").should("not.exist");
  });
});
