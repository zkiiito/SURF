module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-jslint'); // load the task

    grunt.initConfig({
        jslint: { // configure the task
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
        }
    });

    grunt.registerTask('default', 'jslint');
};