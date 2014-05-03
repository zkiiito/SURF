/*global R*/
/*jslint newcap: true*/
var i18n = {
    init: function() {
        R.registerLocale('hu-HU', {
            'Next unread': 'Köv. olvasatlan',
            'Edit': 'Szerkesztés',
            'Read all': 'Mindet olvasottá',
            'Leave conversation': 'Kilépés',
            '{{ usercount }} users' : '{{ usercount }} résztvevő',
            'Press Return to send, Shift-Return to break line.': 'Nyomj Entert a mentéshez, Shift-Entert a sortöréshez.',
            'Save message' : 'Üzenet mentése',
            'Older messages': 'Régebbi üzenetek',
            'New message' : 'Új üzenet',
            'Reply to {{ user.name }}\'s message': 'Válasz {{ user.name }} üzenetére',
            'Cancel': 'Mégse',
            'Close': 'Bezárás',
            'New conversation': 'Új beszélgetés',
            'New conversation +': 'Új beszélgetés +',
            'Title': 'Beszélgetés címe',
            'Participants': 'Résztvevők',
            'Create': 'Létrehozás',
            'Log out': 'Kijelentkezés',

            'Edit conversation': 'Beszélgetés szerkesztése',
            'Save': 'Mentés',
            'Searching...': 'Keresés...',
            "User not found.": "Nincs ilyen felhasználónk.",
            'Enter username.': 'Írj be egy felhasználónevet.',
            "Do you want to leave conversation {{ title }}?\n\nIf you want to come back later, participants can invite you": "Biztosan kilépsz a következő beszélgetésből: {{ title }}?\n\nHa később vissza szeretnél lépni, a beszélgetés résztvevői újra meghívhatnak.",

            "Get invite code": "Meghívó igénylés",
            "Invite URL": "Meghívó URL"
        });

        R.setLocale('hu-HU');

        i18n.translateTemplates();
        i18n.applyR($('body'));
    },

    applyR: function(context) {
        $('.R', context).each(function() {
            var el = $(this);
            //console.log(el.html() + ' ' + R(el.html()));
            if (el.prop('placeholder')) {
                el.prop('placeholder', R(el.prop('placeholder')));
            }

            el.html(R(el.html())).removeClass('R');
        });
    },

    translateTemplates: function () {
        var i, l, script, ctx,
            scripts = document.getElementsByTagName('script');

        for (i = 0, l = scripts.length; i < l; i++) {
            script = scripts[i];
            if (script && script.innerHTML && script.id && (script.type === "text/html" || script.type === "text/x-icanhaz")) {
                ctx = $(script.innerHTML);
                i18n.applyR(ctx);
                script.innerHTML = $('<div>').append(ctx).html();
            }
        }
    },

    __: function(txt) {
        return R(txt);
    }
};
/*jslint newcap: false*/
i18n.init();
var __ = i18n.__;