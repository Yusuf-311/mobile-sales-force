describe('Generate Role & Status Screenshots', () => {
  it('captures different roles and statuses', () => {
    // === 1. MEDICAL REP (MR) VIEW ===
    cy.visit('/login');
    // Login as Medical Rep (Andi)
    cy.contains('.user-card', 'Medical Rep').click();
    cy.url().should('include', '/call-lists');
    
    // Screenshot: MR Call List View (Shows Draft)
    cy.contains('h1', 'Call List').should('be.visible');
    cy.screenshot('role_mr_call_list', { overwrite: true });
    
    // Submit the draft if available
    cy.get('body').then($body => {
      if ($body.find('.badge-draft').length > 0) {
        // Find the submit button and click it
        cy.contains('button', 'Submit').first().click();
        
        // Wait for status to change to Diajukan / Pending Approval
        cy.contains('.badge', 'Diajukan').should('be.visible');
        
        // Screenshot: MR Call List View (Shows Submitted/Pending)
        cy.screenshot('status_pending_mr', { overwrite: true });
      }
    });

    // Logout
    cy.get('#btn-logout').click();

    // === 2. DISTRICT MANAGER (DM) VIEW ===
    // Login as District Manager (Budi)
    cy.contains('.user-card', 'District Manager').click();
    cy.url().should('include', '/call-lists');

    // Screenshot: DM Call List View
    cy.contains('h1', 'Call List').should('be.visible');
    cy.screenshot('role_dm_call_list', { overwrite: true });

    // Approve a pending list if available
    cy.get('body').then($body => {
      if ($body.find('button:contains("Setujui")').length > 0) {
        cy.contains('button', 'Setujui').first().click();
        
        // Wait for status to change to Disetujui
        cy.contains('.badge', 'Disetujui').should('be.visible');
        
        // Screenshot: DM Call List View (Shows Approved)
        cy.screenshot('status_approved_dm', { overwrite: true });
      }
    });

    // Logout
    cy.get('#btn-logout').click();
  });
});
