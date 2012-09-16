var EditWaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show', 'hide', 'setWave');
    },
    events: {
        'click a.close' : 'hide',
        'submit form' : 'editWave'
    },
    
    render: function() {
        var template = ich.editwave_view();
        this.setElement(template);
        this.$el.hide();
        return this;
    },
    
    initUserSuggest: function() {
        if (this.inited) return;
        var userArray = [];
        
        app.model.users.each(function(user){
            var obj = {id: user.id, name: user.get('name')};
            //hogy?
            if (user.id === app.currentUser) {
                obj.readonly = true;
            }
            
            userArray.push(obj);
        }, this);
        
        this.$el.find('#editwave-users').tokenInput(userArray, {
            theme: "facebook",
            preventDuplicates: true,
            hintText: "Írj be egy felhasználónevet.",
            noResultsText: "Nincs ilyen felhasználónk.",
            searchingText: "Keresés..."
        });  
        this.inited = true;
    },
    
    updateUserSuggest: function() {
        this.initUserSuggest();
        var suggest = this.$el.find('#editwave-users');
        suggest.tokenInput('clear');
        
        if (this.wave) {
            this.wave.users.each(function(user){
                suggest.tokenInput('add', {id: user.id, name: user.get('name'), readonly: true});
            });
        } else {
            var currentUser = app.model.users.get(app.currentUser);
            suggest.tokenInput('add', {id: currentUser.id, name: currentUser.get('name'), readonly: true});
        }
        
    },
    
    show: function() {
        if (this.wave) {
            this.$el.find('input[name=title]').val(this.wave.get('title'));
            this.$el.find('h2').text('Beszélgetés szerkesztése');
            this.$el.find('#editwave-submit').text('Mentés');
        } else {
            this.$el.find('input[name=title]').val('');
            this.$el.find('h2').text('Új beszélgetés');
            this.$el.find('#editwave-submit').text('Létrehozás');
        }
        
        this.updateUserSuggest();

        //this.$el.find('form').reset();???
        this.$el.show();
        $('#darken').show();
        return false;
    },
    
    hide: function() {
        this.$el.hide();
        $('#darken').hide();
        return false;
    },
    
    setWave: function(waveId) {
        this.wave = app.model.waves.get(waveId);
    },
    
    editWave: function() {
        var title = this.$el.find('#editwave-title').val(),
            users = this.$el.find('#editwave-users').tokenInput('get'),
            userIds = _.pluck(users, 'id');
        //userIds.push(app.currentUser);
        
        if (this.wave) {
            Communicator.updateWave(this.wave.id, title, userIds);
        } else {
            Communicator.createWave(title, userIds);
        }
        
        return this.hide();
    }
});