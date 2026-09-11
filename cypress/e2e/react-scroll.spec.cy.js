import { describeReact, visitScenario, message, waveB } from '../support/reactScenario'

const atBottom = () => cy.get('.waves-container').should(([el]) => {
  expect(el.scrollHeight - el.clientHeight - el.scrollTop, 'distance from bottom').to.be.lessThan(2)
})

describeReact('React initial conversation scroll', () => {
  it('opens read conversations at the bottom without jumping on later messages', () => {
    cy.intercept('GET', '**/*.woff', req => req.on('response', res => res.setDelay(500))).as('font')
    visitScenario({ messages: Array.from({ length: 80 }, (_, i) => message(i + 1, {
      message: `Message ${i}`, ...(i >= 40 ? { waveId: waveB._id } : {}),
    })) })
    cy.wait('@font')
    cy.document().then(doc => doc.fonts.ready)
    atBottom()
    cy.contains('.waveitem', 'Wave B').click()
    atBottom()
    cy.get('.waves-container').scrollTo('top')
    cy.task('react:emit', { event: 'message', data: message(100, { waveId: waveB._id, message: 'Later message' }) })
    cy.contains('.message-text', 'Later message').should('exist')
    cy.get('.waves-container').should(([el]) => expect(el.scrollTop).to.equal(0))
    cy.contains('.waveitem', 'Wave A').click()
    atBottom()
  })

  it('focuses the first unread instead of scrolling past it', () => {
    visitScenario({ messages: Array.from({ length: 40 }, (_, i) => message(i + 1, { unread: i === 5 })) })
    cy.get(`#msg-${message(6)._id} > table`).should('be.focused').and('not.have.class', 'unread')
    cy.get('.waves-container').should(([el]) => expect(el.scrollTop).to.be.lessThan(el.scrollHeight - el.clientHeight))
  })
})
