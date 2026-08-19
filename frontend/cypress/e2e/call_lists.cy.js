describe('Call Lists Page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('.user-card', 'Medical Rep').click();
    cy.url().should('include', '/call-lists');
  });

  it('should display the Call List dashboard', () => {
    cy.contains('h1', 'Call List').should('be.visible');
    // Check if the table or empty state exists
    cy.get('body').then($body => {
      if ($body.find('table').length > 0) {
        cy.get('table').should('be.visible');
      } else {
        cy.contains('Belum ada Call List').should('be.visible');
      }
    });
  });
});
