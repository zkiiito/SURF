var testDataInit = {
    me: {_id: 3, name: 'tibor', avatar: 'images/head5.png', status: 'online'},
    users: [
        {_id: 1, name: 'csabcsi', avatar: 'images/head3.png', status: 'online'},
        {_id: 2, name: 'leguan', avatar: 'images/head2.png'},
        {_id: 4, name: 'klara', avatar: 'images/head4.png'}
    ],
    waves: [{_id: 1, title: 'Csillag-delta tejbevávé', userIds: [1, 2, 3, 4]}],
    messages: [
        {_id: 1, waveId: 1, userId: 1,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 2, waveId: 1, userId: 1,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 3, waveId: 1, userId: 3, parentId: 1,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {_id: 4, waveId: 1, userId: 1, parentId: 1,
            message: 'Herp derp'},
        {_id: 5, waveId: 1, userId: 2, parentId: 2,
            message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 6, waveId: 1, userId: 4, parentId: 5,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ]
};

casper.test.begin('Init with test data, post new messages', 15, function suite(test) {
    casper.start("http://localhost/wave/surf/client/test.html", function() {
        this.evaluate(function(data) {
            Communicator.onInit(data);
        }, testDataInit);
    })
    .then(function() {
        test.assertElementCount('#wave-list .waveitem', 1, 'got 1 wave');
        test.assertElementCount('.message', 6, 'got 6 messages');
        test.assertElementCount('.message > table.unread', 5, 'got 5 unread messages');
    })

    .then(function() {
        //after init
        test.assertElementCount('.message > table.unread', 4, '4 unread messages left');

        //click on next unread
        this.click('a.gounread');
        test.assertElementCount('.message > table.unread', 3, '3 unread messages left after click on unread');

        //write message
        this.fillSelectors('form.add-message', {
            "textarea": 'lol fsa'
        }, true);
        test.assertElementCount('.message', 7, 'new message ready');

        //click on reply
        this.click('#msg-7 .reply');
        test.assertExists('form.add-message.threadend', 'replyform visible');

        //reply
        this.fillSelectors('form.add-message.threadend', {
            "textarea": 'lol fsa'
        }, true);

        test.assertExists('#msg-7 .replies .message', 'new reply message ready');
    })

    .then(function(){
        this.click('a.button.editwave');
        test.assertVisible('#editwave', 'edit popup visible');

        var title = "Teszt Wave 1";

        this.fillSelectors('#editwave form', {
            'input#editwave-title': title
        }, true);

        test.assertNotVisible('#editwave', 'edit popup hidden');
        test.assertEquals(this.fetchText('.wave h2.wave-title'), title, 'name change successful in title');
        test.assertEquals(this.fetchText('#wave-list .waveitem h2'), title, 'name change successful in list');
    })

    .then(function(){
        this.click('a.addwave');

        test.assertVisible('#editwave', 'new popup visible');

        var title = "Teszt Wave 2";

        this.fillSelectors('#editwave form', {
            'input#editwave-title': title
        }, true);

        test.assertNotVisible('#editwave', 'new popup hidden');
        test.assertElementCount('#wave-list .waveitem', 2, '2 waves');
    })

    .run(function() {
        test.done();
    });
});