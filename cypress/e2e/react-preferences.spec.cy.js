import { describeReact, visitScenario, me, bob } from '../support/reactScenario'

describeReact('per-user media preferences', () => {
  const openProfile = () => cy.get('a.edituser').click()

  it('honors existing Backbone settings ahead of global React defaults', () => {
    visitScenario({}, { onBeforeLoad(win) {
      win.localStorage.setItem(me._id + 'showPictures', '0')
      win.localStorage.setItem(me._id + 'showVideos', '1')
      win.localStorage.setItem(me._id + 'showLinkPreviews', '0')
      win.localStorage.setItem('showPictures', 'true')
      win.localStorage.setItem('showLinkPreviews', 'true')
    } })
    openProfile()
    cy.get('#edituser-show-pictures').should('not.be.checked')
    cy.get('#edituser-show-videos').should('be.checked')
    cy.get('#edituser-show-linkpreviews').should('not.be.checked')
    cy.get('#edituser-submit').click()
    cy.reload()
    openProfile()
    cy.get('#edituser-show-pictures').should('not.be.checked')
    cy.get('#edituser-show-videos').should('be.checked')
  })

  it('migrates global React settings once and keeps accounts independent', () => {
    visitScenario({}, { onBeforeLoad(win) {
      win.localStorage.setItem('showPictures', 'false')
      win.localStorage.setItem('showVideos', 'true')
      win.localStorage.setItem('showLinkPreviews', 'true')
    } })
    openProfile()
    cy.get('#edituser-show-videos').should('be.checked')
    cy.window().then(win => {
      expect(win.localStorage.getItem(me._id + 'showVideos')).to.equal('1')
      expect(win.localStorage.getItem('showVideos')).to.equal(null)
    })
    visitScenario({ me: bob, users: [me] })
    openProfile()
    cy.get('#edituser-show-videos').should('not.be.checked')
    cy.get('#edituser-show-pictures').should('not.be.checked').check()
    cy.get('#edituser-submit').click()
    cy.reload()
    openProfile()
    cy.get('#edituser-show-pictures').should('be.checked')
    visitScenario()
    openProfile()
    cy.get('#edituser-show-pictures').should('not.be.checked')
    cy.get('#edituser-show-videos').should('be.checked')
  })

  it('uses disabled defaults and stays usable when local storage is blocked', () => {
    visitScenario({}, { onBeforeLoad(win) {
      cy.stub(win.Storage.prototype, 'getItem').throws(new Error('Storage disabled'))
      cy.stub(win.Storage.prototype, 'setItem').throws(new Error('Storage disabled'))
    } })
    openProfile()
    cy.get('#edituser-show-pictures').should('not.be.checked').check()
    cy.get('#edituser-show-videos').should('not.be.checked')
    cy.get('#edituser-show-linkpreviews').should('not.be.checked')
    cy.get('#edituser-submit').click()
    cy.get('#edituser').should('not.exist')
    openProfile()
    cy.get('#edituser-show-pictures').should('be.checked')
  })
})
