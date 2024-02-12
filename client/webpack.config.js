const { resolve } = require('path');
const webpack = require('webpack');

module.exports = {
    entry: resolve(__dirname, './src/index.js'),
    output: {
        filename: 'surf.min.js',
        path: resolve(__dirname, './public/js'),
    },
    module: {
        rules: [
            { test: /\.js$/, loader: 'babel-loader', exclude: '/node-modules' }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            'jQuery': 'jquery',
            'Backbone': 'backbone',
            '_': 'underscore'
        })
    ],
    devServer: {
        status: {
            directory: resolve(__dirname, 'public')
        }
    }
};