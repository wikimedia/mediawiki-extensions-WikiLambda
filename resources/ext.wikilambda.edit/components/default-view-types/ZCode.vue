<template>
	<!--
		WikiLambda Vue component for Z16/Code objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-code">
		<!-- Programming language block -->
		<div class="ext-wikilambda-key-value">
			<div class="ext-wikilambda-key-value-main">
				<div class="ext-wikilambda-key-block">
					<label>{{ programmingLanguageLabel }}</label>
				</div>
				<div class="ext-wikilambda-value-block">
					<span
						v-if="!edit"
						class="ext-wikilambda-value-text"
					>{{ programmingLanguageValue }}</span>
					<wl-select
						v-else
						v-model:selected="programmingLanguageValue"
						class="ext-wikilambda-value-input ext-wikilambda-code__language-selector"
						:menu-items="programmingLanguageMenuItems"
						:default-label="$i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
						data-testid="language-dropdown"
					>
					</wl-select>
				</div>
			</div>
		</div>
		<!-- Code editor block -->
		<div class="ext-wikilambda-key-value">
			<div class="ext-wikilambda-key-value-main">
				<div class="ext-wikilambda-key-block">
					<label>{{ codeLabel }}</label>
				</div>
				<div class="ext-wikilambda-value-block">
					<code-editor
						class="ext-wikilambda-code__code-editor"
						:mode="programmingLanguageValue"
						:read-only="!edit"
						:value="editorValue"
						data-testid="code-editor"
						@change="updateCode"
					></code-editor>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	Select = require( '../base/Select.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-code',
	components: {
		'code-editor': CodeEditor,
		'wl-select': Select
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		parentId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			editorValue: '',
			allowSetEditorValue: true
		};
	},
	computed: $.extend(
		mapGetters( [
			'getAllProgrammingLangs',
			'getErrors',
			'getLabel',
			'getZCodeProgrammingLanguage',
			'getZCodeString',
			'getZFunctionArgumentDeclarations',
			'getZImplementationFunctionZid'
		] ),
		{
			/**
			 * Returns the label of the key Z16K2
			 *
			 * @return {string}
			 */
			codeLabel: function () {
				return this.getLabel( Constants.Z_CODE_CODE );
			},

			/**
			 * Terminal string with the code of the function
			 * implementation or undefined if not found
			 *
			 * @return {string | undefined}
			 */
			codeValue: function () {
				return this.getZCodeString( this.rowId );
			},

			/**
			 * Returns the label of the key Z16K1
			 *
			 * @return {string}
			 */
			programmingLanguageLabel: function () {
				return this.getLabel( Constants.Z_CODE_LANGUAGE );
			},

			/**
			 * Terminal string with the programming language in which
			 * the code is written or undefined if not found
			 *
			 * @return {string | undefined}
			 */
			programmingLanguageValue: {
				get: function () {
					return this.getZCodeProgrammingLanguage( this.rowId ) || '';
				},
				set: function ( val ) {
					if ( val !== this.programmingLanguageValue ) {
						this.selectLanguage( val );
					}
				}
			},

			/**
			 * Zid of the target function that this code will implement
			 *
			 * @return {string | undefined }
			 */
			functionZid: function () {
				return this.getZImplementationFunctionZid( this.parentId );
			},

			/**
			 * Returns an array of strings with the keys of the selected
			 * target function for the implementation (Z14K1)
			 *
			 * @return {Array}
			 */
			functionArgumentKeys: function () {
				return this.getZFunctionArgumentDeclarations( this.functionZid )
					.map( function ( arg ) {
						return arg[ Constants.Z_ARGUMENT_KEY ];
					} );
			},

			/**
			 * Returns the appropriately formatted menu items to load the wl-select
			 * component with the different programming language options
			 *
			 * @return {Array}
			 */
			programmingLanguageMenuItems: function () {
				var programmingLangs = [];
				if ( this.getAllProgrammingLangs.length > 0 ) {
					for ( var lang in this.getAllProgrammingLangs ) {
						programmingLangs.push(
							{
								label: this.getAllProgrammingLangs[
									lang
								][
									Constants.Z_PERSISTENTOBJECT_VALUE
								][
									Constants.Z_PROGRAMMING_LANGUAGE_CODE
								],
								value: this.getAllProgrammingLangs[
									lang
								][
									Constants.Z_PERSISTENTOBJECT_VALUE
								][
									Constants.Z_PROGRAMMING_LANGUAGE_CODE
								]
							}
						);
					}
				}
				return programmingLangs;
			},

			/**
			 * Returns whether the code object is in an error state
			 *
			 * @return {boolean}
			 */
			errorState: function () {
				// the error is not guaranteed to exist
				if ( this.getErrors[ this.rowId ] ) {
					return this.getErrors[ this.rowId ].state;
				}
				return false;
			},

			/**
			 * Returns the localized text that describes the error, if any,
			 * else returns an emoty string.
			 *
			 * @return {string}
			 */
			errorMessage: function () {
				if ( this.getErrors[ this.rowId ] && this.getErrors[ this.rowId ].state ) {
					const messageStr = this.getErrors[ this.rowId ].message;
					// TODO (T336873): These messages could be arbitrary and might not be defined.
					// eslint-disable-next-line mediawiki/msg-doc
					return this.$i18n( messageStr ).text();
				}
				return '';
			},

			/**
			 * Returns the string identifying the error type, if any,
			 * else returns undefined.
			 *
			 * @return {string | undefined}
			 */
			errorType: function () {
				return this.getErrors[ this.rowId ] ? this.getErrors[ this.rowId ].type : undefined;
			}
		}
	),
	methods: $.extend(
		mapActions( [
			'fetchZKeys',
			'fetchAllZProgrammingLanguages',
			'setError'
		] ),
		{
			/**
			 * Sets the value of the Code programming language key (Z16K1) and
			 * initializes the value of the of the Code content key (Z16K2)
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				this.allowSetEditorValue = true;

				// update selected language
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_PROGRAMMING_LANGUAGE_CODE,
						Constants.Z_STRING_VALUE
					],
					value
				} );

				// update boiler plate code
				let updatedBoilerPlateCode = '';
				switch ( value ) {
					case 'javascript':
						updatedBoilerPlateCode = 'function ' +
							this.functionZid + '( ' +
							this.functionArgumentKeys.join( ', ' ) + ' ) {\n\n}';
						break;
					case 'python':
						updatedBoilerPlateCode = 'def ' +
							this.functionZid + '(' +
							this.functionArgumentKeys.join( ', ' ) + '):\n\t';
						break;
					case 'lua':
						updatedBoilerPlateCode = 'function ' +
							this.functionZid + '(' +
							this.functionArgumentKeys.join( ', ' ) + ')\n\t\nend';
						break;
					default:
						break;
				}

				this.$emit( 'set-value', {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: updatedBoilerPlateCode
				} );
			},

			/**
			 * Updates the value of the Code content key (Z16K2)
			 *
			 * @param {string} code
			 */
			updateCode: function ( code ) {
				// there is an edge case where acejs will trigger an empty change that we process as an event object
				// we don't want to update our object with that bad data
				// TODO(T324605): this deserves a deeper investigation
				if ( typeof code !== 'object' ) {
					this.$emit( 'set-value', {
						keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
						value: code
					} );

					this.setError( {
						internalId: this.rowId,
						errorState: false
					} );
				}
			}
		} ),
	watch: {
		codeValue: {
			immediate: true,
			handler: function () {
				// Check allowSetEditorValue to ensure we only set value in the editor when its current value should be
				// overriden (e.g. when the editor is first loaded, or when the language changes). Ensuring this
				// prevents a bug that moves the cursor to the end of the editor on every keypress.
				if ( this.allowSetEditorValue ) {
					this.editorValue = this.codeValue || '';
					this.allowSetEditorValue = false;
				}
			}
		}
	},
	mounted: function () {
		this.fetchZKeys( { zids: [ Constants.Z_CODE ] } );
		if ( this.getAllProgrammingLangs.length <= 0 ) {
			this.fetchAllZProgrammingLanguages();
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-code {
	& > .ext-wikilambda-key-value {
		& > .ext-wikilambda-key-value-main {
			& > .ext-wikilambda-key-block {
				margin-bottom: 0;

				label {
					font-weight: bold;
					color: @color-base;
				}
			}

			& > .ext-wikilambda-value-block {
				margin-bottom: @spacing-25;

				.ext-wikilambda-value-input {
					margin-top: @spacing-25;
				}
			}
		}
	}
}
</style>
