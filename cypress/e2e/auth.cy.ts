describe("Authentication", () => {
  it("should show sign in and sign up buttons when not authenticated", () => {
    cy.visit("/");
    cy.get("header").within(() => {
      cy.contains("button", /sign in/i).should("be.visible");
      cy.contains("button", /sign up/i).should("be.visible");
    });
    cy.wait(500);
    cy.screenshot("auth-unauthenticated-state");
  });

  it("should navigate to sign up page", () => {
    cy.visit("/sign-up");
    cy.url().should("include", "/sign-up");
    cy.wait(1000);
    cy.screenshot("auth-sign-up-page");
  });

  it("should navigate to sign in page", () => {
    cy.visit("/sign-in");
    cy.url().should("include", "/sign-in");
    cy.wait(1000);
    cy.screenshot("auth-sign-in-page");
  });

  it("should sign in successfully and show user button", () => {
    cy.visit("/");
    cy.clerkSignIn({
      strategy: "email_code",
      identifier: "jane+clerk_test@example.com",
    });
    cy.visit("/");
    cy.get("header").within(() => {
      cy.get(
        'button[aria-label*="user"], button[data-testid*="user"], .cl-userButton-root'
      ).should("exist");
    });
    cy.contains("button", /^sign in$/i).should("not.exist");
    cy.contains("button", /^sign up$/i).should("not.exist");
    cy.wait(500);
    cy.screenshot("auth-authenticated-state");
  });

  it("should sign out successfully", () => {
    cy.visit("/");
    cy.clerkSignIn({
      strategy: "email_code",
      identifier: "jane+clerk_test@example.com",
    });
    cy.visit("/");
    cy.clerkSignOut();
    cy.get("header").within(() => {
      cy.contains("button", /sign in/i).should("be.visible");
      cy.contains("button", /sign up/i).should("be.visible");
    });
  });
});
