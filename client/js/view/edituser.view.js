var EditUserView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'show', 'hide');
        this.model.bind('change', this.render, this);
    },
    events: {
        'click a.close' : 'hide',
        'submit form' : 'saveUser'
    },
    
    render: function() {
        var template = ich.edituser_view();
        this.setElement(template);
        this.$el.hide();
        
        this.$el.find('#edituser-name').val(this.model.get('name'));
        this.$el.find('#edituser-avatar').val(this.model.get('avatar'));
        
        return this;
    },
        
    show: function() {
        this.$el.show();
        $('#darken').show();
        return false;
    },
    
    hide: function() {
        this.$el.hide();
        $('#darken').hide();
        return false;
    },
        
    saveUser: function() {
        var name = this.$el.find('#edituser-name').val(),
            avatar = this.$el.find('#edituser-avatar').val();

        //callback a servertol updateli majd az usert!
        //Communicator.updateUser(name, avatar);
        
        return this.hide();
    }
});