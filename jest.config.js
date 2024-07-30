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

	coverageProvider: 'v8',

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
		// Ignore upstream libraries
		'resources/lib/',
		// Ignore index.js initialization scripts
		'resources/ext.wikilambda.app/index.js',
		'resources/ext.wikilambda.languageselector/index.js',
		// These are untested base components - as we add more tests, we should remove them from here
		'resources/ext.wikilambda.app/components/base/Chip.vue',
		'resources/ext.wikilambda.app/components/base/ChipContainer.vue',
		'resources/ext.wikilambda.app/components/base/Table.vue',
		'resources/ext.wikilambda.app/components/base/Tooltip.vue',
		// These are components that will be removed:
		'resources/ext.wikilambda.app/components/main-types/'
	],

	coverageThreshold: {
		// This is our soft target, but doesn't actually affect any of our code as we over-ride below for now
		global: {
			branches: 90,
			lines: 90,
			functions: 90,
			statements: 90
		},
		'./resources/ext.wikilambda.languageselector/': {
			branches: 76,
			lines: 92,
			functions: 91,
			statements: 92
		},
		'./resources/ext.wikilambda.app/': {
			branches: 83,
			lines: 91,
			functions: 90,
			statements: 91
		},
		'./resources/ext.wikilambda.app/mixins': {
			branches: 81,
			lines: 84,
			functions: 91,
			statements: 84
		},
		'./resources/ext.wikilambda.app/store': {
			branches: 88,
			lines: 96,
			functions: 98,
			statements: 96
		}
	},

	// The paths to modules that run some code to configure or set up the testing environment before each test
	setupFiles: [
		'./jest.setup.js'
	]
};
