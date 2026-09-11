import { describeReact, visitScenario, message, rootForm, bob } from '../support/reactScenario'

describeReact('React keyboard parity', () => {
  it('moves to the next unread with two spaces in both composers', () => {
    visitScenario({ messages: [message(1), message(2, { unread: true }), message(3, { unread: true }), message(4, { unread: true })] })
    cy.get(`#msg-${message(2)._id} > table`).should('be.focused')
    cy.get(`${rootForm} textarea`).type('  ')
    cy.get(`#msg-${message(3)._id} > table`).should('be.focused').and('not.have.class', 'unread')
    cy.get(`#msg-${message(1)._id} .message-text`).dblclick()
    cy.get('.message .replyform textarea').type('  ')
    cy.get(`#msg-${message(4)._id} > table`).should('be.focused').and('not.have.class', 'unread')
    cy.task('react:events').then(events => expect(events.filter(e => e.event === 'message')).to.have.length(0))
  })

  it('finds participants by masked email and selects with Tab', () => {
    visitScenario()
    cy.get('#wave-list .addwave').click()
    cy.get('#editwave-title').type('Email lookup')
    cy.get('.token-input-input-token-facebook input').type('example.com')
    cy.get('.token-input-dropdown-facebook').should('contain', bob.email)
    cy.get('.token-input-input-token-facebook input').trigger('keydown', { key: 'Tab' })
    cy.get('.token-input-token-facebook').should('contain', 'Bob')
    cy.get('#editwave-submit').click()
    cy.task('react:events').then(events => {
      expect(events.find(e => e.event === 'createWave').data.userIds).to.include(bob._id)
    })
  })
})
