import { describeReact, visitScenario } from '../support/reactScenario'

describeReact('connection recovery', () => {
  afterEach(() => {
    // Leave no recovery timer running when Cypress replaces the test document.
    cy.reload()
    cy.get('#currentuser').should('be.visible')
  })
  it('keeps recovery visible after a disconnect during initial loading', () => {
    visitScenario({ ready: false })
    cy.get('#loading-state').should('be.visible')
    cy.get('#currentuser').should('be.visible')
    cy.task('react:disconnect')
    cy.get('#disconnected').should('be.visible')
    cy.get('#darken').click('topLeft')
    cy.get('body').trigger('keydown', { key: 'Escape' })
    cy.get('#disconnected').should('be.visible')
    cy.get('#disconnected .counter').should('have.text', '3')
  })

  it('backs off while unavailable and reloads after a successful connectivity probe', () => {
    let originalDocument
    let attempts = 0
    visitScenario()
    cy.get('.wave-title').should('be.visible')
    cy.document().then(document => { originalDocument = document })
    cy.intercept('GET', '**/images/surf-ico.png?reconnect=*', req => {
      req.reply({ statusCode: ++attempts === 1 ? 503 : 200, body: '' })
    }).as('probe')
    cy.task('react:disconnect')
    cy.get('#disconnected').should('be.visible')
    cy.get('#darken').click('topLeft')
    cy.get('body').trigger('keydown', { key: 'Escape' })
    cy.wait('@probe', { requestTimeout: 10000 })
    cy.get('#disconnected .counter').should('have.text', '6')
    cy.document().should(document => expect(document === originalDocument).to.equal(true))
    cy.wait('@probe', { requestTimeout: 10000 })
    cy.document().should(document => expect(document === originalDocument).to.equal(false))
    cy.get('.wave-title').should('be.visible')
    cy.get('#disconnected').should('not.exist')
  })

  it('honors dontReconnect without a countdown or automatic probe', () => {
    visitScenario()
    cy.get('.wave-title').should('be.visible')
    cy.task('react:emit', { event: 'dontReconnect' })
    cy.get('#disconnected').should('be.visible')
    cy.task('react:disconnect')
    cy.get('#disconnected .countdown').should('not.exist')
    cy.get('#disconnected a').should('have.attr', 'href', '/')
  })
})
