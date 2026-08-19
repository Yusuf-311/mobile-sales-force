describe('Call Actuals Page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('.user-card', 'Medical Rep').click();
    cy.contains('a.nav-link', 'Call Actual').click();
    cy.url().should('include', '/call-actuals');
  });

  it('should display the Call Actual form and allow mode switching', () => {
    cy.contains('h1', 'Call Actual').should('be.visible');
    cy.get('#call-actual-form').should('be.visible');
    
    // Default is 'plan' mode
    cy.get('#ca-plan').should('exist');
    cy.get('#ca-doctor-readonly').should('exist');
    
    // Switch to 'unplan' mode
    cy.get('#mode-unplan').click();
    cy.get('#ca-doctor').should('exist'); // now it should be a select dropdown for doctor
    
    // Fill out common fields
    cy.get('#ca-date').type('2026-08-25');
    cy.get('#ca-checkin').type('10:00');
    cy.get('#ca-checkout').type('10:30');
    cy.get('#ca-photo').type('https://example.com/photo.jpg');
    cy.get('#ca-signature').type('https://example.com/sig.png');
    
    // Assert values
    cy.get('#ca-date').should('have.value', '2026-08-25');
    cy.get('#ca-checkin').should('have.value', '10:00');
    cy.get('#ca-checkout').should('have.value', '10:30');
    cy.get('#ca-photo').should('have.value', 'https://example.com/photo.jpg');
  });
});
