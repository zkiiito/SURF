/*@global Communicator */
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

var ga = function(){};
Communicator.socket = {
    emit: function(event) {
        console.log('emit ' + event);
    }
};

//loopbackek
Communicator.sendMessage = function(message, waveId, parentId) {
    var msg = {
        userId: app.currentUser, 
        waveId: waveId, 
        message: message, 
        parentId: parentId,
        _id: app.model.messages.max(function(msg){return msg.id;}).id + 1,
        created_at: new Date().getTime()
    };

    this.onMessage(msg);
};

Communicator.createWave = function(title, userIds) {
    var wave = {
        title: title,
        userIds: userIds,
        _id: app.model.waves.max(function(wave){return wave.id;}).id + 1
    };

    this.onUpdateWave({wave:wave});
};
    
Communicator.updateWave = function(waveId, title, userIds) {
    var wave = {
        _id : waveId,
        title: title,
        userIds: userIds
    };

    this.onUpdateWave({wave:wave});
};

Communicator.getInviteCode = function(waveId) {
    var data = {
        waveId: waveId,
        code: 'xxx'
    };

    this.onInviteCodeReady(data);
};
            
$(function() {
//    Communicator.onInit(testDataInit);
});