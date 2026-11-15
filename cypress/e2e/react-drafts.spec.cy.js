import { describeReact, visitScenario, waveA, waveB, rootForm, pickImage } from '../support/reactScenario'

describeReact('conversation drafts', () => {
  it('keeps text and attachments in their own conversation', () => {
    visitScenario()
    cy.get(`${rootForm} textarea`).type('Draft for A')
    pickImage()
    cy.contains('.waveitem', 'Wave B').click()
    cy.get(`${rootForm} textarea`).should('have.value', '').type('Draft for B')
    cy.get('.attachment-chip').should('not.exist')
    cy.contains('.waveitem', 'Wave A').click()
    cy.get(`${rootForm} textarea`).should('have.value', 'Draft for A')
    cy.get('.attachment-chip').should('contain', 'draft.png')
    cy.contains('.waveitem', 'Wave B').click()
    cy.get(`${rootForm} textarea`).should('have.value', 'Draft for B').type('{enter}')
    cy.contains('.message-text', 'Draft for B').should('exist')
    cy.task('react:events').then(events => {
      const sent = events.find(({ event }) => event === 'message')
      expect(sent.data).to.include({ waveId: waveB._id, message: 'Draft for B' })
    })
  })

  it('finishes an upload in the original conversation without clearing another draft', () => {
    visitScenario()
    cy.intercept('POST', `/wave/${waveA._id}/upload`, { statusCode: 200, body: {}, delay: 1500 }).as('upload')
    cy.get(`${rootForm} textarea`).type('Caption for A')
    pickImage()
    cy.get(`${rootForm} button.sendmsg`).click()
    cy.contains('.waveitem', 'Wave B').click()
    cy.get(`${rootForm} textarea`).should('not.be.disabled').type('Keep B')
    cy.wait('@upload')
    cy.get(`${rootForm} textarea`).should('have.value', 'Keep B')
    cy.contains('.waveitem', 'Wave A').click()
    cy.get(`${rootForm} textarea`).should('have.value', '').and('not.be.disabled')
    cy.get('.attachment-chip').should('not.exist')
  })
})
