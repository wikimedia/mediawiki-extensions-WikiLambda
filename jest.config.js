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
		'codex.js': '<rootDir>/node_modules/@wikimedia/codex/dist/codex.cjs',
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
		'resources/ext.wikilambda.app/Constants.js',
		'resources/ext.wikilambda.languageselector/index.js',
		// These are untested base components,
		// waiting for replacement with Codex alternatives; to drop!
		// TODO (T373197): Replace with Codex's Table
		'resources/ext.wikilambda.app/components/base/Table.vue'
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
			branches: 87,
			lines: 95,
			functions: 95,
			statements: 95
		},
		'./resources/ext.wikilambda.app/mixins': {
			branches: 83,
			lines: 88,
			functions: 98,
			statements: 88
		},
		'./resources/ext.wikilambda.app/store': {
			branches: 86,
			lines: 95,
			functions: 99,
			statements: 95
		}
	},

	// The paths to modules that run some code to configure or set up the testing environment
	// before each test
	setupFiles: [
		'./jest.setup.js'
	]
};
