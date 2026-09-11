import { describeReact, visitScenario, message, me, waveB } from '../support/reactScenario'

describeReact('mention notifications', () => {
  const installNotification = (win, permission = 'granted') => {
    win.notifications = []
    function Notification(title, options) {
      this.title = title
      this.options = options
      this.close = cy.stub()
      win.notifications.push(this)
    }
    Notification.permission = permission
    win.Notification = Notification
  }

  it('notifies once for an unread mention in another wave and opens that exact message', () => {
    const mention = message(3, { waveId: waveB._id, message: '@Alice please read this', unread: true })
    visitScenario({ messages: [message(2, { waveId: waveB._id, unread: true }), mention] }, { onBeforeLoad: installNotification })
    cy.window().its('notifications').should('have.length', 1)
    cy.window().then(win => {
      expect(win.notifications[0].title).to.equal('Bob mentioned you in Wave B!')
      win.notifications[0].onclick()
    })
    cy.get('.wave-title').should('have.text', 'Wave B')
    cy.get(`#msg-${mention._id} > table`).should('be.focused').and('not.have.class', 'unread')
    cy.contains('.waveitem', 'Wave A').click()
    cy.contains('.waveitem', 'Wave B').click()
    cy.window().its('notifications').should('have.length', 1)
  })

  it('does not notify for read messages, own messages or non-mentions', () => {
    visitScenario({ messages: [
      message(1, { message: '@Alice already read' }),
      message(2, { message: '@Alice my message', userId: me._id, unread: true }),
      message(3, { message: 'Hello Bob', unread: true }),
    ] }, { onBeforeLoad: installNotification })
    cy.get('.message').should('have.length', 3)
    cy.window().its('notifications').should('have.length', 0)
  })

  it('keeps messaging usable when notifications are denied or unsupported', () => {
    visitScenario({ messages: [message(1, { message: '@Alice hello', unread: true })] }, {
      onBeforeLoad: win => installNotification(win, 'denied'),
    })
    cy.get('.message').should('have.length', 1)
    cy.window().its('notifications').should('have.length', 0)
    cy.reload({ onBeforeLoad: win => { delete win.Notification } })
    cy.get('.message').should('have.length', 1)
  })
})
