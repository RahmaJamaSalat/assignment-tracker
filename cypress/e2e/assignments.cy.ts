describe("Assignments Dashboard", () => {
  it("should display the dashboard layout elements", () => {
    cy.visit("/");
    cy.contains("Assignment Tracker").should("be.visible");
    cy.wait(1000);
    cy.screenshot("dashboard-layout");
  });

  describe("When authenticated", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
      cy.visit("/");
    });

    it("should show the add assignment button", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.contains("button", "Add Assignment").should("be.visible");
      cy.screenshot("dashboard-add-assignment-button");
    });

    it("should display assignment statistics", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get('[data-testid="stats-container"], .grid').should("exist");
      cy.wait(500);
      cy.screenshot("dashboard-assignment-stats");
    });

    it("should have search functionality", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get('input[placeholder*="Search"], input[type="search"]').should(
        "be.visible"
      );
      cy.screenshot("dashboard-search-functionality");
    });

    it("should have filter and sort options", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get('button[role="combobox"]').should("have.length.at.least", 2);
      cy.screenshot("dashboard-filter-sort-options");
    });

    it("should display notifications bell icon", () => {
      cy.get(".lucide-bell").should("exist");
    });
  });

  describe("Assignment CRUD Operations", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
      cy.visit("/");
    });

    it("should open add assignment dialog", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.contains("button", "Add Assignment").should("be.visible").click();
      cy.get('[role="dialog"]').should("be.visible");
      cy.get("#title").should("be.visible");
      cy.get("#dueDate").should("be.visible");
      cy.wait(300);
      cy.screenshot("assignment-add-dialog");
    });

    it("should create a new assignment", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");

      cy.contains("button", "Add Assignment").should("be.visible").click();
      cy.get('[role="dialog"]').should("be.visible");

      cy.get("#title").clear().type("Cypress Test Assignment");
      cy.get("#subject").clear().type("Testing");
      cy.get("#description")
        .clear()
        .type("This is a test assignment created by Cypress");
      cy.get("#dueDate").clear().type("2025-12-31T23:59");
      cy.get("#priority").click();
      cy.get('[role="option"]').contains("High").click();

      cy.get('button[type="submit"]').click();
      cy.wait("@createAssignment").its("response.statusCode").should("eq", 201);
      cy.get('[role="dialog"]').should("not.exist");
      cy.contains("Cypress Test Assignment").should("be.visible");
      cy.wait(500);
      cy.screenshot("assignment-created-success");
    });

    it("should filter assignments by status", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get('button[role="combobox"]').first().click();
      cy.screenshot("assignment-filter-dropdown");
      cy.get('[role="option"]').contains("Completed").click({ force: true });
      cy.wait(500);
      cy.screenshot("assignment-filtered-by-status");
    });

    it("should search for assignments", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get('input[placeholder*="Search"]').type("Math");
      cy.wait(500);
      cy.screenshot("assignment-search-results");
    });

    it("should mark assignment as complete", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.intercept("PATCH", "/api/assignments/*").as("updateAssignment");
      cy.contains("button", "Add Assignment").should("be.visible").click();
      cy.get('[role="dialog"]').should("be.visible");
      cy.get("#title").clear().type("Complete Me Test");
      cy.get("#dueDate").clear().type("2025-12-31T23:59");
      cy.get('button[type="submit"]').click();

      cy.wait("@createAssignment");
      cy.get('[role="dialog"]').should("not.exist");
      cy.contains("Complete Me Test")
        .parents(".rounded-xl.border")
        .first()
        .find("button")
        .contains(/start|complete/i)
        .click();
      cy.wait("@updateAssignment");
      cy.wait(500);
      cy.screenshot("assignment-marked-complete");
    });

    it("should delete an assignment", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.intercept("DELETE", "/api/assignments/*").as("deleteAssignment");
      cy.contains("button", "Add Assignment").should("be.visible").click();
      cy.get('[role="dialog"]').should("be.visible");
      cy.get("#title").clear().type("Delete Me Test");
      cy.get("#dueDate").clear().type("2025-12-31T23:59");
      cy.get('button[type="submit"]').click();

      cy.wait("@createAssignment");
      cy.get('[role="dialog"]').should("not.exist");
      cy.contains("Delete Me Test")
        .parents(".rounded-xl.border")
        .first()
        .find('button[title="Delete assignment"]')
        .click();
      cy.wait("@deleteAssignment");
    });
  });

  describe("AI Chat Feature", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
      cy.visit("/");
    });

    it("should display floating chat button", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get(".lucide-bot").should("exist");
      cy.screenshot("ai-chat-button");
    });

    it("should open AI chat interface", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.wait("@getAssignments");
      cy.get("button").find(".lucide-bot").parent().parent().click();
      cy.contains("AI Assistant").should("be.visible");
      cy.wait(300);
      cy.screenshot("ai-chat-interface-open");
    });
  });

  describe("Notifications", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
      cy.visit("/");
    });

    it("should display notification bell icon", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.intercept("GET", "/api/notifications").as("getNotifications");
      cy.wait("@getAssignments");
      cy.wait("@getNotifications");
      cy.get(".lucide-bell").should("exist");
      cy.screenshot("notifications-bell-icon");
    });

    it("should open notification dropdown", () => {
      cy.intercept("GET", "/api/notifications").as("getNotifications");
      cy.wait("@getNotifications");
      cy.get(".lucide-bell").parent("button").click();
      cy.contains("Notifications").should("be.visible");
      cy.wait(300);
      cy.screenshot("notifications-dropdown-open");
    });

    it("should mark notification as read", () => {
      cy.intercept("PATCH", "/api/notifications/*").as("updateNotification");
      cy.intercept("GET", "/api/notifications").as("getNotifications");
      cy.wait("@getNotifications");
      cy.get(".lucide-bell").parent("button").click();
      cy.get("body").then(($body) => {
        if ($body.text().includes("No notifications")) {
          cy.log("No notifications to mark as read");
        } else {
          cy.get('[role="menuitem"]').first().click();
        }
      });
    });
  });
});
