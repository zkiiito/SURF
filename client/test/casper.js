var testDataInit = {
    me: {_id:3,name: 'tibor',avatar: 'images/head5.png', status: 'online'},
    users: [
        {_id:1,name: 'csabcsi',avatar: 'images/head3.png', status: 'online'},
        {_id:2,name: 'leguan',avatar: 'images/head2.png'},
        {_id:4,name: 'klara',avatar: 'images/head4.png'}
    ],
    
    waves: [{_id:1,title: 'Csillag-delta tejbevávé', userIds: [1,2,3,4]}],
    
    messages: [
        {_id:1, waveId:1, userId:1,
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:2, waveId:1, userId:1, 
            message: 'Tenderloin corned beef venison sirloin, pork loin cow bresaola. Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Beef corned beef ham pork turkey pork chop, prosciutto fatback short loin meatloaf filet mignon turducken pastrami frankfurter chuck. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:3, waveId:1, userId:3, parentId: 1, 
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. '},
        {_id:4, waveId:1, userId:1, parentId: 1, 
            message: 'Herp derp'},
        {_id:5, waveId:1, userId:2, parentId: 2, 
            message: 'Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'},
        {_id:6, waveId:1, userId:4, parentId: 5, 
            message: 'Leberkas brisket turducken tri-tip, pancetta ball tip corned beef tail. Sausage cow brisket, tail drumstick shank pancetta rump beef ribs hamburger. Kielbasa sausage andouille, bresaola bacon tail ball tip. Boudin spare ribs turkey prosciutto tenderloin bresaola. Rump turkey pork loin jowl ham andouille strip steak short loin pastrami.'}
    ]    
};



casper.test.begin('Google search retrieves 10 or more results', 6, function suite(test) {
    casper.start("http://localhost/wave/surf/client/testPhantom.html", function() {
		casper.evaluate(function(data) {
			Communicator.onInit(data);
		}, testDataInit);
    });

    casper.then(function() {
		test.assertElementCount('.message', 6);
		test.assertElementCount('#wave-list .waveitem', 1);
		test.assertElementCount('.message > table.unread', 5);
    });
	
	//after init, click on next unread
	casper.then(function() {
		test.assertElementCount('.message > table.unread', 4);
		casper.click('a.gounread');
	});
	
	//after unread, write reply
	casper.then(function() {
		test.assertElementCount('.message > table.unread', 3);
		
		casper.fill('form.add-message', {
			'message': 'lol fsa'
		}, true);
	});
	casper.wait(1200);
	
	casper.then(function(){
		
		casper.capture('f.png');
		test.assertElementCount('.message', 7);
	});
	
	

    casper.run(function() {
        test.done();
    });
});