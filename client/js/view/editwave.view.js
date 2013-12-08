var EditWaveView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show', 'hide', 'setWave', 'genUserArray', 'inviteCodeReady');
        this.userArray = [];
        this.model.users.bind('add', this.genUserArray, this);
        this.model.users.bind('change', this.genUserArray, this);
    },
    events: {
        'click a.close' : 'hide',
        'submit form' : 'editWave',
        'click button#editwave-invite' : 'getInviteCode'
    },
    
    render: function() {
        var template = ich.editwave_view();
        this.setElement(template);
        this.$el.hide();
        return this;
    },
    
    genUserArray: function() {
        var userArray = [];
        
        this.model.users.each(function(user){
            var obj = {id: user.id, name: user.get('name')};
            
            if (user.id === app.currentUser) {
                obj.readonly = true;
            }
            
            userArray.push(obj);
        }, this);
        
        this.userArray = userArray;
    },
    
    initUserSuggest: function() {
        if (this.inited) {
            return;
        }
        
        this.genUserArray();
        
        this.$el.find('#editwave-users').tokenInput([], {
            theme: "facebook",
            preventDuplicates: true,
            hintText: __('Enter username.'),
            noResultsText: __('User not found.'),
            searchingText: _('Searching...')
        });
        this.inited = true;
    },
    
    updateUserSuggest: function() {
        this.initUserSuggest();
        
        $('#editwave-users').data("settings").local_data = this.userArray;
        
        var suggest = this.$el.find('#editwave-users');
        suggest.tokenInput('clear');
        
        if (this.wave) {
            this.wave.users.each(function(user){
                suggest.tokenInput('add', {id: user.id, name: user.get('name'), readonly: true});
            });
        } else {
            var currentUser = this.model.users.get(app.currentUser);
            suggest.tokenInput('add', {id: currentUser.id, name: currentUser.get('name'), readonly: true});
        }
        
    },
    
    show: function() {
        this.$el.find('#editwave-invitecode-block').hide();
        
        if (this.wave) {
            this.$el.find('input[name=title]').val(this.wave.get('title'));
            this.$el.find('h2').text(__('Edit conversation'));
            this.$el.find('#editwave-submit').text(__('Save'));
            this.$el.find('#editwave-invite').show();
        } else {
            this.$el.find('input[name=title]').val('');
            this.$el.find('h2').text(__('New conversation'));
            this.$el.find('#editwave-submit').text(__('Create'));
            this.$el.find('#editwave-invite').hide();
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
        this.wave = this.model.waves.get(waveId);
        if (this.wave) {
            this.wave.bind('inviteCodeReady', this.inviteCodeReady, this);
        }
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
    },
            
    getInviteCode: function(e) {
        e.preventDefault();
        this.$el.find('button#editwave-invite').hide();
        Communicator.getInviteCode(this.wave.id);
    },
            
    inviteCodeReady: function(code) {
        //this.$el.find('button#editwave-invite').show(); ??
        this.$el.find('#editwave-invitecode-block').show();
        var invitecode = document.location.protocol + '//' + document.location.host + '/invite/' + code;
        this.$el.find('#editwave-invitecode').val(invitecode).focus().select();
    }
});