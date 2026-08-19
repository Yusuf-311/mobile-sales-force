describe('Generate Mobile Screenshots', () => {
  beforeEach(() => {
    // Set viewport to mobile size (e.g., iPhone X)
    cy.viewport('iphone-x');
  });

  it('takes mobile screenshots of all main pages', () => {
    // 1. Login Page Mobile
    cy.visit('/login');
    cy.screenshot('mobile_login_page', { overwrite: true });

    // Login as MR
    cy.contains('.user-card', 'Medical Rep').click();
    cy.url().should('include', '/call-lists');

    // 2. Call Lists Page Mobile
    cy.contains('h1', 'Call List').should('be.visible');
    cy.screenshot('mobile_call_lists_page', { overwrite: true });

    // 3. Call Plans Page Mobile
    cy.get('.navbar-toggle').click();
    cy.contains('a.nav-link', 'Call Plan').click();
    cy.contains('h1', 'Call Plan').should('be.visible');
    cy.screenshot('mobile_call_plans_page', { overwrite: true });

    // 4. Call Actuals Page Mobile
    cy.get('.navbar-toggle').click();
    cy.contains('a.nav-link', 'Call Actual').click();
    cy.contains('h1', 'Call Actual').should('be.visible');
    cy.screenshot('mobile_call_actuals_page', { overwrite: true });
  });
});
