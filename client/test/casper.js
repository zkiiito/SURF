/*global casper */
casper.on("remote.message", function(message) {
    this.echo("remote console.log: " + message);
});

casper.on('page.error', function(message, trace) {
    this.echo('remote error caught: ' + message, 'ERROR');
});

var lastMsgId;
var inviteCodeUrl;
var waveTitle;
var testUserId = 10000 + Math.floor(Math.random() * 10000);

casper.test.begin('Login, create wave', 0, function suite(test) {
    casper.start("http://localhost:8000/loginTest", function() {
        this.fillSelectors('form', {
            "input[name='login']": testUserId
        }, true);
    })
    .wait(1000)
    //test create wave
    .then(function(){
        this.click('a.addwave');

        test.assertVisible('#editwave', 'new popup visible');

        waveTitle = "Teszt Wave 1";

        this.fillSelectors('#editwave form', {
            'input#editwave-title': waveTitle
        }, true);
    })
    .wait(10)
    .then(function(){
        test.assertNotVisible('#editwave', 'new popup hidden');
        test.assertElementCount('#wave-list a.waveitem', 1, '1 wave');
        this.click('#wave-list a.waveitem');
    })
    .then(function(){
        test.assertElementCount('#wave-list a.waveitem.open', 1, '1 open wave');

        var i;
        //write messages
        for (i = 0; i < 15; i++) {
            this.fillSelectors('form.add-message', {"textarea": 'lol fsa ' + i}, true);
        }
    })
    .wait(10)
    .then(function() {
        test.assertElementCount('.message', 15, 'new messages ready');

        lastMsgId = this.evaluate(function() {
            return $('.message').last().attr('id');
        });

        //click on reply
        this.click('#' + lastMsgId + ' .reply');
        test.assertExists('form.add-message.threadend', 'replyform visible');

        //reply
        var i;
        for (i = 0; i < 5; i++) {
            this.fillSelectors('form.add-message.threadend', {"textarea": 'lol fsa reply ' + i}, true);
        }
    })
    .wait(10)
    .then(function(){
        test.assertElementCount('#' + lastMsgId + ' .replies .message', 5, 'new reply messages ready');

        this.click('a.button.editwave');
        test.assertVisible('#editwave', 'edit popup visible');

        waveTitle = "Teszt Wave 2";

        this.fillSelectors('#editwave form', {
            'input#editwave-title': waveTitle
        }, true);
        test.assertNotVisible('#editwave', 'edit popup hidden');
    })
    .wait(10)
    .then(function(){
        test.assertEquals(this.fetchText('.wave h2.wave-title'), waveTitle, 'name change successful in title');
        test.assertEquals(this.fetchText('#wave-list .waveitem h2'), waveTitle, 'name change successful in list');

        this.click('a.button.editwave');
        test.assertVisible('#editwave', 'edit popup visible');
        this.click('#editwave-invite');
    })
    .wait(10)
    .then(function(){
        inviteCodeUrl = this.evaluate(function() {
            return $('#editwave-invitecode').val();
        });
    })
    //kilepes a wavebol
    /*
    .then(function() {
        this.click('a.quit');//confirm always returns true
        test.assertElementCount('#wave-list .waveitem', 0, 'quit waves');
    })
    */
    .thenOpen("http://localhost:8000/logoutTest")
    .run(function() {
        test.done();
    });
});

casper.test.begin('Login with invite, read old messages, reply', 0, function suite(test){
    casper.start(inviteCodeUrl)
    .thenOpen("http://localhost:8000/loginTest", function() {
        this.fillSelectors('form', {
            "input[name='login']": testUserId + 1
        }, true);
    })
    .wait(1500)
    .then(function(){
        test.assertElementCount('#wave-list .waveitem', 1, 'got 1 wave');
        test.assertElementCount('.message', 16, 'got 16 messages');
        this.click('a.getprevmessages');
    })
    .wait(20)
    .then(function(){
        test.assertElementCount('.message', 20, 'got 4 new old messages');

        var i;
        for (i = 0; i < 5; i++) {
            this.fillSelectors('form.add-message', {"textarea": 'rotfl mao ' + i}, true);
        }
    })
    .wait(10)//TODO: new wave with prev user
    .thenOpen("http://localhost:8000/logoutTest")
    .run(function() {
        test.done();
    });
});

casper.test.begin('Login with original user, see unread', 0, function suite(test) {
    casper.start("http://localhost:8000/loginTest", function() {
        this.fillSelectors('form', {
            "input[name='login']": testUserId
        }, true);
    })
    .wait(1500)
    //test what we got
    .then(function() {
        //this.capture('loginagain.png');//meg kell varni
        test.assertElementCount('#wave-list .waveitem', 1, 'got 1 wave');
        test.assertElementCount('.message', 21, 'got 21 messages');
        test.assertElementCount('.message > table.unread', 4, 'got 5 unread messages, focused on 1');

        this.click('a.gounread');
        test.assertElementCount('.message > table.unread', 3, '3 unread messages left after click on unread');
    })
    .run(function() {
        test.done();
    });
});