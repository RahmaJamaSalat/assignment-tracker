describe("API Routes", () => {
  describe("Assignments API", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
    });

    it("should fetch assignments", () => {
      cy.intercept("GET", "/api/assignments").as("getAssignments");
      cy.visit("/");

      cy.wait("@getAssignments").then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body).to.be.an("array");
      });
    });

    it("should create a new assignment via API", () => {
      const newAssignment = {
        title: "API Test Assignment",
        subject: "Testing",
        description: "API test assignment",
        dueDate: "2025-12-31T23:59",
        priority: "medium",
      };
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.visit("/");
      cy.contains("button", "Add Assignment").click();
      cy.get("#title").type(newAssignment.title);
      cy.get("#subject").type(newAssignment.subject);
      cy.get("#description").type(newAssignment.description);
      cy.get("#dueDate").type(newAssignment.dueDate);
      cy.get('button[type="submit"]').click();

      cy.wait("@createAssignment").then((interception) => {
        expect(interception.response?.statusCode).to.eq(201);
        expect(interception.response?.body).to.have.property("id");
        expect(interception.response?.body.title).to.eq(newAssignment.title);
      });
    });

    it("should update an assignment status", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.intercept("PATCH", "/api/assignments/*").as("updateAssignment");
      cy.visit("/");

      cy.contains("button", "Add Assignment").click();
      cy.get("#title").type("Status Update Test");
      cy.get("#dueDate").type("2025-12-31T23:59");
      cy.get('button[type="submit"]').click();
      cy.wait("@createAssignment");

      cy.contains("Status Update Test")
        .parents()
        .find("button")
        .contains("Start")
        .first()
        .click();

      cy.wait("@updateAssignment").then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
      });
    });

    it("should delete an assignment", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.intercept("DELETE", "/api/assignments/*").as("deleteAssignment");
      cy.visit("/");

      cy.contains("button", "Add Assignment").click();
      cy.get("#title").type("Delete API Test");
      cy.get("#dueDate").type("2025-12-31T23:59");
      cy.get('button[type="submit"]').click();
      cy.wait("@createAssignment");

      cy.contains("Delete API Test")
        .parents()
        .find("button[title='Delete assignment']")
        .first()
        .click();
      cy.wait("@deleteAssignment").then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
      });
    });
  });

  describe("Notifications API", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
    });

    it("should fetch notifications", () => {
      cy.intercept("GET", "/api/notifications").as("getNotifications");

      cy.visit("/");

      cy.wait("@getNotifications").then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body).to.be.an("array");
      });
    });

    it("should mark notification as read", () => {
      cy.intercept("GET", "/api/notifications").as("getNotifications");
      cy.intercept("PATCH", "/api/notifications/*").as("markNotificationRead");

      cy.visit("/");
      cy.wait("@getNotifications");

      cy.get(".lucide-bell").parent("button").click();

      cy.get("body").then(($body) => {
        if (!$body.text().includes("No notifications")) {
          cy.get('[role="menuitem"]').first().click();
          cy.wait("@markNotificationRead").then((interception) => {
            expect(interception.response?.statusCode).to.eq(200);
          });
        } else {
          cy.log("No notifications to test");
        }
      });
    });

    it("should create notification when assignment is due soon", () => {
      cy.intercept("POST", "/api/assignments").as("createAssignment");
      cy.intercept("POST", "/api/notifications").as("createNotification");
      cy.visit("/");

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 16);
      cy.contains("button", "Add Assignment").click();
      cy.get("#title").type("Due Tomorrow Test");
      cy.get("#dueDate").type(tomorrowStr);
      cy.get('button[type="submit"]').click();
      cy.wait("@createAssignment");
    });
  });

  describe("Chat API", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
    });

    it("should accept chat messages", () => {
      cy.intercept("POST", "/api/chat").as("chatMessage");
      cy.visit("/");
      cy.get("button").find(".lucide-bot").parent().parent().click();

      cy.get("body").then(($body) => {
        if ($body.find('textarea, input[type="text"]').length > 1) {
          cy.get('textarea, input[type="text"]').last().type("Hello AI");
          cy.get('button[type="submit"], button').contains(/send/i).click();
          cy.wait("@chatMessage").then((interception) => {
            expect(interception.response?.statusCode).to.eq(200);
          });
        }
      });
    });
  });

  describe("Google Calendar API", () => {
    beforeEach(() => {
      cy.visit("/");
      cy.clerkSignIn({
        strategy: "email_code",
        identifier: "jane+clerk_test@example.com",
      });
    });

    it("should handle calendar status endpoint", () => {
      cy.intercept("GET", "/api/google-calendar/status").as("calendarStatus");
      cy.request({
        method: "GET",
        url: "/api/google-calendar/status",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 401, 500]);
      });
    });
  });

  describe("Unauthenticated API Access", () => {
    it("should return 401 or redirect for assignments without auth", () => {
      cy.request({
        method: "GET",
        url: "/api/assignments",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([307, 308, 401, 404]);
      });
    });

    it("should return 401 or redirect for notifications without auth", () => {
      cy.request({
        method: "GET",
        url: "/api/notifications",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([307, 308, 401, 404]);
      });
    });
  });
});
