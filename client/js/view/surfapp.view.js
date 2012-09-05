var SurfAppView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addMessage', 'showCreateWave', 'showUpdateWave', 'hideOverlays');
        this.model.waves.bind('add', this.addWave);
        this.model.waves.bind('reset', this.resetWaves, this);
        this.model.messages.bind('reset', this.resetMessages, this);
        this.model.messages.bind('add', this.setTitle, this);
        this.model.currentUser.bind('all', this.changeCurrentUser, this);
        //this.createView = null;//gag
        this.render();
    },
    events: {
        'click a.addwave' : 'showCreateWave',
        'click #darken' : 'hideOverlays'
    },        
    
    render: function() {
        this.setElement($('body'));    
        this.editWaveView = new EditWaveView();
        this.$el.append(this.editWaveView.render().el);    
        return this;
    },
    
    addWave: function(wave) {
        var listView = new WaveListView({
            model: wave
        });
        $('#wave-list').append(listView.render().el);
		
        var view = new WaveView({
            model: wave
        });
        $('#wave-container').append(view.render().el);
	
    },
    
    resetWaves: function() {
        this.model.waves.map(this.addWave);
    },
    
    addMessage: function(message) {
        var wave = this.model.waves.get(message.get('waveId'));
        if (wave)
            wave.addMessage(message);
    },
    
    resetMessages: function() {
        this.model.messages.map(this.addMessage);
        this.setTitle();
    },
    
    showCreateWave: function() {
        this.editWaveView.setWave(null);
        this.editWaveView.show();
        return false;
    },
    
    showUpdateWave: function() {
        this.editWaveView.setWave(app.currentWave);
        this.editWaveView.show();
        return false;
    },
    
    hideOverlays: function() {
        $('#darken').hide();
        $('.overlay').hide();
        return false;
    },
    
    changeCurrentUser: function() {
        var template = new UserView({model: this.model.currentUser});
        this.$el.find('#currentuser').html('').append(template.render().el).append(' <p>' + this.model.currentUser.get('name') + '</p>');
        return false;
    },
    
    setTitle: function() {
        var title = 'Surf';
        var unreadCount = this.model.messages.where({unread: true}).length;
        
        if (unreadCount > 0) {
            title = '[' + unreadCount + '] ' + title;
        }
        $('title').text(title);
    }
});