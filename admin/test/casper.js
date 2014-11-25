/*global casper */
casper.options.viewportSize = {width: 1000, height: 600};

casper.on("remote.message", function (message) {
    this.echo("remote console.log: " + message);
});

casper.on('page.error', function (message, trace) {
    this.capture('error.png');
    this.echo('remote error caught: ' + message, 'ERROR');
});

casper.test.begin('Admin login, click, update', 0, function suite(test) {
    casper
        .start("http://localhost:8000/admin")
        .waitForUrl("http://localhost:8000/admin/login", function () {
            this.fillSelectors('form', {
                "input[name='username']": 'admin',
                "input[name='password']": 'adminPass'
            }, true);
        })
        .waitForUrl("http://localhost:8000/admin")
        .waitForSelector('tr:first-child td a:first-child', function () {
            this.click('tr:first-child td.editable a:first-child');
        })
        .waitForSelector('.userview', function () {
            this.click('ul.nav a.users');
        })
        .waitForSelector('td.renderable img', function () {
            this.click('ul.nav a.waveinvites');
        })
        .run(function () {
            test.done();
        });
});
