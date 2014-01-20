var testDataInit = {
    me: {_id: 3, name: 'tibor', avatar: 'images/head5.png', status: 'online'},
    users: [
        {_id: 1, name: 'csabcsi', avatar: 'images/head3.png', status: 'online'},
        {_id: 2, name: 'leguan', avatar: 'images/head2.png'},
        {_id: 4, name: 'klara', avatar: 'images/head4.png'}
    ],
    waves: [{_id: 1, title: 'Csillag-delta tejbevávé', userIds: [1, 2, 3, 4]}],
    messages: [
        {_id: 11, waveId: 1, userId: 1,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 12, waveId: 1, userId: 1,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 13, waveId: 1, userId: 3, parentId: 11,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {_id: 14, waveId: 1, userId: 1, parentId: 11,
            message: 'Herp derp'},
        {_id: 15, waveId: 1, userId: 2, parentId: 12,
            message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 16, waveId: 1, userId: 4, parentId: 15,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ]
};

var testDataOldMsgs = {
    messages: [
        {_id: 1, waveId: 1, userId: 1, unread: false,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 2, waveId: 1, userId: 1, unread: false,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 3, waveId: 1, userId: 3, parentId: 1, unread: false,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {_id: 4, waveId: 1, userId: 1, parentId: 1, unread: false,
            message: 'Herp derp'},
        {_id: 5, waveId: 1, userId: 2, parentId: 2, unread: false,
            message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id: 6, waveId: 1, userId: 4, parentId: 5, unread: false,
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ]
};

casper.on("remote.message", function(message) {
    //this.echo("remote console.log: " + message);
});

casper.test.begin('Init with test data, post new messages', 17, function suite(test) {
    casper.start("http://localhost/surf/client/test.html", function() {
        this.evaluate(function(data) {
            Communicator.onInit(data);
        }, testDataInit);
    })
    .then(function() {
        test.assertElementCount('#wave-list .waveitem', 1, 'got 1 wave');
        test.assertElementCount('.message', 6, 'got 6 messages');
        test.assertElementCount('.message > table.unread', 5, 'got 5 unread messages');
    })
    //test after init, new message, reply message
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
        this.click('#msg-17 .reply');
        test.assertExists('form.add-message.threadend', 'replyform visible');

        //reply
        this.fillSelectors('form.add-message.threadend', {
            "textarea": 'lol fsa'
        }, true);

        test.assertExists('#msg-17 .replies .message', 'new reply message ready');
    })
    //test edit wave
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
    //test create wave
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
    //test get old messages
    .then(function(){
        /*
        this.evaluate(function(data) {
            Communicator.getMessages = function(wave, minParentId, maxRootId) {
                this.onMessage(data);
           };
        }, testDataOldMsgs);
        */
        this.click('a.getprevmessages');
        test.assertElementCount('.message', 14, 'got 6 new messages');
        test.assertElementCount('.message > table.unread', 3, '3 unread messages left after click on unread');

    })

    .run(function() {
        test.done();
    });
});