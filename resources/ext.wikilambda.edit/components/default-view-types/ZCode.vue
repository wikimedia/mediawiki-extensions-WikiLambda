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
					<label
						:lang="programmingLanguageLabelData.langCode"
						:dir="programmingLanguageLabelData.langDir"
					>{{ programmingLanguageLabelData.label }}</label>
				</div>
				<div
					class="ext-wikilambda-value-block"
					data-testid="language-dropdown"
				>
					<span
						v-if="!edit"
						class="ext-wikilambda-value-text"
					>{{ programmingLanguageLiteral }}</span>
					<cdx-select
						v-else
						v-model:selected="programmingLanguageValue"
						class="ext-wikilambda-value-input ext-wikilambda-code__language-selector"
						:menu-items="programmingLanguageMenuItems"
						:default-label="$i18n( 'wikilambda-editor-label-select-programming-language-label' ).text()"
						:status="( programmingLanguageErrors.length > 0 ) ? 'error' : 'default'"
					>
					</cdx-select>
				</div>
				<cdx-message
					v-for="( error, index ) in programmingLanguageErrors"
					:key="'language-error-' + index"
					class="ext-wikilambda-key-value-inline-error"
					:type="error.type"
					:inline="true"
				>
					<!-- eslint-disable vue/no-v-html -->
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</div>
		</div>
		<!-- Code editor block -->
		<div class="ext-wikilambda-key-value">
			<div class="ext-wikilambda-key-value-main">
				<div class="ext-wikilambda-key-block">
					<label
						:lang="codeLabelData.langCode"
						:dir="codeLabelData.langDir"
					>{{ codeLabelData.label }}</label>
				</div>
				<div class="ext-wikilambda-value-block">
					<code-editor
						class="ext-wikilambda-code__code-editor"
						:mode="programmingLanguageLiteral"
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
					<!-- eslint-disable vue/no-v-html -->
					<div v-html="getErrorMessage( error )"></div>
				</cdx-message>
			</div>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	CodeEditor = require( '../base/CodeEditor.vue' ),
	CdxSelect = require( '@wikimedia/codex' ).CdxSelect,
	errorUtils = require( '../../mixins/errorUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = exports = defineComponent( {
	name: 'wl-z-code',
	components: {
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'code-editor': CodeEditor
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
	computed: Object.assign(
		mapGetters( [
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
			'getZImplementationFunctionZid'
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
				return this.codeValueRowId ? this.getErrors( this.codeValueRowId ) : [];
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
			 * Returns whether the programming language field has a literal/Z61 or a reference/Z9
			 *
			 * @return {string}
			 */
			programmingLanguageType: function () {
				return this.getZObjectTypeByRowId( this.programmingLanguageRowId );
			},

			/**
			 * Returns the Zid of the programming language selected, or undefined if unselected.
			 * When the programming language is a literal, finds the Zid in the Menu Items array by its literal.
			 *
			 * @return {string | undefined}
			 */
			programmingLanguageZid: function () {
				// TODO: remove options for literal programming language when the time comes
				let zId;
				if ( this.programmingLanguageType === Constants.Z_PROGRAMMING_LANGUAGE ) {
					const menuObject = this.programmingLanguageMenuItems
						.find( ( item ) => item.label === this.programmingLanguageLiteral );
					zId = menuObject ? menuObject.value : undefined;
				} else {
					zId = this.getZReferenceTerminalValue( this.programmingLanguageRowId );
				}
				return zId;
			},

			/**
			 * Returns the literal of the programming language selected, or empty string if unselected.
			 * When the programming language is a reference, finds the literal in the Menu Items array by
			 * its zid.
			 *
			 * @return {string}
			 */
			programmingLanguageLiteral: function () {
				let literal;
				if ( this.programmingLanguageType === Constants.Z_PROGRAMMING_LANGUAGE ) {
					const langObject = this.getRowByKeyPath( [
						Constants.Z_PROGRAMMING_LANGUAGE_CODE,
						Constants.Z_STRING_VALUE
					], this.programmingLanguageRowId );
					literal = langObject ? langObject.value : undefined;
				} else {
					const menuObject = this.programmingLanguageMenuItems
						.find( ( item ) => item.value === this.programmingLanguageValue );
					literal = menuObject ? menuObject.label : undefined;
				}
				return literal;
			},

			/**
			 * Zid of the selected programming language or empty string if not set
			 *
			 * @return {string}
			 */
			programmingLanguageValue: {
				get: function () {
					return this.programmingLanguageZid === undefined ? '' : this.programmingLanguageZid;
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
		mapActions( [
			'fetchZids',
			'fetchAllZProgrammingLanguages',
			'changeType',
			'clearErrors'
		] ),
		{
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

				if ( this.programmingLanguageType === Constants.Z_PROGRAMMING_LANGUAGE ) {
					this.changeType( {
						id: this.programmingLanguageRowId,
						type: Constants.Z_REFERENCE
					} );
				}

				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_REFERENCE_ID
					],
					value
				} );

				// update boiler plate code
				let updatedBoilerPlateCode = '';
				switch ( value ) {
					case Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT:
						updatedBoilerPlateCode = 'function ' +
							this.functionZid + '( ' +
							this.functionArgumentKeys.join( ', ' ) + ' ) {\n\n}';
						break;
					case Constants.Z_PROGRAMMING_LANGUAGES.PYTHON:
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
