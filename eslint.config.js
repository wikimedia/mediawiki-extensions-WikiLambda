'use strict';

const { defineConfig, globalIgnores } = require( 'eslint/config' );
const globals = require( 'globals' );
const wikimedia = require( 'eslint-config-wikimedia/flat' );

// Directories with their own config, which other configs don't apply to.
// These were directories with `"root": true` in .eslintrc.json.
const rootDirs = {
	resources: [ 'resources/**' ],
	tests: [ 'tests/**' ],
	selenium: [ 'tests/selenium/**' ]
};

module.exports = defineConfig( [
	globalIgnores( [
		'tests/jest/fixtures/',
		'vendor/',
		'coverage/',
		'function-schemata/',
		'docs/',
		'zobjectcache/',
		'abstractcache/',

		// Language files written automatically by TranslateWiki
		'**/i18n/**/*.json',
		'!**/i18n/**/en.json',
		'!**/i18n/**/qqq.json',

		// Content cache for CI
		'maintenance/initial-content/'
	] ),

	// Gruntfile.js, Jest setup, etc.
	{
		ignores: Object.values( rootDirs ).flat(),
		extends: [ wikimedia( 'server' ) ]
	},

	// Code which runs in MediaWiki
	{
		files: rootDirs.resources,
		extends: [ wikimedia( 'client', 'mediawiki', 'jquery' ) ],
		languageOptions: {
			globals: {
				exports: 'writable'
			}
		},
		rules: {
			'compat/compat': [
				'error',
				'last 2 chrome versions, last 2 firefox versions, last 2 opera versions, last 2 edge versions, safari >= 14, iOS >= 14'
			],
			'max-len': [
				'error',
				{
					code: 120,
					tabWidth: 4,
					ignorePattern: '^// eslint-.+',
					ignoreUrls: true,
					ignoreComments: false,
					ignoreRegExpLiterals: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true
				}
			],
			'es-x/no-promise-prototype-finally': 'off',
			'es-x/no-string-prototype-matchall': 'off',
			'jsdoc/require-param-type': 'error',
			'jsdoc/require-returns': 'error',
			'jsdoc/check-types': 'error',
			'jsdoc/no-undefined-types': [ 'warn', {
				definedTypes: [
					'LabelData',
					'Row'
				]
			} ],
			'mediawiki/no-storage': 'error'
		}
	},
	{
		// The vue plugin is only defined for .vue files
		files: [ 'resources/**/*.vue' ],
		rules: {
			'vue/attributes-order': 'error',
			'vue/component-definition-name-casing': [
				'error',
				'kebab-case'
			],
			'vue/no-v-html': 'error',
			'vue/no-undef-properties': 'off',
			'vue/require-explicit-emits': 'off',
			'vue/no-unsupported-features': [
				'error',
				{
					version: '^3.0.0',
					ignores: []
				}
			],
			'vue/no-undef-components': [
				'error',
				{
					ignorePatterns: [
						'wl-z-object-key-value'
					]
				}
			],
			'vue/no-v-model-argument': 'warn'
		}
	},
	{
		files: [ 'resources/ext.wikilambda.app/store/**' ],
		rules: {
			camelcase: [ 'error', { properties: 'never' } ]
		}
	},
	{
		files: [ 'resources/ext.wikilambda.visualeditor/**' ],
		languageOptions: {
			globals: {
				ve: 'readonly'
			}
		}
	},

	// Tests
	{
		files: rootDirs.tests,
		ignores: rootDirs.selenium,
		extends: [ wikimedia( 'server' ) ],
		rules: {
			camelcase: [ 'error', { properties: 'never' } ],
			'max-len': 'off',
			'no-undef': 'off'
		}
	},
	{
		files: [ 'tests/jest/**' ],
		languageOptions: {
			globals: {
				...globals.jest,
				global: 'writable'
			}
		}
	},
	{
		files: rootDirs.selenium,
		extends: [ wikimedia( 'selenium' ) ],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'module',
			globals: {
				mw: 'readonly'
			}
		},
		rules: {
			'wdio/no-pause': 'warn',
			'max-len': 'off',
			'jsdoc/no-undefined-types': [ 'warn', { definedTypes: [ 'WebdriverIO' ] } ]
		}
	}
] );
