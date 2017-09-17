/*global app, Communicator */
var Message, MessageCollection;

Message = Backbone.Model.extend(
    /** @lends Message.prototype */
    {
        defaults: {
            userId: null,
            waveId: null,
            parentId: null,
            message: '',
            unread: true,
            created_at: null,
            created_at_date: null
        },
        idAttribute: '_id',
        /** @constructs */
        initialize: function () {
            this.messages = null;
            this.linkPreviews = [];
            this.user = app.model.users.getUser(this.get('userId'));
            this.formatMessage();
            this.set('created_at_date', new Date(this.get('created_at')));
            if (!this.isNew()) {
                this.set('unread', this.get('unread') && app.model.currentUser.id !== this.get('userId'));
            }
        },

        /**
         * @param {Message} message
         */
        addReply: function (message) {
            if (null === this.messages) {
                this.messages = new MessageCollection();
                this.trigger('messagesCreated');
            }
            this.messages.add(message);
        },

        read: function () {
            if (this.get('unread')) {
                this.set('unread', false);
                Communicator.readMessage(this);
            }
        },

        setCurrent: function () {
            this.getWave().setCurrentMessage(this.id);
        },

        setScrolled: function () {
            this.trigger('change:scrolled');
        },

        formatMessage: function () {
            /*global strip_tags, nl2br, wordwrap */
            var parts, i, c, matched, url, urlText,
                msg = this.get('message'),
                urlRegex = /((https?:\/\/|www\.)\S+)/g,
                urlPictureRegex = /\.(jpg|png|gif)(\?.*)?$/ig,
                urlVideoRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]+).*/gim,
                urlVideoRegexYoutube = /.*youtu.*/im,
                replacement = '';

            msg = msg.replace(/</g, '&lt;');
            msg = msg.replace(/>/g, '&gt;');
            msg = msg.replace(/\n/g, ' \n');
            msg = strip_tags(msg);
            parts = msg.split(' ');
            for (i = 0, c = parts.length; i < c; i++) {
                matched = parts[i].match(urlRegex);
                if (matched) {
                    url = urlText = matched[0];
                    urlText = urlText.length > 53 ? urlText.substr(0, 50) + '...' : urlText;
                    url = 'http' === url.substr(0, 4) ? url : 'http://' + url;

                    if (app.model.currentUser.get('showPictures') && url.match(urlPictureRegex)) {
                        replacement = '<br><a href="' + url + '" target="_blank"><img width="420" src="' + url + '"></a>';
                    } else if (app.model.currentUser.get('showVideos') && url.match(urlVideoRegex) && url.match(urlVideoRegexYoutube)) {
                        url = urlVideoRegex.exec(url);
                        replacement = '<br><iframe width="420" height="315" src="https://youtube.com/embed/' + url[2] + '" frameborder="0" allowfullscreen></iframe>';
                    } else {
                        replacement = '<a href="' + url + '" target="_blank">' + urlText + '</a>';

                        if (app.model.currentUser.get('showLinkPreviews')) {
                            Communicator.getLinkPreview(url, this);
                        }
                    }

                    parts[i] = parts[i].replace(matched[0], replacement);
                } else {
                    parts[i] = wordwrap(parts[i], 200, ' ', true);
                }
            }

            msg = parts.join(' ');
            msg = nl2br(msg, true);

            this.set('messageFormatted', msg);
        },

        /**
         * @returns {number}
         */
        getSortableId: function () {
            if (!this.sortableId) {
                if (this.id.toString().length === 24) {
                    var timestamp = Number('0x' + this.id.substr(0, 8)),
                        //machine = Number('0x' + this.id.substr(8, 6)),
                        //pid = Number('0x' + this.id.substr(14, 4)),
                        increment = Number('0x' + this.id.substr(18, 6));
                    //https://gist.github.com/zippy1981/780246
                    //#45 - was not working, refactored
                    this.sortableId = timestamp + increment % 1000 / 1000;
                } else {
                    this.sortableId = this.id;
                }
            }
            return this.sortableId;
        },

        /**
         * @returns {boolean}
         */
        readAllMessages: function () {
            var unread = this.get('unread');
            this.set({'unread': false}, {'silent': true});

            return unread;
        },

        /**
         * @param {number} minId
         * @param {boolean} downOnly
         * @returns {Message}
         */
        getNextUnread: function (minId, downOnly, checkedIds) {
            if (_.indexOf(checkedIds, this.getSortableId()) > -1) {
                return null;
            }

            //check this
            checkedIds.push(this.getSortableId());

            if (this.getSortableId() > minId && this.get('unread')) {
                return this;
            }

            //check children
            var msgs = this.messages ? this.messages.toArray() : [],
                nextUnread = null,
                i;

            for (i = 0; i < msgs.length; i++) {
                nextUnread = msgs[i].getNextUnread(minId, true, checkedIds);
                if (nextUnread) {
                    return nextUnread;
                }
            }

            //check parent
            if (!nextUnread && this.get('parentId') && !downOnly) {
                return app.model.messages.get(this.get('parentId')).getNextUnread(0, false, checkedIds);
            }

            return nextUnread;
        },

        /**
         * @returns {number}
         */
        getRootId: function () {
            if (this.get('parentId')) {
                return app.model.messages.get(this.get('parentId')).getRootId();
            }
            return this.getSortableId();
        },

        /**
         * @returns {Wave}
         */
        getWave: function () {
            return app.model.waves.get(this.get('waveId'));
        },

        /**
         * @returns {boolean}
         */
        isCurrentUserMentioned: function () {
            if (this.get('unread')) {
                var searchString = '@' + app.model.currentUser.get('name');
                return this.get('message').indexOf(searchString) >= 0;
            }
            return false;
        },

        addLinkPreview: function (data) {
            this.linkPreviews.push(data);
            this.trigger('linkpreview', data);
        }
    }
);

/** @class */
MessageCollection = Backbone.Collection.extend(
    /** @lends MessageCollection.prototype */
    {
        model: Message,

        /**
         * @param {Message} msg
         * @returns {number}
         */
        comparator: function (msg) {
            return msg.getSortableId();
        }
    }
);