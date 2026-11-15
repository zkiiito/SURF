import { describeReact, visitScenario, waveA, waveB, message } from '../support/reactScenario'

describeReact('React conversation navigation', () => {
  it('opens the most recent conversation when all are archived', () => {
    const old = Date.now() - 15 * 86400000
    visitScenario({ messages: [message(1, { created_at: old }), message(2, { waveId: waveB._id, created_at: old + 1 })] }, {}, '/')
    cy.get('.wave-title').should('have.text', 'Wave B')
    cy.contains('You have no conversations.').should('not.exist')
  })

  it('recovers from inaccessible conversation links and unknown routes', () => {
    visitScenario({ waves: [waveA] }, {}, '/wave/missing')
    cy.get('.wave-title').should('have.text', 'Wave A')
    cy.window().then(win => { win.location.hash = '/unknown/path' })
    cy.get('.wave-title').should('have.text', 'Wave A')
    cy.location('hash').should('eq', `#/wave/${waveA._id}`)
  })

  it('opens empty archived conversations and shows the empty state only without waves', () => {
    visitScenario({ waves: [waveA] }, {}, '/')
    cy.get('.wave-title').should('have.text', 'Wave A')
    cy.contains('#wave-list-archived', 'Wave A').should('exist')
    visitScenario({ waves: [] }, {}, '/')
    cy.contains('You have no conversations.').should('be.visible')
  })
})
