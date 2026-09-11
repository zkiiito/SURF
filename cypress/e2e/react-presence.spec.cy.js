import { describeReact, visitScenario, message, bob, rootForm } from '../support/reactScenario'

describeReact('live participant profiles', () => {
  it('updates header presence, avatars, names and mention completion without a wave update', () => {
    visitScenario({ messages: [message(1)] })
    cy.get('.heads img[alt=Bob]').should('have.class', 'online')
    const updated = { ...bob, name: 'Bobby', avatar: 'head3', status: 'offline' }
    cy.task('react:emit', { event: 'updateUser', data: { user: updated } })
    cy.get('.heads img[alt=Bobby]').should('have.class', 'offline').and('have.attr', 'src', '/images/head3.png')
    cy.get('.offline-list .count').should('have.text', '1')
    cy.get('.message .author').should('have.text', 'Bobby:')
    cy.get(`${rootForm} textarea`).type('@Bo').trigger('keydown', { key: 'Tab' }).should('have.value', '@Bobby')
    cy.get('.message .reply').click()
    cy.get('form.threadend textarea').type('@Bo').trigger('keydown', { key: 'Tab' }).should('have.value', '@Bobby')
    cy.task('react:emit', { event: 'updateUser', data: { user: { ...updated, status: 'online' } } })
    cy.get('.heads img[alt=Bobby]').should('have.class', 'online')
    cy.get('.offline-list').should('not.exist')
  })
})
