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

	// Use the compatibility build of Vue 3
	moduleNameMapper: {
		'^vue$': '@vue/compat',
		'icons.json': '<rootDir>/tests/jest/fixtures/icons.json'
	},

	transform: {
		'.*\\.(vue)$': '<rootDir>/node_modules/@vue/vue3-jest'
	},

	testEnvironment: 'jsdom',

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
		'resources/lib/', // These are upstream libraries
		// These are untested base components - as we add more tests, we should remove them from here
		'resources/ext.wikilambda.edit/components/base/Chip.vue',
		'resources/ext.wikilambda.edit/components/base/ChipContainer.vue',
		'resources/ext.wikilambda.edit/components/base/CodeEditor.vue',
		'resources/ext.wikilambda.edit/components/base/Dialog.vue',
		'resources/ext.wikilambda.edit/components/base/DialogContainer.vue',
		'resources/ext.wikilambda.edit/components/base/ExpandedToggle.vue',
		'resources/ext.wikilambda.edit/components/base/LeaveEditorDialog.vue',
		'resources/ext.wikilambda.edit/components/base/LocalizedLabel.vue',
		'resources/ext.wikilambda.edit/components/base/Pagination.vue',
		'resources/ext.wikilambda.edit/components/base/PublishDialog.vue',
		'resources/ext.wikilambda.edit/components/base/Select.vue',
		'resources/ext.wikilambda.edit/components/base/Table.vue',
		'resources/ext.wikilambda.edit/components/base/Text.vue',
		'resources/ext.wikilambda.edit/components/base/Tooltip.vue'
	],

	coverageThreshold: {
		global: {
			branches: 67,
			lines: 75,
			functions: 70,
			statements: 75
		},
		'./resources/ext.wikilambda.edit/': {
			branches: 67,
			lines: 75,
			functions: 70,
			statements: 75
		},
		'./resources/ext.wikilambda.edit/store': {
			branches: 63,
			lines: 75,
			functions: 81,
			statements: 76
		}
	},

	// The paths to modules that run some code to configure or set up the testing environment before each test
	setupFiles: [
		'./jest.setup.js'
	]
};
