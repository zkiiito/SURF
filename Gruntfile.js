module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-uncss');

    grunt.initConfig({
        uncss: {
          web: {
            files: {
              'css/style-min.css': ['index.html']
            },
            options: {
              ignore: ['.btn-success', '.glyphicon-ok', '.form-control[readonly]', '.form-control[disabled]']
            }
		  }
        }
    });

    grunt.registerTask('default', 'uncss');
};