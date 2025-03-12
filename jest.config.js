/*!
 * Configuration for the WikiLambda browser jest UX unit testing suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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

	moduleNameMapper: {
		'codex.js': '<rootDir>/tests/jest/helpers/loadCodexComponents.js',
		'icons.json': '<rootDir>/tests/jest/fixtures/icons.json'
	},

	transform: {
		'.*\\.(vue)$': '<rootDir>/node_modules/@vue/vue3-jest'
	},

	testEnvironment: 'jsdom',

	clearMocks: true,

	coverageProvider: 'v8',

	// Indicates whether the coverage information should be collected while executing the test
	collectCoverage: true,

	// An array of glob patterns of the files for which coverage information should be collected
	collectCoverageFrom: [
		'resources/**/*.(js|vue)'
	],

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// An array of regexp pattern strings used to skip coverage collection
	coveragePathIgnorePatterns: [
		// Ignore upstream libraries
		'resources/lib/',
		// Ignore index.js initialization scripts
		'resources/ext.wikilambda.app/index.js',
		'resources/ext.wikilambda.app/components/index.js',
		'resources/ext.wikilambda.app/Constants.js',
		'resources/ext.wikilambda.languageselector/index.js',
		// TODO (T387560): Remove ignore rule of visual editor components
		'resources/ext.wikilambda.app/store/stores/visualeditor.js',
		'resources/ext.wikilambda.app/components/visualeditor/'
	],

	coverageThreshold: {
		// This is our soft target, but doesn't actually affect any of our code as we over-ride
		// below for now
		global: {
			branches: 90,
			lines: 90,
			functions: 90,
			statements: 90
		},
		'./resources/ext.wikilambda.languageselector/': {
			branches: 93,
			lines: 98,
			functions: 94,
			statements: 98
		},
		'./resources/ext.wikilambda.app/': {
			branches: 85,
			lines: 95,
			functions: 95,
			statements: 95
		},
		'./resources/ext.wikilambda.app/mixins': {
			branches: 82,
			lines: 88,
			functions: 98,
			statements: 88
		},
		'./resources/ext.wikilambda.app/utils': {
			branches: 82,
			lines: 88,
			functions: 98,
			statements: 88
		},
		'./resources/ext.wikilambda.app/store': {
			branches: 84,
			lines: 94,
			functions: 97,
			statements: 94
		},
		'./resources/ext.wikilambda.visualeditor': {
			branches: 0,
			lines: 0,
			functions: 0,
			statements: 0
		}
	},

	// The paths to modules that run some code to configure or set up the testing environment
	// before each test
	setupFiles: [
		'./jest.setup.js'
	]
};
