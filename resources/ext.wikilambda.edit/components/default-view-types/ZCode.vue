<!--
	WikiLambda Vue component for Z16/Code objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-code">
		<!-- Programming language block -->
		<div class="ext-wikilambda-key-value">
			<div class="ext-wikilambda-key-value-main">
				<div class="ext-wikilambda-key-block">
					<label>{{ programmingLanguageLabel }}</label>
				</div>
				<div
					class="ext-wikilambda-value-block"
					data-testid="language-dropdown"
				>
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
						:status="( programmingLanguageErrors.length > 0 ) ? 'error' : 'default'"
					>
					</wl-select>
				</div>
				<cdx-message
					v-for="( error, index ) in programmingLanguageErrors"
					:key="'language-error-' + index"
					class="ext-wikilambda-key-value-inline-error"
					:type="error.type"
					:inline="true"
				>
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
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
				<cdx-message
					v-for="( error, index ) in codeErrors"
					:key="'code-error-' + index"
					class="ext-wikilambda-key-value-inline-error"
					:type="error.type"
					:inline="true"
				>
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</div>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	CodeEditor = require( '../base/CodeEditor.vue' ),
	Select = require( '../base/Select.vue' ),
	errorUtils = require( '../../mixins/errorUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-code',
	components: {
		'cdx-message': CdxMessage,
		'code-editor': CodeEditor,
		'wl-select': Select
	},
	mixins: [ errorUtils ],
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
			'getRowByKeyPath',
			'getZCodeProgrammingLanguage',
			'getZCodeString',
			'getInputsOfFunctionZid',
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
			 * Returns the rowId for the code value string
			 *
			 * @return {number | undefined}
			 */
			codeValueRowId: function () {
				const codeRow = this.getRowByKeyPath( [
					Constants.Z_CODE_CODE,
					Constants.Z_STRING_VALUE
				], this.rowId );
				return codeRow ? codeRow.id : undefined;
			},

			/**
			 * Returns code field errors
			 *
			 * @return {Array}
			 */
			codeErrors: function () {
				return this.codeValueRowId ? this.getErrors( this.codeValueRowId ) : [];
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
			 * Returns the rowId for the programming language string
			 *
			 * @return {number | undefined}
			 */
			programmingLanguageRowId: function () {
				const langRow = this.getRowByKeyPath( [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				], this.rowId );
				return langRow ? langRow.id : undefined;
			},

			/**
			 * Returns programming language errors
			 *
			 * @return {Array}
			 */
			programmingLanguageErrors: function () {
				return this.programmingLanguageRowId ? this.getErrors( this.programmingLanguageRowId ) : [];
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
				return this.getInputsOfFunctionZid( this.functionZid )
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
			'clearErrors'
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

				// clear errors for language field
				this.clearErrors( this.programmingLanguageRowId );

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
					this.clearErrors( this.codeValueRowId );
					this.$emit( 'set-value', {
						keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
						value: code
					} );
				}
			},

			/**
			 * Returns the translated message for a given error code.
			 * Error messages can have html tags.
			 *
			 * @param {Object} error
			 * @return {string}
			 */
			getErrorMessage: function ( error ) {
				// eslint-disable-next-line mediawiki/msg-doc
				return error.message || this.$i18n( error.code ).text();
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
				margin-bottom: @spacing-50;

				.ext-wikilambda-value-input {
					margin-top: @spacing-25;
				}
			}
		}
	}
}
</style>
