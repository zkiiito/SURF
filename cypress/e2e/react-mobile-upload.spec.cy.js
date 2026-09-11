import { describeReact, visitScenario, message, rootForm, waveA } from '../support/reactScenario'

describeReact('React mobile upload controls', () => {
  it('allows picking and sending images from root and thread composers', () => {
    cy.viewport(390, 844)
    visitScenario({ messages: [message(1)] })
    cy.intercept('POST', `/wave/${waveA._id}/upload`, { statusCode: 200, body: {} }).as('upload')
    const attachAndSend = form => {
      cy.get(`${form} button.attach`).should('be.visible').click()
      cy.get(`${form} input[type=file]`).selectFile({ contents: Cypress.Buffer.from('image'), fileName: 'mobile.png', mimeType: 'image/png' }, { force: true })
      cy.get(`${form} .attachment-chip`).should('contain', 'mobile.png')
      cy.get(`${form} button.sendmsg`).should('be.visible').and('not.be.disabled').click()
      cy.wait('@upload')
      cy.get(`${form} .attachment-chip`).should('not.exist')
    }
    attachAndSend(rootForm)
    cy.get('.message-text').dblclick()
    attachAndSend('.message .replyform form')
  })
})
