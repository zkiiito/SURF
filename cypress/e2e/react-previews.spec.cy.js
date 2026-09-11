import { describeReact, visitScenario, message, me } from '../support/reactScenario'

describeReact('React link previews', () => {
  it('renders every distinct URL and preserves previews when returning to a wave', () => {
    visitScenario({ messages: [message(1, { message: 'https://example.com/one https://example.com/two https://example.com/one' })] }, {
      onBeforeLoad(win) { win.localStorage.setItem(`${me._id}showLinkPreviews`, '1') },
    })
    cy.get('.message-linkpreview').should('have.length', 2)
    cy.get('.message-linkpreview a').eq(0).should('have.attr', 'href', 'https://example.com/one')
    cy.contains('.waveitem', 'Wave B').click()
    cy.contains('.waveitem', 'Wave A').click()
    cy.get('.message-linkpreview').should('have.length', 2)
    cy.task('react:events').then(events => expect(events.filter(e => e.event === 'getLinkPreview')).to.have.length(2))
  })

  it('previews media URLs when inline media is disabled, including URLs after them', () => {
    visitScenario({ messages: [message(1, { message: 'https://example.com/photo.png https://youtu.be/abcdef https://example.com/page' })] }, {
      onBeforeLoad(win) {
        win.localStorage.setItem(`${me._id}showLinkPreviews`, '1')
        win.localStorage.setItem(`${me._id}showPictures`, '0')
        win.localStorage.setItem(`${me._id}showVideos`, '0')
      },
    })
    cy.get('.message-linkpreview').should('have.length', 3)
    cy.get('.message-formatted img, .message-formatted iframe').should('not.exist')
  })
})
