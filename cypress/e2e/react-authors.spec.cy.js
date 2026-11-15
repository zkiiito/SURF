import { describeReact, visitScenario, message, bob } from '../support/reactScenario'

describeReact('historical authors', () => {
  const former = { ...bob, _id: '600000000000000000000003', name: 'Former participant' }

  it('fetches missing authors for root messages and nested replies', () => {
    const root = message(1, { userId: former._id })
    visitScenario({
      hiddenUsers: [former],
      messages: [root, message(2, { userId: former._id, parentId: root._id })],
    })
    cy.get('.message .author').should(authors => {
      expect(authors).to.have.length(2)
      expect([...authors].map(author => author.textContent)).to.deep.equal(['Former participant:', 'Former participant:'])
    })
    cy.get('.replies .reply').click()
    cy.get('form.threadend textarea').should('have.attr', 'placeholder').and('contain', 'Former participant')
    cy.task('react:events').then(events => {
      expect(events.filter(({ event }) => event === 'getUser')).to.deep.equal([
        { event: 'getUser', data: { userId: former._id } },
      ])
    })
  })

  it('keeps an unavailable author and their reply form usable', () => {
    visitScenario({ messages: [message(1, { userId: former._id })] })
    cy.get('.message .author').should('have.text', 'Unknown:')
    cy.get('.message .reply').click()
    cy.get('form.threadend textarea').should('be.visible').type('Reply anyway{enter}')
    cy.contains('.replies .message-text', 'Reply anyway').should('exist')
    cy.get('body').should('not.contain', 'Unexpected Application Error!')
  })
})
