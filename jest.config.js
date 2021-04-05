module.exports = {
	// Vue-jest specific global options (described here: https://github.com/vuejs/vue-jest#global-jest-options)
	globals: {
		babelConfig: false,
		hideStyleWarn: true,
		experimentalCssCompile: true
	},

	// This and "transform" below are the most crucial for vue-jest:
	// https://github.com/vuejs/vue-jest#setup
	moduleFileExtensions: [
		'js',
		'json',
		'vue'
	],

	transform: {
		'.*\\.(vue)$': '<rootDir>/node_modules/vue-jest'
	},

	// Indicates whether the coverage information should be collected while executing the test
	collectCoverage: true,

	// An array of glob patterns indicating a set of files for which coverage information should be collected
	collectCoverageFrom: [
		'resources/**/*.(js|vue)'
	],

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// An array of regexp pattern strings used to skip coverage collection
	coveragePathIgnorePatterns: [
		'/node_modules/',
		'resources/components/index.js', // these are examples; you may have init or index scaffolding
		'resources/plugins/index.js', // files which you don't want included in coverage
		'resources/init.js',
		'resources/vendor/',
		'resources/lib/ace/',
		'resources/ext.wikilambda.edit/components/base/'
	],

	// The paths to modules that run some code to configure or set up the testing environment before each test
	setupFiles: [
		'./jest.setup.js'
	]
};
