describe('Mobile Sales Force - Login and Navigation', () => {
  it('should load the login page and log in as Medical Rep', () => {
    // 1. Visit the app
    cy.visit('/');

    // 2. Check that we are on the login page by verifying the title
    cy.contains('Mobile Sales Force').should('be.visible');
    cy.contains('Pilih akun untuk melanjutkan').should('be.visible');

    // 3. Find and click the 'Medical Rep' user card
    // The name 'Andi MR' has the role 'mr' which displays as 'Medical Rep'
    cy.contains('.user-card', 'Medical Rep').click();

    // 4. Verify we are redirected to the Call Lists page
    cy.url().should('include', '/call-lists');
    
    // 5. Verify the navigation bar shows the correct active user info
    cy.get('.user-chip').should('be.visible').and('contain', 'Andi');

    // 6. Navigate to Call Plan page
    cy.contains('a.nav-link', 'Call Plan').click();

    // 7. Verify we are on the Call Plan page
    cy.url().should('include', '/call-plans');
    cy.contains('Call Plan').should('be.visible');
  });
});
