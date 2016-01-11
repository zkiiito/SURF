/*global app, DisconnectedView, EditUserView, EditWaveView, UserView, WaveListView, WaveView*/
var SurfAppView = Backbone.View.extend({
    initialize: function () {
        _.bindAll(this, 'addMessage', 'showCreateWave', 'showUpdateWave', 'showEditUser', 'hideOverlays', 'addWave');
        this.listenTo(this.model.waves, 'add', this.addWave);
        this.listenTo(this.model.waves, 'reset', this.resetWaves);
        this.listenTo(this.model.waves, 'reset', this.handleEmpty);
        this.listenTo(this.model.waves, 'remove', this.handleEmpty);
        this.listenTo(this.model.messages, 'reset', this.resetMessages);
        this.listenTo(this.model.messages, 'add', this.setTitle);
        this.listenTo(this.model.messages, 'change:unread', this.setTitle);
        this.listenTo(this.model.waves, 'readAll', this.setTitle);
        this.listenTo(this.model, 'initCurrentUser', this.initCurrentUser);
        this.listenTo(this.model, 'ready', this.setTitle);
        this.render();
    },
    events: {
        'click a.addwave' : 'showCreateWave',
        'click a.edituser' : 'showEditUser',
        'click #darken' : 'hideOverlays'
    },

    render: function () {
        this.setElement($('body'));
        this.editWaveView = new EditWaveView({model: this.model});
        this.$el.append(this.editWaveView.render().el);

        this.iconImage = new Image();
        var that = this;
        this.iconImage.onload = function () {
            that.setTitle();
        };
        this.iconImage.src = 'images/surf-ico.png';

        $('.empty').hide();

        $('body').keydown(function (e) {
            var nodeName = $(e.target).prop('nodeName');

            if ('INPUT' === nodeName || 'TEXTAREA' === nodeName) {
                return;
            }
            if (32 === e.keyCode) {
                e.preventDefault();
                if (app.currentWaveId) {
                    document.activeElement.blur();
                    app.model.waves.get(app.currentWaveId).trigger('scrollToNextUnread');
                }
            }
        });

        $(window).resize(function () {
            if ($(window).width() < 1000) {
                $('body').addClass('mobile');
            } else {
                $('body').removeClass('mobile');
                //maybe hide open reply forms
                //change to real mobile-detection
            }
        }).trigger('resize');

        return this;
    },

    addWave: function (wave) {
        var listView = new WaveListView({model: wave}),
            view = new WaveView({model: wave});

        this.handleEmpty();
        $('#wave-list').append(listView.render().el);
        $('#wave-container').append(view.render().el);
    },

    resetWaves: function () {
        this.model.waves.map(this.addWave, this);
    },

    addMessage: function (message) {
        var wave = this.model.waves.get(message.get('waveId'));
        if (wave) {
            wave.addMessage(message);
        }
    },

    resetMessages: function () {
        this.model.messages.map(this.addMessage);
        this.setTitle();
    },

    showCreateWave: function () {
        this.editWaveView.setWave(null);
        this.editWaveView.show();
        return false;
    },

    showUpdateWave: function () {
        this.editWaveView.setWave(app.model.waves.get(app.currentWaveId));
        this.editWaveView.show();
        return false;
    },

    showEditUser: function () {
        if (this.editUserView) {
            this.editUserView.show();
        }
        return false;
    },

    showDisconnected: function (reconnect) {
        this.disconnectedView = new DisconnectedView({model: {reconnect: reconnect}});
        this.$el.append(this.disconnectedView.render().el);
        this.disconnectedView.show();
    },

    hideOverlays: function () {
        if (_.isUndefined(this.disconnectedView)) {
            $('#darken').hide();
            $('.overlay').hide();
        }
        return false;
    },

    initCurrentUser: function () {
        var template = new UserView({model: this.model.currentUser});
        this.$el.find('#currentuser').html('').append(template.render().el).append(' <p class="currentuser_name">' + this.model.currentUser.escape('name') + '</p>');

        this.listenTo(this.model.currentUser, 'change:name', this.changeCurrentUserName);

        this.editUserView = new EditUserView({model: this.model.currentUser});
        this.$el.append(this.editUserView.render().el);

        return false;
    },

    changeCurrentUserName: function () {
        this.$el.find('p.currentuser_name').text(this.model.currentUser.escape('name'));
        return false;
    },

    setTitle: function () {
        if (this.model.ready) {
            var title = 'SURF',
                unreadCount = this.model.messages.where({unread: true}).length;

            if (unreadCount > 0) {
                title = '[' + unreadCount + '] ' + title;
            }
            $('title').text(title);
            this.setIcon(unreadCount);
        }
    },

    setIcon: function (count) {
        if (this.iconImage.complete) {
            try {
                var canvas = document.createElement('canvas'), ctx, txt, link;
                canvas.width = 35;
                canvas.height = 35;
                ctx = canvas.getContext('2d');
                ctx.drawImage(this.iconImage, 0, 0);

                if (count > 0) {
                    txt = count > 99 ? '99+' : count.toString();

                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.7;
                    //ctx.fillRect(35 - txt.length * 9 - 1, 35 - 9 - 5, txt.length * 9 + 1, 9 + 5);
                    ctx.fillRect(34 - txt.length * 9, 21, txt.length * 9 + 1, 14);

                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#847099';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.fillText(txt, 35 - 9 * txt.length, 35);
                }

                link = document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'shortcut icon';
                link.href = canvas.toDataURL("image/x-icon");
                $('link[rel="shortcut icon"]').remove();
                $('head').append(link);
            } catch (e) {
                return e;
            }
        }
    },

    handleEmpty: function () {
        if (0 === app.model.waves.length) {
            $('.empty').show();
        } else {
            $('.empty').hide();
        }
    }
});