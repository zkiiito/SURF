/*global app, DisconnectedView, EditUserView, EditWaveView, UserView, WaveListView, WaveView*/
var SurfAppView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addMessage', 'showCreateWave', 'showUpdateWave', 'showEditUser', 'hideOverlays');
        this.model.waves.bind('add', this.addWave);
        this.model.waves.bind('reset', this.resetWaves, this);
        this.model.messages.bind('reset', this.resetMessages, this);
        this.model.messages.bind('add', this.setTitle, this);
        this.model.messages.bind('change:unread', this.setTitle, this);
        this.model.waves.bind('readAll', this.setTitle, this);
        this.model.currentUser.bind('all', this.changeCurrentUser, this);
        //this.createView = null;//gag
        this.render();
    },
    events: {
        'click a.addwave' : 'showCreateWave',
        'click a.edituser' : 'showEditUser',
        'click #darken' : 'hideOverlays'
    },        
    
    render: function() {
        this.setElement($('body'));
        this.editWaveView = new EditWaveView({model: this.model});
        this.$el.append(this.editWaveView.render().el);
        
        this.iconImage = new Image();
        var that = this;
        this.iconImage.onload = function() {
            that.setTitle();
        };
        this.iconImage.src = 'images/surf-ico.png';
        
        $('body').keydown(function(e){
            var nodeName = $(e.target).prop('nodeName');

            if ('INPUT' === nodeName || 'TEXTAREA' === nodeName) {
                return;
            }
            if (32 === e.keyCode) {
                e.preventDefault();
                if (app.currentWave) {
                    app.model.waves.get(app.currentWave).trigger('scrollToNextUnread');
                }
            }
        });        
        
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
            
    showEditUser: function() {
        if (this.editUserView) {
            this.editUserView.show();
        }
        return false;
    },

    showDisconnected: function(reconnect) {
        this.disconnectedView = new DisconnectedView({model: {reconnect: reconnect}});
        this.$el.append(this.disconnectedView.render().el);
        this.disconnectedView.show();
    },

    hideOverlays: function() {
        if (_.isUndefined(this.disconnectedView)) {
            $('#darken').hide();
            $('.overlay').hide();
        }
        return false;
    },
    
    changeCurrentUser: function() {
        var template = new UserView({model: this.model.currentUser});
        this.$el.find('#currentuser').html('').append(template.render().el).append(' <p>' + this.model.currentUser.get('name') + '</p>');
        
        //TODO: destruct first
        this.editUserView = new EditUserView({model: this.model.currentUser});
        this.$el.append(this.editUserView.render().el);        
        
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
        if (this.iconImage.complete) {
            var canvas = document.createElement('canvas'), ctx, txt, link;
            canvas.width = 35;
            canvas.height = 35;
            ctx = canvas.getContext('2d');
            ctx.drawImage(this.iconImage, 0, 0);
            
            if (count > 0) {
                ctx.fillStyle = '#444444';
                ctx.font = 'bold 16px sans-serif';
                txt = count > 99 ? '99+' : count.toString();
                ctx.fillText(txt, 35 - 9 * txt.length, 35);
            }
            
            link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = canvas.toDataURL("image/x-icon");
            $('link[rel="shortcut icon"]').remove();
            $('head').append(link);
        }
    }
});