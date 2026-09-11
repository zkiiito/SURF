import { describeReact, visitScenario, message, me, bob, waveA, waveB } from '../support/reactScenario'

describeReact('private conversations from avatars', () => {
  const charlie = { ...bob, _id: '600000000000000000000003', name: 'Charlie' }
  const group = { ...waveA, userIds: [me._id, bob._id, charlie._id] }

  it('reuses an archived two-person conversation without opening a reply form', () => {
    const privateWave = { ...waveB, userIds: [me._id, bob._id] }
    visitScenario({ users: [bob, charlie], waves: [group, privateWave], messages: [
      message(1), message(2, { waveId: waveB._id, created_at: Date.now() - 10 * 86400000 }),
    ] })
    cy.get('.message-header img[alt=Bob]').dblclick()
    cy.get('.wave-title').should('have.text', 'Wave B')
    cy.get('form.threadend').should('not.exist')
    cy.task('react:events').then(events => expect(events.filter(({ event }) => event === 'createWave')).to.have.length(0))
  })

  it('creates a private conversation when needed and does nothing for your own avatar', () => {
    visitScenario({ users: [bob, charlie], waves: [group], messages: [message(1)] })
    cy.get('#currentuser img').dblclick()
    cy.get('.waveitem').should('have.length', 1)
    cy.get('.message-header img[alt=Bob]').dblclick()
    cy.get('.waveitem').should('have.length', 2)
    cy.get('.wave-title').should('not.have.text', 'Wave A')
    cy.get('.heads img').should('have.length', 2)
    cy.get('form.threadend').should('not.exist')
    cy.task('react:events').then(events => {
      const creates = events.filter(({ event }) => event === 'createWave')
      expect(creates).to.have.length(1)
      expect(creates[0].data.userIds).to.deep.equal([bob._id])
    })
  })
})
