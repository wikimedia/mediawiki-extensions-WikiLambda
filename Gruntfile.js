/* eslint-env node, es6 */
module.exports = function ( grunt ) {
	var conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		eslint: {
			options: {
				fix: grunt.option( 'fix' ),
				cache: true
			},
			all: '.'
		},
		banana: conf.MessagesDirs,
		stylelint: {
			options: {
				cache: true
			},
			all: '**/*.{css,less,vue}'
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'banana', 'stylelint' ] );
};
