<!--
	WikiLambda Vue component for Z16/Code objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-code" data-testid="z-code">
		<!-- Programming language block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-code__language-selector-block">
			<template #key>
				<label
					:lang="programmingLanguageLabelData.langCode"
					:dir="programmingLanguageLabelData.langDir"
				>{{ programmingLanguageLabelData.label }}</label>
			</template>
			<template #value>
				<div
					data-testid="language-dropdown"
					class="ext-wikilambda-app-code__language-selector">
					<span v-if="!edit">
						{{ programmingLanguageLiteral }}
					</span>
					<cdx-select
						v-else
						:selected="programmingLanguageValue"
						:menu-items="programmingLanguageMenuItems"
						:default-label="$i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
						:status="( programmingLanguageErrors.length > 0 ) ? 'error' : 'default'"
						@update:selected="onProgrammingLanguageChange"
					></cdx-select>
				</div>
			</template>
			<template v-if="programmingLanguageErrors.length > 0" #footer>
				<cdx-message
					v-for="( error, index ) in programmingLanguageErrors"
					:key="'language-error-' + index"
					class="ext-wikilambda-app-code__inline-error"
					:type="error.type"
					:inline="true"
				>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</template>
		</wl-key-value-block>

		<!-- Code editor block -->
		<wl-key-value-block
			:key-bold="true"
			class="ext-wikilambda-app-code__code-editor-block">
			<template #key>
				<label
					:lang="codeLabelData.langCode"
					:dir="codeLabelData.langDir"
				>{{ codeLabelData.label }}</label>
			</template>
			<template #value>
				<code-editor
					class="ext-wikilambda-app-code__code-editor"
					:mode="programmingLanguageLiteral"
					:read-only="!edit"
					:disabled="!programmingLanguageValue"
					:value="editorValue"
					data-testid="code-editor"
					@change="updateCode"
					@click="checkCode"
				></code-editor>
			</template>
			<template v-if="codeErrors.length > 0" #footer>
				<cdx-message
					v-for="( error, index ) in codeErrors"
					:key="'code-error-' + index"
					class="ext-wikilambda-app-code__inline-error"
					:type="error.type"
					:inline="true"
				>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</template>
		</wl-key-value-block>
	</div>
</template>

<script>
const { CdxMessage, CdxSelect } = require( '../../../codex.js' );
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const CodeEditor = require( '../base/CodeEditor.vue' );
const errorUtils = require( '../../mixins/errorUtils.js' );
const KeyValueBlock = require( '../base/KeyValueBlock.vue' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-code',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'code-editor': CodeEditor,
		'wl-key-value-block': KeyValueBlock
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
			allowSetEditorValue: true,
			hasClickedDisabledField: false
		};
	},
	computed: Object.assign(
		mapState( useMainStore, [
			'getAllProgrammingLangs',
			'getConverterIdentity',
			'getErrors',
			'getLabelData',
			'getRowByKeyPath',
			'getZCodeProgrammingLanguageRow',
			'getZCodeString',
			'getZObjectTypeByRowId',
			'getZReferenceTerminalValue',
			'getInputsOfFunctionZid',
			'getZImplementationFunctionZid',
			'isCreateNewPage'
		] ),
		{
			/**
			 * Returns the label of the key Z16K2
			 *
			 * @return {LabelData}
			 */
			codeLabelData: function () {
				return this.getLabelData( Constants.Z_CODE_CODE );
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
				return this.codeValueRowId ?
					[ ...this.codeNotices, ...this.getErrors( this.codeValueRowId ) ] :
					this.codeNotices;
			},

			/**
			 * Returns code field notices
			 *
			 * @return {Array}
			 */
			codeNotices: function () {
				return ( this.parentType === Constants.Z_IMPLEMENTATION || !this.isCreateNewPage ) ? [] : [ {
					type: Constants.errorTypes.NOTICE,
					code: Constants.errorCodes.NEW_ZID_PLACEHOLDER_WARNING
				} ];
			},

			/**
			 * Returns the label of the key Z16K1
			 *
			 * @return {LabelData}
			 */
			programmingLanguageLabelData: function () {
				return this.getLabelData( Constants.Z_CODE_LANGUAGE );
			},

			/**
			 * Returns the programming language (Z16K1) row id
			 *
			 * @return {number}
			 */
			programmingLanguageRowId: function () {
				const programmingLangRow = this.getZCodeProgrammingLanguageRow( this.rowId );
				return programmingLangRow ? programmingLangRow.id : undefined;
			},

			/**
			 * Returns the Zid of the programming language selected, or undefined if unselected
			 *
			 * @return {string | undefined}
			 */
			programmingLanguageZid: function () {
				return this.getZReferenceTerminalValue( this.programmingLanguageRowId );
			},

			/**
			 * Returns the literal of the programming language selected in the Menu Items array by its zid,
			 * or empty string if unselected.
			 *
			 * @return {string}
			 */
			programmingLanguageLiteral: function () {
				const menuObject = this.programmingLanguageMenuItems
					.find( ( item ) => item.value === this.programmingLanguageValue );
				return menuObject ? menuObject.label : undefined;
			},

			/**
			 * Zid of the selected programming language or empty string if not set
			 *
			 * @return {string}
			 */
			programmingLanguageValue: {
				get: function () {
					return !this.programmingLanguageZid ? '' : this.programmingLanguageZid;
				},
				set: function ( val ) {
					if ( val !== this.programmingLanguageValue ) {
						this.selectLanguage( val );
					}
				}
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
			 * Type of the parent object. Most common types would be
			 * Implementation/Z14, Serialiser/Z64 or Deserialiser/Z46
			 *
			 * @return {string}
			 */
			parentType: function () {
				return this.getZObjectTypeByRowId( this.parentId );
			},

			/**
			 * If parent is Implementation/Z14:
			 * * Zid of the target function that this code will implement
			 * If parent is Serialiser/Z64 or Deserialiser/Z46:
			 * * Zid of the converter identity (or Z0):
			 *
			 * @return {string | undefined }
			 */
			functionZid: function () {
				return this.parentType === Constants.Z_IMPLEMENTATION ?
					this.getZImplementationFunctionZid( this.parentId ) :
					this.getConverterIdentity( this.parentId, this.parentType );
			},

			/**
			 * If parent is Implementation/Z14:
			 * * Returns an array of strings with the keys of the selected
			 *   target function for the implementation (Z14K1)
			 * * Zid of the target function that this code will implement
			 * If parent is Serialiser/Z64 or Deserialiser/Z46:
			 * * Return one key using the the converter identity (or Z0):
			 *
			 * @return {Array}
			 */
			functionArgumentKeys: function () {
				return this.parentType === Constants.Z_IMPLEMENTATION ?
					this.getInputsOfFunctionZid( this.functionZid )
						.map( ( arg ) => arg[ Constants.Z_ARGUMENT_KEY ] ) :
					[ `${ this.functionZid }K1` ];
			},

			/**
			 * Returns the appropriately formatted menu items to load the cdx-select
			 * component with the different programming language options
			 *
			 * @return {Array}
			 */
			programmingLanguageMenuItems: function () {
				const programmingLangs = [];
				if ( this.getAllProgrammingLangs.length > 0 ) {
					for ( const lang of this.getAllProgrammingLangs ) {
						programmingLangs.push(
							{
								label: lang[
									Constants.Z_PERSISTENTOBJECT_VALUE
								][
									Constants.Z_PROGRAMMING_LANGUAGE_CODE
								],
								value: lang[
									Constants.Z_PERSISTENTOBJECT_ID
								][
									Constants.Z_STRING_VALUE
								]
							}
						);
					}
				}
				return programmingLangs;
			}
		}
	),
	methods: Object.assign(
		mapActions( useMainStore, [
			'fetchZids',
			'fetchAllZProgrammingLanguages',
			'clearErrors',
			'setError'
		] ),
		{
			/**
			 * Generates boilerplate code based on the selected programming language.
			 *
			 * @param {string} language - The programming language selected.
			 * @return {string} The generated boilerplate code.
			 */
			generateBoilerplateCode( language ) {
				switch ( language ) {
					case Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT:
						return `function ${ this.functionZid }( ${ this.functionArgumentKeys.join( ', ' ) } ) {\n\n}`;
					case Constants.Z_PROGRAMMING_LANGUAGES.PYTHON:
						return `def ${ this.functionZid }(${ this.functionArgumentKeys.join( ', ' ) }):\n\t`;
					default:
						return '';
				}
			},

			/**
			 * Sets the value of the Code programming language key (Z16K1) and
			 * initializes the value of the Code content key (Z16K2)
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				this.allowSetEditorValue = true;

				// clear errors for language field
				this.clearErrors( this.programmingLanguageRowId );

				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_REFERENCE_ID
					],
					value
				} );

				this.$emit( 'set-value', {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: this.generateBoilerplateCode( value )
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
				// TODO (T324605): this deserves a deeper investigation
				if ( typeof code !== 'object' ) {
					this.clearErrors( this.codeValueRowId );
					this.$emit( 'set-value', {
						keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
						value: code
					} );
				}
			},

			/**
			 * Handles the change event of the programming language dropdown
			 *
			 * @param {string} newValue
			 */
			onProgrammingLanguageChange: function ( newValue ) {
				this.programmingLanguageValue = newValue;
				this.clearErrors( this.programmingLanguageRowId );
			},

			/**
			 * Checks if a programming language is set
			 */
			checkCode: function () {
				if ( !this.edit || this.programmingLanguageValue || this.hasClickedDisabledField ) {
					return;
				}
				const payload = {
					rowId: this.programmingLanguageRowId,
					errorType: Constants.errorTypes.WARNING,
					errorMessage: this.$i18n( 'wikilambda-editor-label-select-programming-language-empty' ).text()
				};
				this.hasClickedDisabledField = true;
				this.setError( payload );

			}
		} ),
	watch: {
		codeValue: {
			immediate: true,
			handler: function () {
				// Check allowSetEditorValue to ensure we only set value in the editor when its current value should be
				// overridden (e.g. when the editor is first loaded, or when the language changes). Ensuring this
				// prevents a bug that moves the cursor to the end of the editor on every keypress.
				if ( this.allowSetEditorValue ) {
					this.editorValue = this.codeValue || '';
					this.allowSetEditorValue = false;
				}
			}
		}
	},
	mounted: function () {
		this.fetchZids( { zids: [ Constants.Z_CODE ] } );
		if ( this.getAllProgrammingLangs.length <= 0 ) {
			this.fetchAllZProgrammingLanguages();
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-code {
	.ext-wikilambda-app-code__language-selector {
		margin-top: @spacing-25;
		margin-bottom: @spacing-50;
	}

	.ext-wikilambda-app-code__inline-error {
		margin-top: @spacing-25;
	}
}
</style>
