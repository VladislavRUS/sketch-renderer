module.exports = {
    js: {
        src: [
            'node_modules/babel-polyfill/dist/polyfill.js',
            'node_modules/jquery/dist/jquery.min.js',
            'static/scripts/js/*.js'
        ],
        dest: 'static/scripts',
        prodDest: 'dist/scripts',
        watch: 'static/scripts/js/*.js'
    },
    scss: {
        src: 'static/styles/scss/main.scss',
        dest: 'static/styles',
        prodDest: 'dist/styles',
        watch: 'static/styles/scss/**/*.scss'
    },
    html: {
        src: 'static/index.html',
        prodDest: 'dist',
        watch: 'static/index.html',
    },
    assets: {
        src: 'static/assets/**',
        prodDest: 'dist/assets'
    },
    images: {
        src: 'dist/assets/images/**/*'
    }
}