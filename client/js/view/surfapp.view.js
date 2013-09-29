var SurfAppView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addMessage', 'showCreateWave', 'showUpdateWave', 'hideOverlays');
        this.model.waves.bind('add', this.addWave);
        this.model.waves.bind('reset', this.resetWaves, this);
        this.model.messages.bind('reset', this.resetMessages, this);
        this.model.messages.bind('add', this.setTitle, this);
        this.model.messages.bind('change:unread', this.setTitle, this);
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
        this.editWaveView = new EditWaveView({model: this.model});
        this.$el.append(this.editWaveView.render().el);
        return this;
    },
    
    addWave: function(wave) {
        var listView = new WaveListView({model: wave}),
            view = new WaveView({model: wave});
        
        $('#wave-list').append(listView.render().el);		
        $('#wave-container').append(view.render().el);
    },
    
    resetWaves: function() {
        this.model.waves.map(this.addWave);
    },
    
    addMessage: function(message) {
        var wave = this.model.waves.get(message.get('waveId'));
        if (wave) {
            wave.addMessage(message);
        }
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
        var title = 'Surf',
            unreadCount = this.model.messages.where({unread: true}).length;
        
        if (unreadCount > 0) {
            title = '[' + unreadCount + '] ' + title;
        }
        $('title').text(title);
        this.setIcon(unreadCount);
    },
            
    setIcon: function(count) {
        var link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = '/images/surf-ico.png';
        link.id = 'favicon';

        //remove old, chrome
        $('#favicon').remove();

        if (count > 0) {
            var canvas = document.createElement('canvas');
            canvas.width = 35;
            canvas.height = 35;
            var ctx = canvas.getContext('2d');
            var img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                ctx.fillStyle = '#444444';
                ctx.font = 'bold 16px sans-serif';
                var txt = count > 99 ? '99+' : count.toString();
                ctx.fillText(txt, 35 - 9 * txt.length, 35);
                
                link.href = canvas.toDataURL("image/x-icon");
                
                document.getElementsByTagName('head')[0].appendChild(link);
            };
            img.src = '/images/surf-ico.png';
        } else {
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    }
});