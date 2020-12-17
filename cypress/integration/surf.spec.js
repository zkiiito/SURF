let inviteUrl = '';
const testUserId = Date.now();

describe('full test', () => {
    it('player1', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${testUserId}{enter}`)

        cy.wait(100)

        cy.get('#wave-list a.addwave').click()

        cy.get('#editwave').should('be.visible')

        cy.get('#editwave form input#editwave-title').type(`Teszt Wave 1{enter}`)

        cy.get('#editwave').should('be.hidden')

        cy.get('#wave-list a.waveitem').should('have.length', 1)
        
        cy.get('#wave-list a.waveitem').click()

        cy.get('#wave-list a.waveitem.open').should('have.length', 1)

        //write messages
        for (let i = 0; i < 15; i++) {
            cy.get('form.add-message textarea').type(`lol fsa ${i}{enter}`)
        }

        cy.get('.message').should('have.length', 15)

        const lastMsg = cy.get('.message:last-of-type')

        cy.get('.message:last-of-type .reply').click()

        cy.get('form.add-message.threadend').should('be.visible')

        for (let i = 0; i < 5; i++) {
            cy.get('form.add-message.threadend textarea').type(`lol fsa reply ${i}{enter}`);
        }

        lastMsg.get(`.replies .message`).should('have.length', 5)

        const newTitle = 'Teszt Wave 2'
        cy.get('a.button.editwave').click()
        cy.get('#editwave').should('be.visible')
        cy.get('#editwave form input#editwave-title').clear().type(`${newTitle}{enter}`)
        cy.get('#editwave').should('be.hidden')

        cy.get('.wave h2.wave-title').should('have.text', newTitle)
        cy.get('#wave-list .waveitem h2').should('have.text', newTitle)

        cy.get('a.button.editwave').click()
        cy.get('#editwave').should('be.visible')
        cy.get('#editwave').click()
        cy.get('#editwave-invite').click()

        cy.get('#editwave-invitecode').its('value').should('contain', 'http://localhost:8000/invite/')

        inviteUrl = Cypress.$('#editwave-invitecode').val();

        // cy.visit('http://localhost:8000/logoutTest')
    })

    it('player2', () => {
        // cy.clearCookies()
        cy.visit(inviteUrl)

        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${testUserId + 1}{enter}`)

        cy.get('#wave-list a.waveitem').should('have.length', 1)
        cy.get('.message').should('have.length', 16)

        cy.get('a.getprevmessages').click()

        cy.get('.message').should('have.length', 20)

        for (let i = 0; i < 5; i++) {
            cy.get('form.add-message textarea').type(`rotfl mao ${i}{enter}`)
        }
    })


})
/*
casper.test.begin('Login with invite, read old messages, reply', 0, function suite(test) {
    casper
            var i;
            for (i = 0; i < 5; i++) {
                this.fillSelectors('form.add-message', {'textarea': 'rotfl mao ' + i}, true);
            }
        })
        .wait(100)//TODO: new wave with prev user
        .thenOpen('http://localhost:8000/logoutTest')
        .run(function () {
            test.done();
        });
});
*/