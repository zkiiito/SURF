describe('init', function(){
    it('should has an app', function(){
        expect(app).not.toBe(null);
    });
    
    it('should has a Communicator', function(){
        expect(Communicator).not.toBe(null);
    });
    
    it('should have testdata', function(){
        expect(testDataInit).not.toBe(null);
    });
    
    it('should init nicely', function(){
        Communicator.onInit(testDataInit);
        
        expect(app.currentUser).toEqual(3);
        expect(app.model.users.length).toEqual(4);
        expect(app.model.users.where({status: 'online'}).length).toEqual(2);
        expect(app.model.waves.length).toEqual(1);
        expect(app.model.waves.at(0).messages.length).toEqual(6);
        expect(app.model.waves.at(0).messages.where({unread: true}).length).toEqual(5);//1 egybol elolvasodik
    });
    
    describe('init-view', function() {
        beforeEach(function(done) {
            setTimeout(function() {
                done();
            }, 10);
        });

        it("should init the view", function(done) {
            expect(app.model.waves.at(0).messages.where({unread: true}).length).toEqual(4);//1 egybol elolvasodik
            expect($('.waveitem', '#wave-list').size()).toEqual(1);
            expect($('.message:visible').size()).toEqual(6);
            done();
        });
    });
});