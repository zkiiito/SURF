module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-text-replace');

    var jsFiles = [
        "node_modules/socket.io/node_modules/socket.io-client/socket.io.js",
        "node_modules/underscore/underscore.js",
        "node_modules/backbone/backbone.js",
        "node_modules/R.js/R.js",
        "client/js/i18n.js",
        "client/js/jquery/jquery.tokeninput.js",
        "node_modules/dateformat/lib/dateformat.js",
        "node_modules/phpjs/functions/strings/strip_tags.js",
        "node_modules/phpjs/functions/strings/nl2br.js",
        "node_modules/phpjs/functions/strings/wordwrap.js",
        "client/js/randomname.js",
        "client/js/model/user.model.js",
        "client/js/model/wave.model.js",
        "client/js/model/message.model.js",
        "client/js/model/surfapp.model.js",
        "client/js/view/user.view.js",
        "client/js/view/wavelist.view.js",
        "client/js/view/wave.view.js",
        "client/js/view/message.view.js",
        "client/js/view/wavereplyform.view.js",
        "client/js/view/messagereplyform.view.js",
        "client/js/view/editwave.view.js",
        "client/js/view/edituser.view.js",
        "client/js/view/disconnected.view.js",
        "client/js/view/surfapp.view.js",
        "client/js/communicator.js",
        "client/js/surf.js"
    ];

    var jsFilesAdmin = [
        "node_modules/underscore/underscore.js",
        "node_modules/backbone/backbone.js",
        "admin/js/lib/backbone.paginator.js",
        "admin/js/lib/bootstrap.js",
        "admin/js/lib/backgrid.js",
        "admin/js/lib/extensions/paginator/backgrid-paginator.js",
        "admin/js/lib/extensions/text-cell/backgrid-text-cell.js",
        "admin/js/admin.js",
        "admin/js/model/message.model.js",
        "admin/js/model/user.model.js",
        "admin/js/model/wave.model.js",
        "admin/js/model/waveinvite.model.js",
        "admin/js/view/user.view.js"
    ];

    grunt.initConfig({
        jslint: {
            server: {
                src: [
                    'code/**/*.js'
                ],
                directives: {
                    node: true,
                    maxerr: 1000,
                    nomen: true,
                    sloppy: true,
                    plusplus: true,
                    predef: [
                        'Backbone', '_'
                    ]
                },
                options: {
                    errorsOnly: true, // only display errors
                    failOnError: false // defaults to true
                }
            },
            client: {
                src: [
                    'client/js/**/*.js'
                ],
                exclude: [
                    'client/js/**/jquery*',
                    'client/js/surf.min.js'
                ],
                directives: {
                    browser: true,
                    maxerr: 1000,
                    nomen: true,
                    sloppy: true,
                    plusplus: true,
                    predef: [
                        'app', '$', 'Backbone', '_', '_gaq', 'ga', '__'
                    ]
                },
                options: {
                    errorsOnly: true, // only display errors
                    failOnError: false // defaults to true
                }
            },
            admin: {
                src: [
                    'admin/js/**/*.js'
                ],
                exclude: [
                    'admin/js/lib/**/*.js',
                    'admin/js/admin.min.js'
                ],
                directives: {
                    browser: true,
                    maxerr: 1000,
                    nomen: true,
                    sloppy: true,
                    plusplus: true,
                    predef: [
                        '$', 'Backbone', '_', 'Backgrid'
                    ]
                },
                options: {
                    errorsOnly: true, // only display errors
                    failOnError: false // defaults to true
                }
            }
        },
        uglify: {
            client: {
                files: {
                    'client/js/surf.min.js': jsFiles
                }
            },
            admin: {
                files: {
                    'admin/js/admin.min.js': jsFilesAdmin
                }
            }
        },
        concat: {
            client: {
                src: jsFiles,
                dest: 'client/js/surf.min.js'
            },
            admin: {
                src: jsFilesAdmin,
                dest: 'admin/js/admin.min.js'
            }
        },
        replace: {
            test: {
                src: 'client/index.html',
                dest: 'client/test.html',
                replacements: [{
                    from: '<script src="js/surf.min.js"></script>',
                    to: '<script src="js/surf.min.js"></script><script src="test/test.js"></script>'
                }, {
                    from: '//code.jquery',
                    to: 'http://code.jquery'
                }]
            }
        }
    });

    grunt.registerTask('default', 'jslint');
};