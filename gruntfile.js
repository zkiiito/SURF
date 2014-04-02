module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-jslint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.initConfig({
        jslint: {
            server: {
                src: [
                    'code/**/*.js'
                ],
                directives: {
                    node: true,
                    white: true,
                    maxerr: 1000,
                    nomen: true,
                    sloppy: true,
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
                    'client/js/phpjs.js',
                    'client/js/surf.min.js',
                    'client/js/date.format.js'
                ],
                directives: {
                    white: true,
                    browser: true,
                    maxerr: 1000,
                    nomen: true,
                    sloppy: true,
                    predef: [
                        'app', '$', 'Backbone', '_', '_gaq', 'ga', '__'
                    ]
                },
                options: {
                    errorsOnly: true, // only display errors
                    failOnError: false // defaults to true
                }
            }
        },
        uglify: {
            prod: {
                files: {
                    'client/js/surf.min.js': [
                        "node_modules/underscore/underscore.js",
                        "node_modules/backbone/backbone.js",
                        "node_modules/R.js/R.js",
                        "client/js/i18n.js",
                        "client/js/jquery.tokeninput.js",
                        "client/js/date.format.js",
                        "client/js/phpjs.js",
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
                    ]
                }
            }
        },
        concat: {
            dev: {
                src: [
                    "node_modules/underscore/underscore.js",
                    "node_modules/backbone/backbone.js",
                    "node_modules/R.js/R.js",
                    "client/js/i18n.js",
                    "client/js/jquery.tokeninput.js",
                    "client/js/date.format.js",
                    "client/js/phpjs.js",
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
                ],
                dest: 'client/js/surf.min.js'
            }
        }
    });

    grunt.registerTask('default', 'jslint');
};