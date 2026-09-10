let inviteUrl = '';
const testUserId = Date.now();
const unreadReply = 'Reply posted while player1 is offline';

describe('full test', () => {
    it('player1', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${testUserId}{enter}`)

        cy.get('span#currentuser p.currentuser_name').should('have.text', `Surf Tester ${testUserId}`)

        cy.get('#wave-list a.addwave').click()

        cy.get('#editwave').should('be.visible')

        cy.get('#editwave form input#editwave-title').type(`Teszt Wave 1{enter}`)

        cy.get('#editwave:visible').should('not.exist')

        cy.get('#wave-list a.waveitem').should('have.length', 1)
        
        cy.get('#wave-list a.waveitem').click()

        cy.get('#wave-list a.waveitem.open').should('have.length', 1)

        const newMsgs = 15

        //write messages
        for (let i = 0; i < newMsgs; i++) {
            cy.get('form.add-message textarea').type(`lol fsa ${i}{enter}`)
        }

        cy.get('.message').should('have.length', newMsgs)

        const lastMsg = cy.get('.message:last-of-type')

        cy.get('.message:last-of-type .reply').click()

        cy.get('form.add-message.threadend').should('be.visible')

        const replies = 5
        for (let i = 0; i < replies; i++) {
            cy.get('form.add-message.threadend textarea').type(`lol fsa reply ${i}{enter}`);
        }

        lastMsg.get(`.replies .message`).should('have.length', replies)

        const newTitle = 'Teszt Wave 2'
        cy.get('a.button.editwave').click()
        cy.get('#editwave').should('be.visible')
        cy.get('#editwave form input#editwave-title').clear().type(`${newTitle}{enter}`)
        cy.get('#editwave:visible').should('not.exist')

        cy.get('.wave h2.wave-title').should('have.text', newTitle)
        cy.get('#wave-list .waveitem h2').should('have.text', newTitle)

        cy.get('a.button.editwave').click()
        cy.get('#editwave').should('be.visible')
        cy.get('#editwave').click()
        cy.get('#editwave-invite').click()

        cy.get('#editwave-invitecode').invoke('val').then((val) => {
            inviteUrl = val
        })
    })

    it('player2', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${testUserId + 1}{enter}`)

        cy.visit(inviteUrl)

        cy.get('#wave-list a.waveitem').should('have.length', 1)
        cy.get('.message').should('have.length', 16)

        cy.get('a.getprevmessages').click()

        cy.get('.message').should('have.length', 20)

        for (let i = 0; i < 5; i++) {
            cy.get('form.add-message textarea').type(`rotfl mao ${i}{enter}`)
        }

        // Both users now belong to the wave. Reply to the last new root so
        // opening the wave focuses an earlier unread message, not this reply.
        cy.contains('.message-text', 'rotfl mao 4')
            .closest('.message').find('a.reply').click()
        cy.get('form.add-message.threadend textarea').type(`${unreadReply}{enter}`)
        cy.contains('.replies .message-text', unreadReply).should('be.visible')

        // Reload to check persisted unread state for the sender too.
        cy.reload()
        cy.contains('.replies .message-text', unreadReply)
            .closest('table').should('not.have.class', 'unread')
    })

    it('player1 again', () => {
        cy.visit('http://localhost:8000/loginTest')
        cy.get('input[name="username"]').type(`${testUserId}{enter}`)
        
        cy.get('#wave-list a.waveitem').should('have.length', 1)
        cy.get('.message').should('have.length', 22)
        cy.contains('.replies .message-text', unreadReply)
            .closest('table').should('have.class', 'unread')
        cy.get('.message > table.unread').should('have.length', 5) // 5 roots + 1 reply, focused on 1
        cy.get('a.gounread').click()
        cy.get('.message > table.unread').should('have.length', 4)
    })
})
