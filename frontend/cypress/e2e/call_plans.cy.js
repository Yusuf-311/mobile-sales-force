describe('Call Plans Page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('.user-card', 'Medical Rep').click();
    cy.contains('a.nav-link', 'Call Plan').click();
    cy.url().should('include', '/call-plans');
  });

  it('should display the Call Plan form and allow interaction', () => {
    cy.contains('h1', 'Call Plan').should('be.visible');
    cy.get('#call-plan-form').should('be.visible');
    
    // Check form fields
    cy.get('#cp-list').should('exist');
    cy.get('#cp-doctor').should('exist');
    cy.get('#cp-date').should('exist');
    cy.get('#cp-time').should('exist');
    cy.get('#cp-submit-btn').should('exist');
    
    // Try typing a date
    cy.get('#cp-date').type('2026-08-25');
    cy.get('#cp-time').type('10:00');
    
    cy.get('#cp-date').should('have.value', '2026-08-25');
    cy.get('#cp-time').should('have.value', '10:00');
  });
});
