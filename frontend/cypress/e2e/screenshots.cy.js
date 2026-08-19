describe('Generate Screenshots', () => {
  it('takes screenshots of all main pages', () => {
    // 1. Login Page
    cy.visit('/login');
    cy.screenshot('login_page', { overwrite: true });

    // Login as MR
    cy.contains('.user-card', 'Medical Rep').click();
    cy.url().should('include', '/call-lists');

    // 2. Call Lists Page
    cy.contains('h1', 'Call List').should('be.visible');
    cy.screenshot('call_lists_page', { overwrite: true });

    // 3. Call Plans Page
    cy.contains('a.nav-link', 'Call Plan').click();
    cy.contains('h1', 'Call Plan').should('be.visible');
    cy.screenshot('call_plans_page', { overwrite: true });

    // 4. Call Actuals Page
    cy.contains('a.nav-link', 'Call Actual').click();
    cy.contains('h1', 'Call Actual').should('be.visible');
    cy.screenshot('call_actuals_page', { overwrite: true });
  });
});
