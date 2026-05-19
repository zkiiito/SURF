// Requires the React client. CI passes CLIENT_VERSION via `cypress run --env`
// so we can skip cleanly when Backbone is in use; locally the default is React.
const isBackbone = Cypress.env('CLIENT_VERSION') === 'backbone'
const describeIfReact = isBackbone ? describe.skip : describe

const userId = Date.now() + 100
// Smallest possible valid 1x1 transparent PNG.
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const pngFile = (fileName) => ({
    contents: Cypress.Buffer.from(tinyPngBase64, 'base64'),
    fileName,
    mimeType: 'image/png',
})

describeIfReact('file upload', () => {
    it('uploads images with caption and renders them inline', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${userId}{enter}`)

        cy.get('#wave-list a.addwave').click()
        cy.get('#editwave').should('be.visible')
        cy.get('#editwave form input#editwave-title').type('Upload Test{enter}')
        cy.get('#editwave:visible').should('not.exist')

        cy.get('#wave-list a.waveitem').should('have.length', 1).click()
        cy.get('#wave-list a.waveitem.open').should('have.length', 1)
        cy.get('form.add-message textarea').should('be.visible')

        cy.get('form.add-message input[type=file]').selectFile(
            [pngFile('a.png'), pngFile('b.png')],
            { force: true }
        )

        cy.get('.attachment-chip').should('have.length', 2)
        cy.get('.attachment-chip').first().should('contain', 'a.png')
        cy.get('.attachment-chip').eq(1).should('contain', 'b.png')

        cy.get('form.add-message textarea').type('look at these')
        cy.get('form.add-message button.sendmsg').click()

        cy.get('.message').should('have.length', 1)
        cy.get('.message .message-attachment img.message-img').should('have.length', 2)
        cy.get('.message .message-text').should('contain', 'look at these')

        cy.get('.attachment-chip').should('not.exist')

        cy.get('.message-attachment img.message-img').first()
            .should('have.prop', 'naturalWidth')
            .and('be.greaterThan', 0)

        cy.get('.message-attachment img.message-img').first()
            .should('have.attr', 'src')
            .and('match', /^\/wave\/[a-f0-9]{24}\/file\/[a-f0-9]{24}\/[a-f0-9]{32}$/)
    })

    it('rejects non-image picks with an alert and no chip', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${userId + 1}{enter}`)

        cy.get('#wave-list a.addwave').click()
        cy.get('#editwave form input#editwave-title').type('Reject Test{enter}')
        cy.get('#wave-list a.waveitem').click()
        cy.get('form.add-message textarea').should('be.visible')

        const alertStub = cy.stub().as('alert')
        cy.on('window:alert', alertStub)

        cy.get('form.add-message input[type=file]').selectFile({
            contents: Cypress.Buffer.from('hello world'),
            fileName: 'notes.txt',
            mimeType: 'text/plain',
        }, { force: true })

        cy.get('@alert').should('have.been.calledOnce')
        cy.get('.attachment-chip').should('not.exist')
    })
})
