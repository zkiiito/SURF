import { describeReact, visitScenario, message } from '../support/reactScenario'

const pointer = { pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 100, eventConstructor: 'PointerEvent' }
const tap = (selector, count = 1) => cy.get(selector).then(([el]) => {
  const Pointer = el.ownerDocument.defaultView.PointerEvent
  for (let i = 0; i < count; i++) {
    el.dispatchEvent(new Pointer('pointerdown', { ...pointer, bubbles: true }))
    el.dispatchEvent(new Pointer('pointerup', { ...pointer, bubbles: true }))
  }
})

describeReact('React touch replies', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    visitScenario({ messages: [message(1, { message: 'Touch this message https://example.com' })] })
  })

  it('opens one reply form on double tap and keeps it open after a native double click', () => {
    tap('.message-text', 2)
    cy.get('.message .replyform').should('have.length', 1)
    cy.get('.message-text').dblclick()
    cy.get('.message .replyform').should('have.length', 1)
  })

  it('does not treat swipes or links as reply gestures', () => {
    cy.get('.message-text').trigger('pointerdown', pointer)
      .trigger('pointermove', { ...pointer, clientY: 200 }).trigger('pointerup', pointer)
    tap('.message-text')
    cy.get('.message .replyform').should('not.exist')
    tap('.message-formatted a')
    tap('.message-formatted a')
    cy.get('.message .replyform').should('not.exist')
  })
})
